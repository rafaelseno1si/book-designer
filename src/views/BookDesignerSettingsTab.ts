import { App, PluginSettingTab, Setting } from 'obsidian';
import type BookDesignerPlugin from '../main';
import {
	PREVIEW_DEVICE_IDS,
	PREVIEW_DEVICE_LABELS,
	isPreviewDeviceId,
} from '../plugin/settings';

export class BookDesignerSettingsTab extends PluginSettingTab {
	private readonly plugin: BookDesignerPlugin;

	constructor(app: App, plugin: BookDesignerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): unknown[] {
		return [];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Preview defaults').setHeading();

		new Setting(containerEl)
			.setName('Default preview device')
			.setDesc('Choose the device simulation used when a new preview opens.')
			.addDropdown((dropdown) => {
				for (const deviceId of PREVIEW_DEVICE_IDS) {
					dropdown.addOption(deviceId, PREVIEW_DEVICE_LABELS[deviceId]);
				}

				dropdown
					.setValue(this.plugin.settings.defaultPreviewDevice)
					.onChange(async (value) => {
						if (!isPreviewDeviceId(value)) {
							return;
						}

						await this.plugin.saveSettings({
							...this.plugin.settings,
							defaultPreviewDevice: value,
						});
					});
			});

		new Setting(containerEl)
			.setName('Automatically refresh preview')
			.setDesc('Refresh the preview after manuscript changes when loading exists.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoRefreshPreview)
					.onChange(async (value) => {
						await this.plugin.saveSettings({
							...this.plugin.settings,
							autoRefreshPreview: value,
						});
					}),
			);

		new Setting(containerEl)
			.setName('Debug logging')
			.setDesc('Write optional diagnostics to the developer console.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.debugLogging)
					.onChange(async (value) => {
						await this.plugin.saveSettings({
							...this.plugin.settings,
							debugLogging: value,
						});
					}),
			);
	}
}
