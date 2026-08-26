import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import {
	BOOK_DESIGNER_PROJECT_FILE_EXTENSION,
	parseProjectFileJson,
	safeProjectFilename,
	serializeProjectFile,
} from './project-file';
import {
	ProjectIdConflictError,
	type BookProject,
	type BookProjectStore,
} from './project-store';
import { pickVaultFolder } from '../views/FolderPickerModal';
import {
	chooseProjectCollision,
	confirmProjectAction,
	pickProjectFile,
	promptForText,
} from '../views/ProjectManagementModals';

export interface ProjectManagementActions {
	createProject(): Promise<void>;
	saveProjectAs(projectId: string): Promise<void>;
	importProject(): Promise<void>;
	exportProject(projectId: string): Promise<void>;
	renameProject(projectId: string): Promise<void>;
	deleteProject(projectId: string): Promise<void>;
}

export class ProjectManagementService implements ProjectManagementActions {
	constructor(
		private readonly app: App,
		private readonly store: BookProjectStore,
	) {}

	async createProject(): Promise<void> {
		try {
			const folder = await pickVaultFolder(this.app);
			if (!folder) return;
			const folderName = folder.name || this.app.vault.getName();
			const project = this.store.createProject(folder.path, folderName);
			new Notice(`Created project “${project.name}”.`);
		} catch (error) {
			this.reportError('Book Designer could not create that project.', error);
		}
	}

	async saveProjectAs(projectId: string): Promise<void> {
		const project = this.findProject(projectId);
		if (!project) return;
		const name = await promptForText(this.app, 'Save project as', 'Project name', `${project.name} copy`, 'Save as');
		if (!name) return;
		try {
			const copy = this.store.duplicateProject(projectId, name);
			new Notice(`Saved “${copy.name}” as a separate project.`);
		} catch (error) {
			this.reportError('Book Designer could not save that copy.', error);
		}
	}

	async importProject(): Promise<void> {
		const file = await pickProjectFile(this.app);
		if (!file) return;
		try {
			const parsed = parseProjectFileJson(await this.app.vault.cachedRead(file));
			let strategy: 'reject' | 'replace' | 'copy' = 'reject';
			if (this.store.hasProject(parsed.project.id)) {
				const choice = await chooseProjectCollision(this.app, parsed.project.name);
				if (choice === 'cancel') return;
				strategy = choice;
			}
			const project = this.store.importProject(parsed.project, parsed.mockups, strategy);
			const folderExists = project.source.path === '' || this.app.vault.getAbstractFileByPath(project.source.path) instanceof TFolder;
			if (!folderExists) {
				new Notice(`Imported “${project.name}”, but “${project.source.path}” is not in this vault. Create that folder before opening Preview.`, 10_000);
				return;
			}
			new Notice(`Imported project “${project.name}”.`);
		} catch (error) {
			if (error instanceof ProjectIdConflictError) {
				new Notice('Import canceled because the project ID already exists.');
				return;
			}
			this.reportError('Book Designer could not import that project file.', error);
		}
	}

	async exportProject(projectId: string): Promise<void> {
		const snapshot = this.store.getProjectSnapshot(projectId);
		if (!snapshot) {
			new Notice('Select a project before exporting its configuration.');
			return;
		}
		const suggestedPath = `Book Designer Projects/${safeProjectFilename(snapshot.project.name)}`;
		const requestedPath = await promptForText(this.app, 'Export project file', 'Vault-relative path', suggestedPath, 'Export');
		if (!requestedPath) return;
		try {
			const path = normalizeExportPath(requestedPath);
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing && !(existing instanceof TFile)) throw new Error('The export destination is an existing folder.');
			if (existing) {
				const overwrite = await confirmProjectAction(this.app, 'Replace project file?', `“${path}” already exists in this vault. Replace it?`, 'Replace');
				if (!overwrite) return;
			}
			await this.ensureParentFolders(path);
			const contents = serializeProjectFile(snapshot);
			if (existing) await this.app.vault.modify(existing, contents);
			else await this.app.vault.create(path, contents);
			new Notice(`Exported project configuration to “${path}”.`);
		} catch (error) {
			this.reportError('Book Designer could not export that project file.', error);
		}
	}

	async renameProject(projectId: string): Promise<void> {
		const project = this.findProject(projectId);
		if (!project) return;
		const name = await promptForText(this.app, 'Rename project', 'Project name', project.name, 'Rename');
		if (!name) return;
		try {
			const renamed = this.store.renameProject(projectId, name);
			new Notice(`Renamed project to “${renamed.name}”.`);
		} catch (error) {
			this.reportError('Book Designer could not rename that project.', error);
		}
	}

	async deleteProject(projectId: string): Promise<void> {
		const project = this.findProject(projectId);
		if (!project) return;
		const confirmed = await confirmProjectAction(
			this.app,
			'Delete project?',
			`Delete the “${project.name}” project configuration? Its manuscript folder and notes will not be changed.`,
			'Delete project',
			true,
		);
		if (!confirmed) return;
		if (this.store.deleteProject(projectId)) new Notice(`Deleted project “${project.name}”. Manuscript notes were left untouched.`);
	}

	private findProject(projectId: string): BookProject | null {
		const project = this.store.getSnapshot().registry.projects.find((candidate) => candidate.id === projectId) ?? null;
		if (!project) new Notice('That project no longer exists.');
		return project;
	}

	private async ensureParentFolders(path: string): Promise<void> {
		const parts = path.split('/');
		parts.pop();
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (existing instanceof TFile) throw new Error(`“${current}” is a file, so Book Designer cannot create a folder there.`);
			if (!existing) await this.app.vault.createFolder(current);
		}
	}

	private reportError(message: string, error: unknown): void {
		console.error(message, error);
		new Notice(error instanceof Error ? `${message} ${error.message}` : message, 8_000);
	}
}

function normalizeExportPath(requestedPath: string): string {
	let value = requestedPath.trim().replaceAll('\\', '/');
	if (!value.toLocaleLowerCase().endsWith(BOOK_DESIGNER_PROJECT_FILE_EXTENSION)) value += BOOK_DESIGNER_PROJECT_FILE_EXTENSION;
	if (!value || value.startsWith('/') || value.includes('//') || value.length > 1_024 || containsControlCharacter(value)) {
		throw new Error('Choose a safe vault-relative export path.');
	}
	const segments = value.split('/');
	if (segments.some((segment) => !segment || segment === '.' || segment === '..')) throw new Error('The export path cannot contain empty, ".", or ".." segments.');
	return normalizePath(value);
}

function containsControlCharacter(value: string): boolean {
	return Array.from(value).some((character) => character.charCodeAt(0) < 32);
}
