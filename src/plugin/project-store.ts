import type { Book, BookMetadata } from '../core/model/book-model';
import { renderBookPreviewDocument } from '../core/renderer/book-preview-renderer';
import type { FolderSourceConfig } from '../core/sources/folder-source-adapter';
import type { PreviewDeviceId } from './settings';

export const THEME_IDS = ['classic', 'modern', 'minimal'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const THEME_LABELS: Record<ThemeId, string> = { classic: 'Classic', modern: 'Modern', minimal: 'Minimal' };
export function isThemeId(value: string): value is ThemeId { return THEME_IDS.some((id) => id === value); }

export const TYPOGRAPHY_SCALES = ['compact', 'comfortable', 'spacious'] as const;
export type TypographyScale = (typeof TYPOGRAPHY_SCALES)[number];
export const TYPOGRAPHY_SCALE_LABELS: Record<TypographyScale, string> = { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' };
export function isTypographyScale(value: string): value is TypographyScale { return TYPOGRAPHY_SCALES.some((id) => id === value); }

export const CHAPTER_STYLE_IDS = ['quiet', 'numbered', 'ornament'] as const;
export type ChapterStyleId = (typeof CHAPTER_STYLE_IDS)[number];
export const CHAPTER_STYLE_LABELS: Record<ChapterStyleId, string> = { quiet: 'Quiet', numbered: 'Numbered', ornament: 'Ornament' };
export function isChapterStyleId(value: string): value is ChapterStyleId { return CHAPTER_STYLE_IDS.some((id) => id === value); }

export const SCENE_BREAK_IDS = ['space', 'asterisks', 'ornament'] as const;
export type SceneBreakId = (typeof SCENE_BREAK_IDS)[number];
export const SCENE_BREAK_LABELS: Record<SceneBreakId, string> = { space: 'Space', asterisks: 'Asterisks', ornament: 'Ornament' };
export function isSceneBreakId(value: string): value is SceneBreakId { return SCENE_BREAK_IDS.some((id) => id === value); }

export type BookProjectMetadata = BookMetadata;
export interface BookProjectDesign {
	themeId: ThemeId;
	typographyScale: TypographyScale;
	chapterStyleId: ChapterStyleId;
	sceneBreakId: SceneBreakId;
}
export interface BookProjectPreviewState {
	deviceId: PreviewDeviceId;
	readerScale: number;
	mode: PreviewMode;
	orientation: PreviewOrientation;
	pageIndex: number;
	activeSectionId: string | null;
	scrollTop: number;
}
export const PREVIEW_MODES = ['continuous', 'paged'] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];
export const PREVIEW_ORIENTATIONS = ['portrait', 'landscape'] as const;
export type PreviewOrientation = (typeof PREVIEW_ORIENTATIONS)[number];
export interface BookProject {
	id: string;
	name: string;
	source: FolderSourceConfig;
	metadata: BookProjectMetadata;
	design: BookProjectDesign;
	preview: BookProjectPreviewState;
}
export interface BookProjectRegistry {
	version: 1;
	projects: BookProject[];
	activeProjectId: string | null;
}
export interface ProjectRuntime {
	status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
	book: Book | null;
	renderedHtml: string;
	error: string | null;
}
export interface BookProjectSnapshot {
	registry: BookProjectRegistry;
	activeProject: BookProject | null;
	runtime: ProjectRuntime;
	revision: number;
}
export interface PreviewRenderState {
	title: string;
	author: string;
	themeLabel: string;
	typographyLabel: string;
	chapterStyleLabel: string;
	sceneBreakLabel: string;
	hasManuscript: boolean;
	revision: number;
}

export const DEFAULT_PROJECT_METADATA: BookProjectMetadata = { title: '', author: '', language: 'english', publisher: '', isbn: '' };
export const DEFAULT_PROJECT_DESIGN: BookProjectDesign = { themeId: 'classic', typographyScale: 'comfortable', chapterStyleId: 'quiet', sceneBreakId: 'space' };
const EMPTY_RUNTIME: ProjectRuntime = { status: 'idle', book: null, renderedHtml: '', error: null };

export function emptyProjectRegistry(): BookProjectRegistry { return { version: 1, projects: [], activeProjectId: null }; }

export function normalizeProjectRegistry(value: unknown, defaultDevice: PreviewDeviceId): BookProjectRegistry {
	if (!isRecord(value) || !Array.isArray(value.projects)) return emptyProjectRegistry();
	const projects = value.projects.flatMap((candidate) => normalizeProject(candidate, defaultDevice));
	const requestedId = typeof value.activeProjectId === 'string' ? value.activeProjectId : null;
	return { version: 1, projects, activeProjectId: projects.some((project) => project.id === requestedId) ? requestedId : projects[0]?.id ?? null };
}

export class BookProjectStore {
	private registry: BookProjectRegistry;
	private runtime: ProjectRuntime = { ...EMPTY_RUNTIME };
	private revision = 0;
	private snapshot: BookProjectSnapshot;
	private readonly listeners = new Set<() => void>();

	constructor(
		registry: BookProjectRegistry = emptyProjectRegistry(),
		private readonly defaultDevice: PreviewDeviceId = 'ereader-6',
		private readonly persist: (registry: BookProjectRegistry) => Promise<void> = async () => undefined,
		private readonly createId: () => string = defaultProjectId,
	) {
		this.registry = cloneRegistry(registry);
		this.snapshot = this.createSnapshot();
	}

	getSnapshot(): BookProjectSnapshot {
		return this.snapshot;
	}
	subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

	createProject(folderPath: string, folderName: string): BookProject {
		const name = nextProjectName(folderName, this.registry.projects);
		const project: BookProject = {
			id: this.createId(), name, source: { type: 'folder', path: folderPath },
			metadata: { ...DEFAULT_PROJECT_METADATA, title: folderName }, design: { ...DEFAULT_PROJECT_DESIGN },
			preview: defaultPreviewState(this.defaultDevice),
		};
		this.registry = { ...this.registry, projects: [...this.registry.projects, project], activeProjectId: project.id };
		this.runtime = { ...EMPTY_RUNTIME, status: 'loading' };
		this.commit(true);
		return project;
	}

	selectProject(projectId: string): void {
		if (!this.registry.projects.some((project) => project.id === projectId) || projectId === this.registry.activeProjectId) return;
		this.registry = { ...this.registry, activeProjectId: projectId };
		this.runtime = { ...EMPTY_RUNTIME, status: 'loading' };
		this.commit(true);
	}

	updateMetadata(metadata: Partial<BookProjectMetadata>): void {
		const activeId = this.registry.activeProjectId;
		if (!activeId) return;
		this.registry = { ...this.registry, projects: this.registry.projects.map((project) => project.id === activeId ? { ...project, metadata: { ...project.metadata, ...metadata } } : project) };
		if (this.runtime.book) {
			this.runtime = { ...this.runtime, book: { ...this.runtime.book, metadata: { ...this.runtime.book.metadata, ...metadata } } };
			this.refreshRenderedHtml();
		}
		this.commit(true);
	}
	updateDesign(design: Partial<BookProjectDesign>): void { this.updateActive((project) => ({ ...project, design: { ...project.design, ...design } }), true); }
	updatePreview(preview: Partial<BookProjectPreviewState>): void { this.updateActive((project) => ({ ...project, preview: { ...project.preview, ...preview } }), preview.readerScale !== undefined); }
	setRuntimeLoading(projectId: string): void {
		if (this.registry.activeProjectId !== projectId) return;
		// Keep the last successful preview visible while a background vault reload
		// runs. This is especially important after Obsidian autosaves editor text.
		if (this.runtime.book) {
			this.runtime = { ...this.runtime, error: null };
			this.commit(false);
			return;
		}
		this.runtime = { ...EMPTY_RUNTIME, status: 'loading' };
		this.commit(false);
	}
	setRuntimeBook(projectId: string, book: Book): void {
		if (this.registry.activeProjectId !== projectId) return;
		this.runtime = book.sections.length === 0 ? { ...EMPTY_RUNTIME, status: 'empty', book } : { status: 'ready', book, renderedHtml: '', error: null };
		this.refreshRenderedHtml();
		this.commit(false);
	}
	setRuntimeError(projectId: string, error: unknown): void {
		if (this.registry.activeProjectId !== projectId) return;
		this.runtime = { ...EMPTY_RUNTIME, status: 'error', error: error instanceof Error ? error.message : 'Unable to load this manuscript.' };
		this.commit(false);
	}

	private updateActive(update: (project: BookProject) => BookProject, refreshRenderedHtml = false): void {
		const activeId = this.registry.activeProjectId;
		if (!activeId) return;
		this.registry = { ...this.registry, projects: this.registry.projects.map((project) => project.id === activeId ? update(project) : project) };
		if (refreshRenderedHtml) this.refreshRenderedHtml();
		this.commit(true);
	}
	private refreshRenderedHtml(): void {
		const project = this.activeProject;
		if (!project || !this.runtime.book) return;
		this.runtime = { ...this.runtime, renderedHtml: renderBookPreviewDocument(this.runtime.book, project.design, project.preview.readerScale) };
	}
	private commit(shouldPersist: boolean): void {
		this.revision += 1;
		this.snapshot = this.createSnapshot();
		for (const listener of this.listeners) listener();
		if (shouldPersist) void this.persist(cloneRegistry(this.registry));
	}
	private createSnapshot(): BookProjectSnapshot {
		return {
			registry: cloneRegistry(this.registry),
			activeProject: cloneProject(this.activeProject),
			runtime: { ...this.runtime },
			revision: this.revision,
		};
	}
	private get activeProject(): BookProject | null { return this.registry.projects.find((project) => project.id === this.registry.activeProjectId) ?? null; }
}

export function renderPreviewState(snapshot: BookProjectSnapshot): PreviewRenderState {
	const project = snapshot.activeProject;
	return {
		title: project?.metadata.title.trim() || 'Untitled book', author: project?.metadata.author.trim() || 'Unknown author',
		themeLabel: project ? THEME_LABELS[project.design.themeId] : '', typographyLabel: project ? TYPOGRAPHY_SCALE_LABELS[project.design.typographyScale] : '',
		chapterStyleLabel: project ? CHAPTER_STYLE_LABELS[project.design.chapterStyleId] : '', sceneBreakLabel: project ? SCENE_BREAK_LABELS[project.design.sceneBreakId] : '',
		hasManuscript: snapshot.runtime.status === 'ready', revision: snapshot.revision,
	};
}

function normalizeProject(value: unknown, defaultDevice: PreviewDeviceId): BookProject[] {
	if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !isRecord(value.source) || value.source.type !== 'folder' || typeof value.source.path !== 'string') return [];
	const metadata = isRecord(value.metadata) ? value.metadata : {};
	const design = isRecord(value.design) ? value.design : {};
	const preview = isRecord(value.preview) ? value.preview : {};
	const themeId = stringOr(design.themeId, '');
	const typographyScale = stringOr(design.typographyScale, '');
	const chapterStyleId = stringOr(design.chapterStyleId, '');
	const sceneBreakId = stringOr(design.sceneBreakId, '');
	return [{ id: value.id, name: value.name, source: { type: 'folder', path: value.source.path }, metadata: {
		title: stringOr(metadata.title, ''), author: stringOr(metadata.author, ''), language: stringOr(metadata.language, 'english'), publisher: stringOr(metadata.publisher, ''), isbn: stringOr(metadata.isbn, ''),
	}, design: {
		themeId: isThemeId(themeId) ? themeId : 'classic', typographyScale: isTypographyScale(typographyScale) ? typographyScale : 'comfortable', chapterStyleId: isChapterStyleId(chapterStyleId) ? chapterStyleId : 'quiet', sceneBreakId: isSceneBreakId(sceneBreakId) ? sceneBreakId : 'space',
	}, preview: normalizePreviewState(preview, defaultDevice) }];
}
function isPreviewDevice(value: unknown): value is PreviewDeviceId { return typeof value === 'string' && ['phone-narrow', 'phone', 'ereader-6', 'ereader-large', 'tablet'].includes(value); }
function isPreviewMode(value: unknown): value is PreviewMode { return value === 'continuous' || value === 'paged'; }
function isPreviewOrientation(value: unknown): value is PreviewOrientation { return value === 'portrait' || value === 'landscape'; }
function validScale(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 85 && value <= 130 ? value : 100; }
function validScrollTop(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0; }
function validPageIndex(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0; }
function defaultPreviewState(deviceId: PreviewDeviceId): BookProjectPreviewState {
	return { deviceId, readerScale: 100, mode: deviceId === 'ereader-6' ? 'paged' : 'continuous', orientation: 'portrait', pageIndex: 0, activeSectionId: null, scrollTop: 0 };
}
function normalizePreviewState(value: Record<string, unknown>, defaultDevice: PreviewDeviceId): BookProjectPreviewState {
	const deviceId = isPreviewDevice(value.deviceId) ? value.deviceId : defaultDevice;
	return {
		deviceId,
		readerScale: validScale(value.readerScale),
		mode: isPreviewMode(value.mode) ? value.mode : deviceId === 'ereader-6' ? 'paged' : 'continuous',
		orientation: isPreviewOrientation(value.orientation) ? value.orientation : 'portrait',
		pageIndex: validPageIndex(value.pageIndex),
		activeSectionId: typeof value.activeSectionId === 'string' ? value.activeSectionId : null,
		scrollTop: validScrollTop(value.scrollTop),
	};
}
function stringOr(value: unknown, fallback: string): string { return typeof value === 'string' ? value : fallback; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function cloneProject(project: BookProject | null): BookProject | null { return project ? { ...project, source: { ...project.source }, metadata: { ...project.metadata }, design: { ...project.design }, preview: { ...project.preview } } : null; }
function cloneRegistry(registry: BookProjectRegistry): BookProjectRegistry { return { version: 1, activeProjectId: registry.activeProjectId, projects: registry.projects.map((project) => cloneProject(project) as BookProject) }; }
function nextProjectName(folderName: string, projects: BookProject[]): string { const used = new Set(projects.map((project) => project.name)); if (!used.has(folderName)) return folderName; for (let suffix = 2; ; suffix += 1) { const candidate = `${folderName} ${suffix}`; if (!used.has(candidate)) return candidate; } }
function defaultProjectId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
