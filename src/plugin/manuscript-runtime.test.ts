import { describe, expect, it, vi } from 'vitest';
import { ActiveManuscriptRuntime } from './manuscript-runtime';
import { BookProjectStore, emptyProjectRegistry } from './project-store';

describe('ActiveManuscriptRuntime', () => {
	it('debounces relevant active-folder file changes and ignores unrelated paths', async () => {
		const timer = { callback: null as (() => void) | null };
		const reader = { listMarkdownFiles: vi.fn(async () => ['Novel/01.md']), readMarkdownFile: vi.fn(async () => '# One') };
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
		store.createProject('Novel', 'Novel');
		const runtime = new ActiveManuscriptRuntime(reader, store, 250, {
			setTimeout: (callback) => { timer.callback = callback; return 1; },
			clearTimeout: () => { timer.callback = null; },
		});
		runtime.handleStoreChange();
		await vi.waitFor(() => expect(reader.listMarkdownFiles).toHaveBeenCalledTimes(1));
		expect(reader.listMarkdownFiles).toHaveBeenCalledTimes(1);
		runtime.handleVaultChange('Elsewhere/01.md');
		runtime.handleVaultChange('Novel/01.md');
		runtime.handleVaultChange('Novel/02.md');
		runtime.handleVaultChange('Elsewhere/moved.md', 'Novel/03.md');
		const scheduled = timer.callback;
		if (scheduled) scheduled();
		await vi.waitFor(() => expect(reader.listMarkdownFiles).toHaveBeenCalledTimes(2));
		expect(reader.listMarkdownFiles).toHaveBeenCalledTimes(2);
		await vi.waitFor(() => expect(store.getSnapshot().runtime.status).toBe('ready'));
		runtime.dispose();
	});

	it('discards a slow load after the active project changes', async () => {
		let resolveFirstLoad: ((paths: string[]) => void) | undefined;
		const firstLoad = new Promise<string[]>((resolve) => { resolveFirstLoad = resolve; });
		const reader = { listMarkdownFiles: vi.fn().mockReturnValueOnce(firstLoad).mockResolvedValueOnce(['Second/01.md']), readMarkdownFile: vi.fn(async () => '# Chapter') };
		const ids = ['first', 'second'];
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => ids.shift() ?? 'unexpected');
		const runtime = new ActiveManuscriptRuntime(reader, store);
		store.createProject('First', 'First');
		runtime.handleStoreChange();
		store.createProject('Second', 'Second');
		runtime.handleStoreChange();
		await vi.waitFor(() => expect(reader.listMarkdownFiles).toHaveBeenCalledTimes(2));
		resolveFirstLoad?.(['First/01.md']);
		await vi.waitFor(() => expect(store.getSnapshot().runtime.status).toBe('ready'));
		expect(store.getSnapshot().activeProject?.id).toBe('second');
		expect(store.getSnapshot().runtime.book?.sections[0]?.source.vaultPath).toBe('Second/01.md');
	});
});
