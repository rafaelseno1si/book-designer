import { createRoot } from 'react-dom/client';
import { BookDesignerApp } from '../../src/components/BookDesignerApp';
import { BookProjectStore, emptyProjectRegistry } from '../../src/plugin/project-store';
import { ElementManagementService } from '../../src/plugin/elements/management';
import { BUILTIN_ELEMENT } from '../../src/plugin/elements/library';
import { BLOCKQUOTE_SAMPLE } from '../../src/components/elements/ElementServices';
import { TFile } from './obsidian-stub';
import { resolveElementSettings } from '../../src/core/elements/settings';
import { BookPreviewApp } from '../../src/components/BookPreviewApp';

const store = new BookProjectStore(emptyProjectRegistry());
let source = BUILTIN_ELEMENT.package.files['index.html']
	.replace('book-designer.basic-blockquote', 'example.imported')
	.replace('"name": "Basic blockquote"', '"name": "Imported quotation"');
const approvals = new Map();
const app = {
	vault: {
		getFiles: () => [new TFile('Elements/quotation.html', source)],
		read: (file: TFile) => Promise.resolve(file.text),
		getName: () => 'Test vault',
	},
	loadLocalStorage: (key: string) => approvals.get(key),
	saveLocalStorage: (key: string, value: unknown) => approvals.set(key, value),
};
const service = new ElementManagementService(app as never, store);
const root = createRoot(document.getElementById('app')!);
let previewRoot: ReturnType<typeof createRoot> | null = null;
document.getElementById('app')!.className = 'book-designer-view-host book-designer-react-root';
root.render(
	<BookDesignerApp
		projectStore={store}
		elements={service}
		onOpenPreview={() => undefined}
		projectActions={{
			createProject: async () => {},
			saveProjectAs: async () => {},
			importProject: async () => {},
			exportProject: async () => {},
			renameProject: async () => {},
			deleteProject: async () => {},
		}}
	/>,
);
Object.assign(window, {
	uiHarness: {
		store,
		service,
		createProject() {
			const project = store.createProject('Manuscript', 'Example book');
			store.setRuntimeBook(project.id, { ...BLOCKQUOTE_SAMPLE, id: project.id });
		},
		setSource(next: string) {
			source = next;
		},
		getSource: () => source,
		effectiveSettings() {
			return store.getSnapshot().registry.projects.map((project) => {
				const assignment = project.design.elements!.blockquote!;
				const entry = service.entries().find((entry) => entry.id === assignment.elementId)!;
				return resolveElementSettings(service.compiler.inspect(entry).manifest, assignment);
			});
		},
		openPreview() {
			root.unmount();
			previewRoot = createRoot(document.getElementById('app')!);
			previewRoot.render(<BookPreviewApp projectStore={store} />);
		},
		dispose() {
			if (previewRoot) previewRoot.unmount();
			else root.unmount();
			service.dispose();
		},
	},
});
