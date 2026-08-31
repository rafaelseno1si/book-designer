import { editorInfoField, Plugin, TFile } from 'obsidian';
import { ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { VaultManuscriptReader } from './core/sources/manuscript-source';
import { registerBookDesignerCommands } from './plugin/commands';
import {
	BOOK_DESIGNER_ICON,
	BOOK_DESIGNER_RIBBON_LABEL,
	BOOK_DESIGNER_VIEW_TYPE,
	BOOK_PREVIEW_ICON,
	BOOK_PREVIEW_RIBBON_LABEL,
	BOOK_PREVIEW_VIEW_TYPE,
} from './plugin/constants';
import { normalizeBookDesignerData, type BookDesignerPersistedData } from './plugin/data';
import { ActiveManuscriptRuntime } from './plugin/manuscript-runtime';
import { ProjectManagementService } from './plugin/project-management';
import { BookProjectStore } from './plugin/project-store';
import type { BookDesignerSettings } from './plugin/settings';
import { BookDesignerSettingsTab } from './views/BookDesignerSettingsTab';
import { BookDesignerView } from './views/BookDesignerView';
import { BookPreviewView } from './views/BookPreviewView';
import { ElementManagementService } from './plugin/elements/management';

export default class BookDesignerPlugin extends Plugin {
	settings!: BookDesignerSettings;
	projectStore!: BookProjectStore;
	private data!: BookDesignerPersistedData;
	private manuscriptRuntime!: ActiveManuscriptRuntime;
	private projectManagement!: ProjectManagementService;
	private elements!: ElementManagementService;
	private dataSaveQueue: Promise<void> = Promise.resolve();

	async onload() {
		await this.loadSettings();
		this.projectStore = new BookProjectStore(
			this.data.projects,
			this.settings.defaultPreviewDevice,
			(projects) => this.persistData({ projects }),
		);
		this.projectManagement = new ProjectManagementService(this.app, this.projectStore);
		this.elements = new ElementManagementService(this.app, this.projectStore);
		this.register(() => this.elements.dispose());
		this.manuscriptRuntime = new ActiveManuscriptRuntime(new ObsidianVaultReader(this), this.projectStore);
		this.register(this.projectStore.subscribe(() => this.manuscriptRuntime.handleStoreChange()));
		this.register(() => this.manuscriptRuntime.dispose());
		this.manuscriptRuntime.handleStoreChange();
		this.registerEvent(this.app.vault.on('modify', (file) => this.manuscriptRuntime.handleVaultChange(file.path)));
		this.registerEvent(this.app.vault.on('create', (file) => this.manuscriptRuntime.handleVaultChange(file.path)));
		this.registerEvent(this.app.vault.on('delete', (file) => this.manuscriptRuntime.handleVaultChange(file.path)));
		this.registerEvent(this.app.vault.on('rename', (file, oldPath) => this.manuscriptRuntime.handleVaultChange(file.path, oldPath)));
		this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
			if (info.file) this.manuscriptRuntime.handleEditorChange(info.file.path, editor.getValue());
		}));
		this.registerLiveEditorSynchronization();

		this.registerView(
			BOOK_DESIGNER_VIEW_TYPE,
			(leaf) =>
				new BookDesignerView(leaf, this.projectStore, this.projectManagement, () => { void this.activatePreviewView(); }, this.elements),
		);
		this.registerView(
			BOOK_PREVIEW_VIEW_TYPE,
			(leaf) =>
				new BookPreviewView(leaf, this.projectStore),
		);

		registerBookDesignerCommands(this);

		this.addRibbonIcon(BOOK_DESIGNER_ICON, BOOK_DESIGNER_RIBBON_LABEL, () => {
			void this.activateDesignerView();
		});
		this.addRibbonIcon(BOOK_PREVIEW_ICON, BOOK_PREVIEW_RIBBON_LABEL, () => {
			void this.activatePreviewView();
		});

		this.addSettingTab(new BookDesignerSettingsTab(this.app, this));
	}

	async activateDesignerView() {
		await this.activateView(BOOK_DESIGNER_VIEW_TYPE);
	}

	async activatePreviewView() {
		await this.activateView(BOOK_PREVIEW_VIEW_TYPE);
	}

	private async activateView(viewType: string) {
		const existingLeaf = this.app.workspace.getLeavesOfType(viewType)[0];

		if (existingLeaf) {
			await this.app.workspace.revealLeaf(existingLeaf);
			return;
		}

		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({
			type: viewType,
			active: true,
		});
		await this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.data = normalizeBookDesignerData(await this.loadData());
		this.settings = this.data.settings;
	}

	async saveSettings(nextSettings: BookDesignerSettings = this.settings) {
		await this.persistData({ settings: nextSettings });
		this.settings = nextSettings;
	}
	private persistData(update: Partial<BookDesignerPersistedData>): Promise<void> {
		const save = this.dataSaveQueue.catch(() => undefined).then(async () => {
			const candidate = { ...this.data, ...update };
			await this.saveData(candidate);
			this.data = candidate;
		});
		this.dataSaveQueue = save;
		return save;
	}

	private registerLiveEditorSynchronization() {
		const manuscriptRuntime = this.manuscriptRuntime;
		this.registerEditorExtension(
			ViewPlugin.fromClass(
				class {
					update(update: ViewUpdate) {
						if (!update.docChanged) return;
						const info = update.state.field(editorInfoField, false);
						if (info?.file) {
							manuscriptRuntime.handleEditorChange(
								info.file.path,
								update.state.doc.toString(),
							);
						}
					}
				},
			),
		);
	}
}

class ObsidianVaultReader implements VaultManuscriptReader {
	constructor(private readonly plugin: BookDesignerPlugin) {}
	async listMarkdownFiles(): Promise<string[]> { return this.plugin.app.vault.getMarkdownFiles().map((file) => file.path); }
	async readMarkdownFile(vaultPath: string): Promise<string> {
		const file = this.plugin.app.vault.getAbstractFileByPath(vaultPath);
		if (!(file instanceof TFile)) throw new Error(`Markdown note no longer exists: ${vaultPath}`);
		return this.plugin.app.vault.cachedRead(file);
	}
}
