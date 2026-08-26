import { App, FuzzySuggestModal, Modal, TFile } from 'obsidian';
import { BOOK_DESIGNER_PROJECT_FILE_EXTENSION } from '../plugin/project-file';
import type { ProjectImportCollisionStrategy } from '../plugin/project-store';

export function pickProjectFile(app: App): Promise<TFile | null> {
	return new Promise((resolve) => new ProjectFilePickerModal(app, resolve).open());
}

export function promptForText(
	app: App,
	title: string,
	label: string,
	initialValue: string,
	submitLabel: string,
): Promise<string | null> {
	return new Promise((resolve) => new TextPromptModal(app, title, label, initialValue, submitLabel, resolve).open());
}

export function confirmProjectAction(
	app: App,
	title: string,
	message: string,
	confirmLabel: string,
	dangerous = false,
): Promise<boolean> {
	return new Promise((resolve) => new ConfirmationModal(app, title, message, confirmLabel, dangerous, resolve).open());
}

export function chooseProjectCollision(app: App, projectName: string): Promise<ProjectImportCollisionStrategy | 'cancel'> {
	return new Promise((resolve) => new ProjectCollisionModal(app, projectName, resolve).open());
}

class ProjectFilePickerModal extends FuzzySuggestModal<TFile> {
	private chosen = false;

	constructor(
		app: App,
		private readonly resolve: (file: TFile | null) => void,
	) {
		super(app);
		this.setPlaceholder('Choose a .book-designer.json file');
	}

	onOpen(): void {
		void super.onOpen();
		this.titleEl.setText('Open book designer project');
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((file) => file.path.toLocaleLowerCase().endsWith(BOOK_DESIGNER_PROJECT_FILE_EXTENSION));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.chosen = true;
		this.resolve(file);
	}

	onClose(): void {
		super.onClose();
		if (!this.chosen) this.resolve(null);
	}
}

class TextPromptModal extends Modal {
	private submitted = false;

	constructor(
		app: App,
		private readonly modalTitle: string,
		private readonly label: string,
		private readonly initialValue: string,
		private readonly submitLabel: string,
		private readonly resolve: (value: string | null) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.modalTitle);
		const form = this.contentEl.createEl('form', { cls: 'book-designer-prompt-form' });
		const field = form.createEl('label');
		field.createSpan({ text: this.label });
		const input = field.createEl('input', { type: 'text', value: this.initialValue });
		input.required = true;
		const error = form.createEl('p', { cls: 'book-designer-prompt-error' });
		error.setAttr('role', 'alert');
		const actions = form.createDiv({ cls: 'modal-button-container' });
		const cancelButton = actions.createEl('button', { text: 'Cancel', type: 'button' });
		cancelButton.addEventListener('click', () => this.close());
		actions.createEl('button', { text: this.submitLabel, type: 'submit', cls: 'mod-cta' });
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const value = input.value.trim();
			if (!value) {
				error.setText(`${this.label} cannot be blank.`);
				input.focus();
				return;
			}
			this.submitted = true;
			this.resolve(value);
			this.close();
		});
		window.setTimeout(() => {
			input.focus();
			input.select();
		}, 0);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.submitted) this.resolve(null);
	}
}

class ConfirmationModal extends Modal {
	private answered = false;

	constructor(
		app: App,
		private readonly modalTitle: string,
		private readonly message: string,
		private readonly confirmLabel: string,
		private readonly dangerous: boolean,
		private readonly resolve: (confirmed: boolean) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.modalTitle);
		this.contentEl.createEl('p', { text: this.message });
		const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
		const cancelButton = actions.createEl('button', { text: 'Cancel', type: 'button' });
		cancelButton.addEventListener('click', () => this.close());
		const confirmButton = actions.createEl('button', {
			text: this.confirmLabel,
			type: 'button',
			cls: this.dangerous ? 'mod-warning' : 'mod-cta',
		});
		confirmButton.addEventListener('click', () => {
			this.answered = true;
			this.resolve(true);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.answered) this.resolve(false);
	}
}

class ProjectCollisionModal extends Modal {
	private answered = false;

	constructor(
		app: App,
		private readonly projectName: string,
		private readonly resolve: (choice: ProjectImportCollisionStrategy | 'cancel') => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText('Project already exists');
		this.contentEl.createEl('p', { text: `A project with the same ID as “${this.projectName}” already exists. Choose how to continue.` });
		const actions = this.contentEl.createDiv({ cls: 'book-designer-collision-actions' });
		this.addChoice(actions, 'Import as copy', 'copy', 'Keep both projects with a new stable ID.');
		this.addChoice(actions, 'Replace project', 'replace', 'Replace only the existing project configuration. Manuscript notes are untouched.');
		this.addChoice(actions, 'Cancel', 'cancel', 'Leave existing projects unchanged.');
	}

	private addChoice(parent: HTMLElement, label: string, choice: ProjectImportCollisionStrategy | 'cancel', description: string): void {
		const button = parent.createEl('button', { type: 'button', cls: 'book-designer-collision-choice' });
		button.createEl('strong', { text: label });
		button.createSpan({ text: description });
		button.addEventListener('click', () => {
			this.answered = true;
			this.resolve(choice);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.answered) this.resolve('cancel');
	}
}
