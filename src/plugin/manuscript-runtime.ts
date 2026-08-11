import { manuscriptSourceToBook } from '../core/parser/markdown-to-book';
import { FolderSourceAdapter, isPathInsideFolder, normalizeVaultPath } from '../core/sources/folder-source-adapter';
import type { VaultManuscriptReader } from '../core/sources/manuscript-source';
import type { BookProjectStore } from './project-store';

export class ActiveManuscriptRuntime {
	private activeProjectId: string | null = null;
	private debounceTimer: unknown = null;
	private requestId = 0;
	private readonly adapter: FolderSourceAdapter;

	constructor(
		reader: VaultManuscriptReader,
		private readonly store: BookProjectStore,
		private readonly delayMs = 250,
		private readonly timers: TimerScheduler = browserTimers,
	) { this.adapter = new FolderSourceAdapter(reader); }

	handleStoreChange(): void {
		const project = this.store.getSnapshot().activeProject;
		if (project?.id === this.activeProjectId) return;
		this.activeProjectId = project?.id ?? null;
		if (project) void this.reload(project.id);
	}

	handleVaultChange(path: string, oldPath?: string): void {
		const project = this.store.getSnapshot().activeProject;
		if (!project || !isRelevantMarkdownPath(path, project.source.path) && !isRelevantMarkdownPath(oldPath, project.source.path)) return;
		if (this.debounceTimer !== null) this.timers.clearTimeout(this.debounceTimer);
		this.debounceTimer = this.timers.setTimeout(() => {
			this.debounceTimer = null;
			void this.reload(project.id);
		}, this.delayMs);
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

	dispose(): void { if (this.debounceTimer !== null) this.timers.clearTimeout(this.debounceTimer); }
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
