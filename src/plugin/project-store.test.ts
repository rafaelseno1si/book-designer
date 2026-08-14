import { describe, expect, it, vi } from 'vitest';
import { BookProjectStore, emptyProjectRegistry, normalizeProjectRegistry, renderPreviewState } from './project-store';

describe('BookProjectStore', () => {
	it('keeps the external-store snapshot stable until state changes', () => {
		const store = new BookProjectStore();
		const initialSnapshot = store.getSnapshot();
		expect(store.getSnapshot()).toBe(initialSnapshot);

		store.createProject('Books/Novel', 'Novel');
		expect(store.getSnapshot()).not.toBe(initialSnapshot);
		expect(store.getSnapshot()).toBe(store.getSnapshot());
	});

	it('defaults e-reader projects to paged portrait preview and migrates older preview state', () => {
		const registry = normalizeProjectRegistry({
			projects: [{
				id: 'project-a', name: 'Novel', source: { type: 'folder', path: 'Books/Novel' },
				metadata: {}, design: {}, preview: { deviceId: 'ereader-6' },
			}],
			activeProjectId: 'project-a',
		}, 'phone');

		expect(registry.projects[0]?.preview).toMatchObject({ mode: 'paged', orientation: 'portrait', pageIndex: 0 });
	});

	it('persists only project configuration and preserves per-project settings when switching', async () => {
		const persist = vi.fn(async (_registry: unknown) => undefined);
		const ids = ['project-a', 'project-b'];
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', persist, () => ids.shift() ?? 'unexpected');
		store.createProject('Books/Novel', 'Novel');
		store.updateMetadata({ author: 'Author A' });
		store.updateDesign({ themeId: 'modern' });
		store.updatePreview({ readerScale: 120, scrollTop: 48, activeSectionId: 'chapter-a' });
		store.createProject('Books/Novel', 'Novel');
		store.updateMetadata({ author: 'Author B' });
		store.updatePreview({ readerScale: 85 });
		store.selectProject('project-a');

		const snapshot = store.getSnapshot();
		expect(snapshot.activeProject).toMatchObject({ id: 'project-a', name: 'Novel', metadata: { author: 'Author A' }, design: { themeId: 'modern' }, preview: { readerScale: 120, scrollTop: 48, activeSectionId: 'chapter-a' } });
		expect(snapshot.registry.projects[1]).toMatchObject({ id: 'project-b', name: 'Novel 2', metadata: { author: 'Author B' }, preview: { readerScale: 85 } });
		await Promise.resolve();
		const saved = persist.mock.calls[persist.mock.calls.length - 1]?.[0];
		expect(saved).toEqual(snapshot.registry);
		expect(JSON.stringify(saved)).not.toContain('renderedHtml');
		expect(JSON.stringify(saved)).not.toContain('runtime');
	});

	it('updates preview rendering from shared active-project state without reloading source', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
		store.createProject('Books/Novel', 'Novel');
		store.updateMetadata({ author: 'Author' });
		store.setRuntimeBook('project-a', { id: 'project-a', metadata: { title: 'Novel', author: 'Author', language: 'english', publisher: '', isbn: '' }, sections: [] });
		store.updateDesign({ themeId: 'minimal' });
		expect(renderPreviewState(store.getSnapshot())).toMatchObject({ title: 'Novel', author: 'Author', themeLabel: 'Minimal' });
	});

	it('keeps a rendered preview available while a background source reload runs', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
		store.createProject('Books/Novel', 'Novel');
		store.setRuntimeBook('project-a', { id: 'project-a', metadata: { title: 'Novel', author: '', language: 'english', publisher: '', isbn: '' }, sections: [{ id: 'chapter-1', type: 'chapter', title: 'Chapter', source: { vaultPath: 'Books/Novel/01.md' }, blocks: [] }] });
		const renderedHtml = store.getSnapshot().runtime.renderedHtml;

		store.setRuntimeLoading('project-a');

		expect(store.getSnapshot().runtime).toMatchObject({ status: 'ready', renderedHtml });
	});
});
