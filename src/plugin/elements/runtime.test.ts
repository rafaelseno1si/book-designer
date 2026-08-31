// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookProjectStore } from '../project-store';
import type { ElementArtifact } from '../../core/elements/types';
import { ElementRenderRuntime } from './runtime';
import { ElementCompiler } from './compiler';
import { ElementApprovals } from './approval';
import { BUILTIN_ELEMENT } from './library';

const assignment = { elementId: BUILTIN_ELEMENT.id, presetId: 'classic-rule', settingsOverrides: {} };
const artifact: ElementArtifact = {
	key: 'test',
	before: '<blockquote class="compiled"><div>',
	after: '</div></blockquote>',
	css: '.compiled{font-style:italic}',
};
function setup() {
	vi.useFakeTimers();
	const store = new BookProjectStore();
	const project = store.createProject('Manuscript', 'One');
	store.setRuntimeBook(project.id, {
		id: 'book',
		metadata: project.metadata,
		sections: [
			{
				id: 'chapter',
				title: 'Chapter',
				type: 'chapter',
				source: { vaultPath: 'Manuscript/chapter.md' },
				blocks: [
					{
						type: 'blockquote',
						blocks: [
							{ type: 'paragraph', inlines: [{ type: 'text', text: 'Readable quotation' }] },
						],
					},
				],
			},
		],
	});
	const requests: { resolve: (value: ElementArtifact) => void; reject: (error: Error) => void }[] = [];
	const compiler = new ElementCompiler(document.body.ownerDocument.createElement('div'), new ElementApprovals({}));
	const compile = vi
		.spyOn(compiler, 'compile')
		.mockImplementation(
			() => new Promise<ElementArtifact>((resolve, reject) => requests.push({ resolve, reject })),
		);
	const runtime = new ElementRenderRuntime(store, compiler, () => undefined);
	store.updateDesign({ elements: { blockquote: assignment } });
	return { store, runtime, compile, requests };
}
afterEach(() => vi.useRealTimers());
describe('asynchronous element preview coordinator', () => {
	it('debounces drafts, keeps valid same-project output, and rejects stale replies', async () => {
		const { store, runtime, requests, compile } = setup();
		await vi.advanceTimersByTimeAsync(120);
		requests[0]!.resolve(artifact);
		await Promise.resolve();
		expect(store.getSnapshot().runtime.renderedHtml).toContain('class="compiled"');
		store.setDesignPreview({
			...store.getSnapshot().activeProject!.design,
			elements: { blockquote: { ...assignment, settingsOverrides: { italic: false } } },
		});
		await vi.advanceTimersByTimeAsync(120);
		expect(store.getSnapshot().runtime.renderedHtml).toContain('class="compiled"');
		store.setDesignPreview(null);
		await vi.advanceTimersByTimeAsync(120);
		requests[2]!.resolve(artifact);
		await Promise.resolve();
		requests[1]!.resolve({ ...artifact, before: '<blockquote class="stale"><div>' });
		await Promise.resolve();
		expect(store.getSnapshot().runtime.renderedHtml).not.toContain('class="stale"');
		expect(compile).toHaveBeenCalledTimes(3);
		runtime.dispose();
	});
	it('does not publish results after switching projects or disposing', async () => {
		const { store, runtime, requests } = setup();
		await vi.advanceTimersByTimeAsync(120);
		store.createProject('Other', 'Two');
		requests[0]!.resolve(artifact);
		await Promise.resolve();
		expect(store.getSnapshot().runtime.renderedHtml).not.toContain('class="compiled"');
		runtime.dispose();
		store.updateDesign({ elements: { blockquote: assignment } });
		await vi.advanceTimersByTimeAsync(200);
		expect(requests).toHaveLength(1);
	});
	it('retains assignments and readable fallback after compiler failure', async () => {
		const { store, runtime, requests } = setup();
		await vi.advanceTimersByTimeAsync(120);
		requests[0]!.reject(new Error('Approval required'));
		await vi.advanceTimersByTimeAsync(0);
		expect(store.getSnapshot().runtime.elementDiagnostic).toBe('Approval required');
		expect(store.getSnapshot().runtime.renderedHtml).toContain(
			'<blockquote><p>Readable quotation</p></blockquote>',
		);
		expect(store.getSnapshot().activeProject!.design.elements!.blockquote).toEqual(assignment);
		runtime.dispose();
	});
});
