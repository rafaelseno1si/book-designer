import type { Book, BookMetadata } from '../core/model/book-model';
import { isPreviewMockupId, type PreviewMockupId } from '../core/mockups/preview-mockup';
import {
	DEFAULT_MOCKUP_COLOR_CONFIG,
	normalizeMockupColorConfig,
	normalizeMockupFrameBounds,
	type ImportedHtmlMockup,
} from '../core/mockups/html-mockup-import';
import { DEFAULT_DISPLAY_PROFILE, normalizeDisplayProfile } from '../core/mockups/display-profile';
import { renderBookPreviewDocument } from '../core/renderer/book-preview-renderer';
import type { FolderSourceConfig } from '../core/sources/folder-source-adapter';
import type { PreviewDeviceId } from './settings';
import { MOTOROLA_RAZR_ID, MOTOROLA_RAZR_MOCKUP } from '../core/mockups/motorola-razr-mockup';

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
	contentWidth: number;
	contentHeight: number;
	frameColor: string;
	displayTheme: DisplayTheme;
	brightness: number;
	warmth: number;
	einkRenderMode: EInkRenderMode;
	colorSoftTone: ColorSoftTone;
	publisherFontSettings: boolean;
	deviceContentSettings: Record<string, PreviewContentSettings>;
	deviceScale: number;
	autoDeviceScale: boolean;
	customDeviceWidth: number;
	customDeviceHeight: number;
	mockupId: PreviewMockupId;
	/** The selected item in the persisted imported-mockup library. */
	importedMockupId: string | null;
	/** Last selected physical posture for each imported mockup ID. */
	mockupPostures: Record<string, string>;
	mode: PreviewMode;
	orientation: PreviewOrientation;
	pageIndex: number;
	activeSectionId: string | null;
	scrollTop: number;
}
export interface PreviewContentSettings {
	readerScale: number;
	contentWidth: number;
	contentHeight: number;
	frameColor: string;
	/** User-facing display controls, stored independently for each device. */
	displayTheme: DisplayTheme;
	brightness: number;
	warmth: number;
	einkRenderMode: EInkRenderMode;
	colorSoftTone: ColorSoftTone;
	publisherFontSettings: boolean;
}
export const DISPLAY_THEMES = ['light', 'dark', 'sepia', 'mint'] as const;
export type DisplayTheme = (typeof DISPLAY_THEMES)[number];
export const EINK_RENDER_MODES = ['monochrome', 'colorsoft'] as const;
export type EInkRenderMode = (typeof EINK_RENDER_MODES)[number];
export const COLORSOFT_TONES = ['standard', 'vivid'] as const;
export type ColorSoftTone = (typeof COLORSOFT_TONES)[number];
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
	mockups: ImportedHtmlMockup[];
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

export function emptyProjectRegistry(): BookProjectRegistry { return { version: 1, projects: [], activeProjectId: null, mockups: [] }; }

export function normalizeProjectRegistry(value: unknown, defaultDevice: PreviewDeviceId): BookProjectRegistry {
	if (!isRecord(value) || !Array.isArray(value.projects)) return emptyProjectRegistry();
	const projects = value.projects.flatMap((candidate) => normalizeProject(candidate, defaultDevice));
	const mockups = normalizeImportedMockups(value.mockups);
	// Phase 1 initially embedded a single imported mockup in each project. Pull
	// those legacy entries into the shared library on the next save instead of
	// losing users' existing device frames.
	for (const candidate of value.projects) {
		if (!isRecord(candidate) || !isRecord(candidate.preview)) continue;
		const legacyMockup = normalizeImportedMockup(candidate.preview.importedMockup);
		if (legacyMockup && !mockups.some((mockup) => mockup.id === legacyMockup.id)) mockups.push(legacyMockup);
	}
	for (const project of projects) {
		const legacyPreview = value.projects.find((candidate) => isRecord(candidate) && candidate.id === project.id && isRecord(candidate.preview))?.preview;
		const legacyId = isRecord(legacyPreview) ? normalizeImportedMockup(legacyPreview.importedMockup)?.id : null;
		if (project.preview.deviceId === 'imported' && !project.preview.importedMockupId && legacyId) project.preview.importedMockupId = legacyId;
		if (project.preview.deviceId === 'imported' && !mockups.some((mockup) => mockup.id === project.preview.importedMockupId)) {
			project.preview = { ...project.preview, deviceId: defaultDevice === 'imported' ? 'ereader-6' : defaultDevice, importedMockupId: null };
		}
	}
	const requestedId = typeof value.activeProjectId === 'string' ? value.activeProjectId : null;
	return { version: 1, projects, mockups, activeProjectId: projects.some((project) => project.id === requestedId) ? requestedId : projects[0]?.id ?? null };
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
	updatePreview(preview: Partial<BookProjectPreviewState>): void {
		this.updateActive((project) => {
			const previous = project.preview;
			const next = { ...previous, ...preview };
			const settings = { ...previous.deviceContentSettings };
			settings[previewContentKey(previous)] = contentSettingsFromPreview(previous);
			const targetKey = previewContentKey(next);
			const hasContentChange = preview.readerScale !== undefined || preview.contentWidth !== undefined || preview.contentHeight !== undefined || preview.frameColor !== undefined
				|| preview.displayTheme !== undefined || preview.brightness !== undefined || preview.warmth !== undefined
				|| preview.einkRenderMode !== undefined || preview.colorSoftTone !== undefined || preview.publisherFontSettings !== undefined;
			const target = hasContentChange
				? normalizeContentSettings({ ...contentSettingsFromPreview(next), ...preview })
				: settings[targetKey] ?? defaultPreviewContentSettings(next.deviceId);
			settings[targetKey] = target;
			return { ...project, preview: { ...next, ...target, deviceContentSettings: settings } };
		}, true);
	}
	addImportedMockup(mockup: ImportedHtmlMockup): void {
		this.registry = { ...this.registry, mockups: [...this.registry.mockups, cloneImportedMockup(mockup)] };
		this.commit(true);
	}
	replaceImportedMockup(mockupId: string, replacement: ImportedHtmlMockup): void {
		if (!this.registry.mockups.some((mockup) => mockup.id === mockupId)) return;
		const updated = { ...cloneImportedMockup(replacement), id: mockupId };
		this.registry = {
			...this.registry,
			mockups: this.registry.mockups.map((mockup) => mockup.id === mockupId ? updated : mockup),
			projects: this.registry.projects.map((project) => ({
				...project,
				preview: {
					...project.preview,
					mockupPostures: updated.postures.some((posture) => posture.id === project.preview.mockupPostures[mockupId])
						? project.preview.mockupPostures
						: withoutKey(project.preview.mockupPostures, mockupId),
				},
			})),
		};
		this.commit(true);
	}
	deleteImportedMockup(mockupId: string): void {
		if (!this.registry.mockups.some((mockup) => mockup.id === mockupId)) return;
		const fallbackDevice = this.defaultDevice === 'imported' ? 'ereader-6' : this.defaultDevice;
		this.registry = {
			...this.registry,
			mockups: this.registry.mockups.filter((mockup) => mockup.id !== mockupId),
			projects: this.registry.projects.map((project) => {
				const mockupPostures = withoutKey(project.preview.mockupPostures, mockupId);
				return project.preview.importedMockupId === mockupId
					? { ...project, preview: { ...project.preview, deviceId: fallbackDevice, importedMockupId: null, mockupId: fallbackDevice === 'kindle-paperwhite' ? 'kindle-paperwhite' : 'plain', mockupPostures, pageIndex: 0 } }
					: { ...project, preview: { ...project.preview, mockupPostures } };
			}),
		};
		this.commit(true);
	}
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
function isPreviewDevice(value: unknown): value is PreviewDeviceId { return typeof value === 'string' && ['phone-narrow', 'phone', 'ereader-6', 'ereader-large', 'tablet', 'custom', 'kindle-paperwhite', MOTOROLA_RAZR_ID, 'imported'].includes(value); }
function isPreviewMode(value: unknown): value is PreviewMode { return value === 'continuous' || value === 'paged'; }
function isPreviewOrientation(value: unknown): value is PreviewOrientation { return value === 'portrait' || value === 'landscape'; }
function validScale(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 85 && value <= 800 ? value : 100; }
function validContentSpan(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : 100; }
const DEFAULT_PREVIEW_CONTENT_SETTINGS: PreviewContentSettings = {
	readerScale: 100,
	contentWidth: 100,
	contentHeight: 100,
	frameColor: '#2a2a2a',
	displayTheme: 'light',
	brightness: 100,
	warmth: 0,
	einkRenderMode: 'monochrome',
	colorSoftTone: 'standard',
	publisherFontSettings: true,
};
function defaultPreviewContentSettings(deviceId: PreviewDeviceId): PreviewContentSettings {
	return deviceId === MOTOROLA_RAZR_ID ? { ...DEFAULT_PREVIEW_CONTENT_SETTINGS, frameColor: MOTOROLA_RAZR_MOCKUP.defaultFrameColor } : { ...DEFAULT_PREVIEW_CONTENT_SETTINGS };
}
function contentSettingsFromPreview(preview: Pick<BookProjectPreviewState, keyof PreviewContentSettings>): PreviewContentSettings {
	return {
		readerScale: preview.readerScale,
		contentWidth: preview.contentWidth,
		contentHeight: preview.contentHeight,
		frameColor: preview.frameColor,
		displayTheme: preview.displayTheme,
		brightness: preview.brightness,
		warmth: preview.warmth,
		einkRenderMode: preview.einkRenderMode,
		colorSoftTone: preview.colorSoftTone,
		publisherFontSettings: preview.publisherFontSettings,
	};
}
function normalizeContentSettings(value: Record<string, unknown> | PreviewContentSettings): PreviewContentSettings {
	return {
		readerScale: validScale(value.readerScale),
		contentWidth: validContentSpan(value.contentWidth),
		contentHeight: validContentSpan(value.contentHeight),
		frameColor: validFrameColor(value.frameColor),
		displayTheme: isDisplayTheme(value.displayTheme) ? value.displayTheme : 'light',
		brightness: validPercentage(value.brightness, 100),
		warmth: validPercentage(value.warmth, 0),
		einkRenderMode: isEInkRenderMode(value.einkRenderMode) ? value.einkRenderMode : 'monochrome',
		colorSoftTone: isColorSoftTone(value.colorSoftTone) ? value.colorSoftTone : 'standard',
		publisherFontSettings: typeof value.publisherFontSettings === 'boolean' ? value.publisherFontSettings : true,
	};
}
function isDisplayTheme(value: unknown): value is DisplayTheme { return typeof value === 'string' && DISPLAY_THEMES.includes(value as DisplayTheme); }
function isEInkRenderMode(value: unknown): value is EInkRenderMode { return typeof value === 'string' && EINK_RENDER_MODES.includes(value as EInkRenderMode); }
function isColorSoftTone(value: unknown): value is ColorSoftTone { return typeof value === 'string' && COLORSOFT_TONES.includes(value as ColorSoftTone); }
function validPercentage(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : fallback; }
function validFrameColor(value: unknown): string { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_PREVIEW_CONTENT_SETTINGS.frameColor; }
function previewContentKey(preview: Pick<BookProjectPreviewState, 'deviceId' | 'importedMockupId'>): string {
	return preview.deviceId === 'imported' && preview.importedMockupId ? `imported:${preview.importedMockupId}` : `device:${preview.deviceId}`;
}
function normalizeDeviceContentSettings(value: unknown): Record<string, PreviewContentSettings> {
	if (!isRecord(value)) return {};
	return Object.fromEntries(Object.entries(value).flatMap(([key, candidate]) => isRecord(candidate) ? [[key, normalizeContentSettings(candidate)]] : []));
}
function validDeviceScale(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 25 && value <= 100 ? value : 100; }
function validCustomDimension(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) && value >= 200 && value <= 2000 ? Math.round(value) : fallback; }
function validScrollTop(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0; }
function validPageIndex(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0; }
function defaultPreviewState(deviceId: PreviewDeviceId): BookProjectPreviewState {
	const resolvedDeviceId = deviceId === 'imported' ? 'ereader-6' : deviceId;
	const content = defaultPreviewContentSettings(resolvedDeviceId);
	return { deviceId: resolvedDeviceId, ...content, deviceContentSettings: { [previewContentKey({ deviceId: resolvedDeviceId, importedMockupId: null })]: content }, deviceScale: 100, autoDeviceScale: true, customDeviceWidth: 390, customDeviceHeight: 844, mockupId: 'plain', importedMockupId: null, mockupPostures: {}, mode: deviceId === 'ereader-6' ? 'paged' : 'continuous', orientation: 'portrait', pageIndex: 0, activeSectionId: null, scrollTop: 0 };
}
function normalizePreviewState(value: Record<string, unknown>, defaultDevice: PreviewDeviceId): BookProjectPreviewState {
	const deviceId = isPreviewDevice(value.deviceId) ? value.deviceId : defaultDevice;
	const importedMockupId = typeof value.importedMockupId === 'string' ? value.importedMockupId : null;
	const deviceContentSettings = normalizeDeviceContentSettings(value.deviceContentSettings);
	const key = previewContentKey({ deviceId, importedMockupId });
	const currentContent = deviceContentSettings[key] ?? normalizeContentSettings(value);
	deviceContentSettings[key] = currentContent;
	return {
		deviceId,
		...currentContent,
		deviceContentSettings,
		deviceScale: validDeviceScale(value.deviceScale),
		autoDeviceScale: typeof value.autoDeviceScale === 'boolean' ? value.autoDeviceScale : true,
		customDeviceWidth: validCustomDimension(value.customDeviceWidth, 390),
		customDeviceHeight: validCustomDimension(value.customDeviceHeight, 844),
		mockupId: isPreviewMockupId(value.mockupId) ? value.mockupId : 'plain',
		importedMockupId,
		mockupPostures: normalizeMockupPostures(value.mockupPostures),
		mode: isPreviewMode(value.mode) ? value.mode : deviceId === 'ereader-6' ? 'paged' : 'continuous',
		orientation: isPreviewOrientation(value.orientation) ? value.orientation : 'portrait',
		pageIndex: validPageIndex(value.pageIndex),
		activeSectionId: typeof value.activeSectionId === 'string' ? value.activeSectionId : null,
		scrollTop: validScrollTop(value.scrollTop),
	};
}
function stringOr(value: unknown, fallback: string): string { return typeof value === 'string' ? value : fallback; }
function normalizeImportedMockup(value: unknown): ImportedHtmlMockup | null {
	if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.html !== 'string' || value.html.length > 1_000_000) return null;
	return {
		id: value.id,
		name: value.name,
		html: value.html,
		width: validCustomDimension(value.width, 460),
		height: validCustomDimension(value.height, 700),
		postures: normalizeImportedMockupPostures(value.postures),
		// Old saved mockups did not declare color capability. Preserve their
		// authored appearance and intentionally keep the picker unavailable.
		color: normalizeMockupColorConfig(value.color) ?? { ...DEFAULT_MOCKUP_COLOR_CONFIG },
		display: normalizeDisplayProfile(value.display) ?? { ...DEFAULT_DISPLAY_PROFILE },
	};
}
function normalizeImportedMockups(value: unknown): ImportedHtmlMockup[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	return value.flatMap((candidate) => {
		const mockup = normalizeImportedMockup(candidate);
		if (!mockup || seen.has(mockup.id)) return [];
		seen.add(mockup.id);
		return [mockup];
	});
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function normalizeMockupPostures(value: unknown): Record<string, string> {
	if (!isRecord(value)) return {};
	return Object.fromEntries(Object.entries(value).flatMap(([mockupId, posture]) => typeof posture === 'string' && /^(unfold|fold[1-9]\d*)$/.test(posture) ? [[mockupId, posture]] : []));
}
function normalizeImportedMockupPostures(value: unknown): ImportedHtmlMockup['postures'] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const postures = value.flatMap((candidate) => {
		if (!isRecord(candidate) || typeof candidate.id !== 'string' || !/^(unfold|fold[1-9]\d*)$/.test(candidate.id) || seen.has(candidate.id)) return [];
		seen.add(candidate.id);
		return [{
			id: candidate.id,
			label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : candidate.id === 'unfold' ? 'Unfolded' : `Fold ${candidate.id.slice(4)}`,
			frame: normalizeMockupFrameBounds(candidate.frame),
		}];
	});
	return postures[0]?.id === 'unfold' && postures.every((posture, index) => posture.id === (index === 0 ? 'unfold' : `fold${index}`)) ? postures : [];
}
function withoutKey<T>(value: Record<string, T>, key: string): Record<string, T> { const { [key]: _, ...remaining } = value; return remaining; }
function cloneProject(project: BookProject | null): BookProject | null { return project ? { ...project, source: { ...project.source }, metadata: { ...project.metadata }, design: { ...project.design }, preview: { ...project.preview, mockupPostures: { ...project.preview.mockupPostures }, deviceContentSettings: Object.fromEntries(Object.entries(project.preview.deviceContentSettings).map(([key, value]) => [key, { ...value }])) } } : null; }
function cloneImportedMockup(mockup: ImportedHtmlMockup): ImportedHtmlMockup {
	return { ...mockup, color: { ...mockup.color }, display: { ...mockup.display }, postures: mockup.postures.map((posture) => ({ ...posture, frame: posture.frame ? { ...posture.frame } : null })) };
}
function cloneRegistry(registry: BookProjectRegistry): BookProjectRegistry { return { version: 1, activeProjectId: registry.activeProjectId, projects: registry.projects.map((project) => cloneProject(project) as BookProject), mockups: registry.mockups.map(cloneImportedMockup) }; }
function nextProjectName(folderName: string, projects: BookProject[]): string { const used = new Set(projects.map((project) => project.name)); if (!used.has(folderName)) return folderName; for (let suffix = 2; ; suffix += 1) { const candidate = `${folderName} ${suffix}`; if (!used.has(candidate)) return candidate; } }
function defaultProjectId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
