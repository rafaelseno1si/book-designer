import { App, Modal, TFolder } from 'obsidian';

/**
 * Uses an explicit form submission instead of a suggest-modal callback so a
 * selected folder always has one direct path to project creation.
 */
export function pickVaultFolder(app: App): Promise<TFolder | null> {
	return new Promise((resolve) => new FolderPickerModal(app, resolve).open());
}

class FolderPickerModal extends Modal {
	private chosen = false;
	private selectedFolder: TFolder | null = null;

	constructor(
		private readonly pluginApp: App,
		private readonly resolve: (folder: TFolder | null) => void,
	) {
		super(pluginApp);
	}

	onOpen(): void {
		const folders = this.pluginApp.vault.getAllFolders(true);
		this.selectedFolder = folders[0] ?? null;
		this.titleEl.setText('Create book project');

		const form = this.contentEl.createEl('form', {
			cls: 'book-designer-folder-picker',
		});
		form.createEl('p', {
			text: 'Select the vault folder containing your manuscript notes.',
		});
		const selectEl = form.createEl('select', {
			attr: { 'aria-label': 'Manuscript folder' },
		});
		for (const folder of folders) {
			selectEl.createEl('option', {
				value: folder.path,
				text: folder.path || this.pluginApp.vault.getName(),
			});
		}
		selectEl.addEventListener('change', () => {
			this.selectedFolder = folders.find((folder) => folder.path === selectEl.value) ?? null;
		});

		const actions = form.createDiv({ cls: 'modal-button-container' });
		const cancelButton = actions.createEl('button', { text: 'Cancel', type: 'button' });
		cancelButton.addEventListener('click', () => this.close());
		const createButton = actions.createEl('button', {
			text: 'Create project',
			type: 'submit',
			cls: 'mod-cta',
		});
		createButton.disabled = this.selectedFolder === null;
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			if (!this.selectedFolder) return;
			this.chosen = true;
			this.resolve(this.selectedFolder);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.chosen) this.resolve(null);
	}
}
