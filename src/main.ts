import { Plugin } from 'obsidian';
import { registerBookDesignerCommands } from './plugin/commands';
import {
	BOOK_DESIGNER_ICON,
	BOOK_DESIGNER_RIBBON_LABEL,
	BOOK_DESIGNER_VIEW_TYPE,
	BOOK_PREVIEW_ICON,
	BOOK_PREVIEW_RIBBON_LABEL,
	BOOK_PREVIEW_VIEW_TYPE,
} from './plugin/constants';
import { BookProjectStore } from './plugin/project-store';
import {
	BookDesignerSettings,
	normalizeBookDesignerSettings,
} from './plugin/settings';
import { BookDesignerSettingsTab } from './views/BookDesignerSettingsTab';
import { BookDesignerView } from './views/BookDesignerView';
import { BookPreviewView } from './views/BookPreviewView';

export default class BookDesignerPlugin extends Plugin {
	settings!: BookDesignerSettings;
	readonly projectStore = new BookProjectStore();

	async onload() {
		await this.loadSettings();

		this.registerView(
			BOOK_DESIGNER_VIEW_TYPE,
			(leaf) =>
				new BookDesignerView(leaf, this.projectStore, () => {
					void this.activatePreviewView();
				}),
		);
		this.registerView(
			BOOK_PREVIEW_VIEW_TYPE,
			(leaf) =>
				new BookPreviewView(
					leaf,
					this.projectStore,
					() => this.settings,
				),
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
		this.settings = normalizeBookDesignerSettings(await this.loadData());
	}

	async saveSettings(nextSettings: BookDesignerSettings = this.settings) {
		this.settings = normalizeBookDesignerSettings(nextSettings);
		await this.saveData(this.settings);
	}
}
