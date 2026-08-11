import { Plugin } from 'obsidian';
import { registerBookDesignerCommands } from './plugin/commands';
import { BOOK_DESIGNER_ICON, BOOK_DESIGNER_VIEW_TYPE } from './plugin/constants';
import {
	BookDesignerSettings,
	normalizeBookDesignerSettings,
} from './plugin/settings';
import { BookDesignerSettingsTab } from './views/BookDesignerSettingsTab';
import { BookDesignerView } from './views/BookDesignerView';

export default class BookDesignerPlugin extends Plugin {
	settings!: BookDesignerSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			BOOK_DESIGNER_VIEW_TYPE,
			(leaf) => new BookDesignerView(leaf, () => this.settings),
		);

		registerBookDesignerCommands(this);

		this.addRibbonIcon(BOOK_DESIGNER_ICON, 'Open book designer', () => {
			void this.activateView();
		});

		this.addSettingTab(new BookDesignerSettingsTab(this.app, this));
	}

	async activateView() {
		const existingLeaf =
			this.app.workspace.getLeavesOfType(BOOK_DESIGNER_VIEW_TYPE)[0];

		if (existingLeaf) {
			await this.app.workspace.revealLeaf(existingLeaf);
			return;
		}

		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({
			type: BOOK_DESIGNER_VIEW_TYPE,
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
