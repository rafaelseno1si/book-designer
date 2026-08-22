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

		expect(registry.projects[0]?.preview).toMatchObject({ mode: 'paged', orientation: 'portrait', pageIndex: 0, deviceScale: 100, autoDeviceScale: true, customDeviceWidth: 390, customDeviceHeight: 844, mockupId: 'plain' });
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

	it('keeps imported mockups in a shared library and clears deleted selections', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
		store.createProject('Books/Novel', 'Novel');
		store.addImportedMockup({ id: 'phone-frame', name: 'Phone frame', html: '<html><div data-book-designer-screen></div></html>', width: 390, height: 844, postures: [], color: { mode: 'none', hardware: 'fixed' } });
		store.updatePreview({ deviceId: 'imported', importedMockupId: 'phone-frame' });
		store.replaceImportedMockup('phone-frame', { id: 'different-id', name: 'Updated frame', html: '<html><div data-book-designer-screen></div></html>', width: 400, height: 800, postures: [], color: { mode: 'tonal-ramp', hardware: 'dynamic' } });

		expect(store.getSnapshot().registry.mockups).toEqual([expect.objectContaining({ id: 'phone-frame', name: 'Updated frame', width: 400 })]);

		store.deleteImportedMockup('phone-frame');
		expect(store.getSnapshot().activeProject?.preview).toMatchObject({ deviceId: 'phone', importedMockupId: null });
		expect(store.getSnapshot().registry.mockups).toEqual([]);
	});

	it('migrates a legacy project-local imported mockup into the device library', () => {
		const registry = normalizeProjectRegistry({
			projects: [{
				id: 'project-a', name: 'Novel', source: { type: 'folder', path: 'Books/Novel' }, metadata: {}, design: {},
				preview: { deviceId: 'imported', importedMockup: { id: 'legacy-frame', name: 'Legacy frame', html: '<html><div data-book-designer-screen></div></html>', width: 390, height: 844 } },
			}], activeProjectId: 'project-a',
		}, 'phone');

		expect(registry.mockups).toEqual([expect.objectContaining({ id: 'legacy-frame' })]);
		expect(registry.mockups[0]?.color).toEqual({ mode: 'none', hardware: 'fixed' });
		expect(registry.projects[0]?.preview).toMatchObject({ deviceId: 'imported', importedMockupId: 'legacy-frame' });
	});

	it('restores independent content settings for each preview device', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
		store.createProject('Books/Novel', 'Novel');
		store.updatePreview({ readerScale: 130, contentWidth: 84, contentHeight: 72, frameColor: '#123456' });
		store.updatePreview({ deviceId: 'ereader-6', mockupId: 'plain' });
		expect(store.getSnapshot().activeProject?.preview).toMatchObject({ deviceId: 'ereader-6', readerScale: 100, contentWidth: 100, contentHeight: 100, frameColor: '#2a2a2a' });
		store.updatePreview({ readerScale: 115, contentWidth: 92, contentHeight: 88, frameColor: '#654321' });
		store.updatePreview({ deviceId: 'phone', mockupId: 'plain' });
		expect(store.getSnapshot().activeProject?.preview).toMatchObject({ deviceId: 'phone', readerScale: 130, contentWidth: 84, contentHeight: 72, frameColor: '#123456' });
		store.updatePreview({ deviceId: 'ereader-6', mockupId: 'plain' });
		expect(store.getSnapshot().activeProject?.preview).toMatchObject({ deviceId: 'ereader-6', readerScale: 115, contentWidth: 92, contentHeight: 88, frameColor: '#654321' });
	});

	it('uses the built-in Razr material color for a new Razr preview', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'motorola-razr', async () => undefined, () => 'project-a');
		store.createProject('Books/Novel', 'Novel');

		expect(store.getSnapshot().activeProject?.preview).toMatchObject({ deviceId: 'motorola-razr', frameColor: '#686d73' });
	});

	it('persists an imported mockup posture separately from the shared mockup library', () => {
		const store = new BookProjectStore(emptyProjectRegistry(), 'phone', async () => undefined, () => 'project-a');
		store.createProject('Books/Novel', 'Novel');
		store.addImportedMockup({ id: 'razr', name: 'Razr', html: '<html><div data-book-designer-screen></div></html>', width: 820, height: 1798, postures: [{ id: 'unfold', label: 'Unfolded', frame: { left: 0, top: 0, width: 820, height: 1200 } }, { id: 'fold1', label: 'Folded closed', frame: { left: 180, top: 300, width: 460, height: 900 } }], color: { mode: 'tonal-ramp', hardware: 'fixed' } });
		store.updatePreview({ deviceId: 'imported', importedMockupId: 'razr', mockupPostures: { razr: 'fold1' } });

		expect(store.getSnapshot().activeProject?.preview.mockupPostures).toEqual({ razr: 'fold1' });
		expect(store.getSnapshot().registry.mockups[0]?.postures).toEqual([{ id: 'unfold', label: 'Unfolded', frame: { left: 0, top: 0, width: 820, height: 1200 } }, { id: 'fold1', label: 'Folded closed', frame: { left: 180, top: 300, width: 460, height: 900 } }]);
	});
});
