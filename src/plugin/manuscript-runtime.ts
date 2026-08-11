import { manuscriptSourceToBook, sourceDocumentToSection } from '../core/parser/markdown-to-book';
import { FolderSourceAdapter, isPathInsideFolder, normalizeVaultPath } from '../core/sources/folder-source-adapter';
import type { VaultManuscriptReader } from '../core/sources/manuscript-source';
import type { BookProjectStore } from './project-store';

export class ActiveManuscriptRuntime {
	private activeProjectId: string | null = null;
	private vaultDebounceTimer: unknown = null;
	private editorDebounceTimer: unknown = null;
	private readonly pendingEditorBuffers = new Map<string, string>();
	private requestId = 0;
	private readonly adapter: FolderSourceAdapter;

	constructor(
		reader: VaultManuscriptReader,
		private readonly store: BookProjectStore,
		private readonly delayMs = 250,
		private readonly timers: TimerScheduler = browserTimers,
		private readonly editorDelayMs = 300,
	) { this.adapter = new FolderSourceAdapter(reader); }

	handleStoreChange(): void {
		const project = this.store.getSnapshot().activeProject;
		if (project?.id === this.activeProjectId) return;
		this.activeProjectId = project?.id ?? null;
		this.pendingEditorBuffers.clear();
		if (project) void this.reload(project.id);
	}

	handleVaultChange(path: string, oldPath?: string): void {
		const project = this.store.getSnapshot().activeProject;
		if (!project || !isRelevantMarkdownPath(path, project.source.path) && !isRelevantMarkdownPath(oldPath, project.source.path)) return;
		if (this.vaultDebounceTimer !== null) this.timers.clearTimeout(this.vaultDebounceTimer);
		this.vaultDebounceTimer = this.timers.setTimeout(() => {
			this.vaultDebounceTimer = null;
			void this.reload(project.id);
		}, this.delayMs);
	}

	handleEditorChange(path: string, content: string): void {
		const project = this.store.getSnapshot().activeProject;
		if (!project || !isRelevantMarkdownPath(path, project.source.path)) return;
		this.pendingEditorBuffers.set(normalizeVaultPath(path), content);
		if (this.editorDebounceTimer !== null) this.timers.clearTimeout(this.editorDebounceTimer);
		this.editorDebounceTimer = this.timers.setTimeout(() => {
			this.editorDebounceTimer = null;
			void this.refreshEditorBuffers(project.id);
		}, this.editorDelayMs);
	}

	async reload(projectId = this.store.getSnapshot().activeProject?.id): Promise<void> {
		if (!projectId) return;
		const snapshot = this.store.getSnapshot();
		const project = snapshot.activeProject;
		if (!project || project.id !== projectId) return;
		const requestId = ++this.requestId;
		this.store.setRuntimeLoading(projectId);
		try {
			const source = await this.adapter.load(project.source);
			if (requestId !== this.requestId || this.store.getSnapshot().activeProject?.id !== projectId) return;
			this.store.setRuntimeBook(projectId, manuscriptSourceToBook(source, project.id, project.metadata));
		} catch (error) {
			if (requestId === this.requestId) this.store.setRuntimeError(projectId, error);
		}
	}

	private async refreshEditorBuffers(projectId: string): Promise<void> {
		const snapshot = this.store.getSnapshot();
		const project = snapshot.activeProject;
		const book = snapshot.runtime.book;
		if (!project || project.id !== projectId || !book) {
			if (project?.id === projectId) {
				await this.reload(projectId);
				if (this.pendingEditorBuffers.size > 0) await this.refreshEditorBuffers(projectId);
			}
			return;
		}

		const buffers = new Map(this.pendingEditorBuffers);
		let didReplaceDocument = false;
		const sections = book.sections.map((section, index) => {
			const content = buffers.get(normalizeVaultPath(section.source.vaultPath));
			if (content === undefined) return section;
			didReplaceDocument = true;
			return sourceDocumentToSection(
				{ id: section.source.vaultPath, vaultPath: section.source.vaultPath, content },
				index,
			);
		});
		for (const [path, content] of buffers) {
			if (this.pendingEditorBuffers.get(path) === content) this.pendingEditorBuffers.delete(path);
		}
		if (didReplaceDocument) {
			// Make any in-flight vault read stale before applying the newer editor text.
			this.requestId += 1;
			this.store.setRuntimeBook(projectId, { ...book, sections });
			return;
		}
		// A just-created note may not yet be part of the current Book Model.
		await this.reload(projectId);
	}

	dispose(): void {
		if (this.vaultDebounceTimer !== null) this.timers.clearTimeout(this.vaultDebounceTimer);
		if (this.editorDebounceTimer !== null) this.timers.clearTimeout(this.editorDebounceTimer);
		this.pendingEditorBuffers.clear();
	}
}

interface TimerScheduler {
	setTimeout(callback: () => void, delayMs: number): unknown;
	clearTimeout(handle: unknown): void;
}

const browserTimers: TimerScheduler = {
	setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
	clearTimeout: (handle) => window.clearTimeout(handle as number),
};

export function isRelevantMarkdownPath(path: string | undefined, folderPath: string): boolean {
	return typeof path === 'string' && /\.md$/i.test(path) && isPathInsideFolder(normalizeVaultPath(path), normalizeVaultPath(folderPath));
}
