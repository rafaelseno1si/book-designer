import type { Book, BookMetadata } from '../core/model/book-model';
import { cloneDesign, parseAssignments, sameElements } from '../core/elements/settings';
import type { ElementArtifact, ElementAssignments, ElementLibraryEntry } from '../core/elements/types';
import { cloneEntry, normalizeLibrary, referencedElementIds, remapDesignElements } from './elements/library';
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
import {
	BUILT_IN_THEME_OPTIONS,
	findThemeOption,
	themeOptions,
	type BookThemeOption,
	type CustomBookTheme,
} from './theme-catalog';
import {
	DEFAULT_PRINT_SETTINGS,
	normalizePrintSettings,
	samePrintSettings,
	validatePrintSettings,
	type BookPrintSettings,
} from './print-settings';

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

export const FIRST_PARAGRAPH_STYLE_IDS = ['indented', 'flush', 'drop-cap'] as const;
export type FirstParagraphStyleId = (typeof FIRST_PARAGRAPH_STYLE_IDS)[number];
export function isFirstParagraphStyleId(value: string): value is FirstParagraphStyleId { return FIRST_PARAGRAPH_STYLE_IDS.some((id) => id === value); }

export type BookProjectMetadata = BookMetadata;
export interface BookProjectDesign {
	elements?: ElementAssignments;
	themeId: ThemeId;
	customThemeId: string | null;
	typographyScale: TypographyScale;
	chapterStyleId: ChapterStyleId;
	firstParagraphStyleId: FirstParagraphStyleId;
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
	printPaginationMode: PrintPaginationMode;
	printFacingPages: boolean;
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
	/** Print-only controls, also stored per device target. */
	printPaginationMode: PrintPaginationMode;
	printFacingPages: boolean;
}
export const DISPLAY_THEMES = ['light', 'dark', 'sepia', 'mint'] as const;
export type DisplayTheme = (typeof DISPLAY_THEMES)[number];
export const EINK_RENDER_MODES = ['monochrome', 'colorsoft'] as const;
export type EInkRenderMode = (typeof EINK_RENDER_MODES)[number];
export const COLORSOFT_TONES = ['standard', 'vivid'] as const;
export type ColorSoftTone = (typeof COLORSOFT_TONES)[number];
export const PRINT_PAGINATION_MODES = ['fast', 'complete'] as const;
export type PrintPaginationMode = (typeof PRINT_PAGINATION_MODES)[number];
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
	print: BookPrintSettings;
	preview: BookProjectPreviewState;
}
export interface BookProjectRegistry {
	elements?: ElementLibraryEntry[];
	version: 1;
	projects: BookProject[];
	activeProjectId: string | null;
	mockups: ImportedHtmlMockup[];
	themes: CustomBookTheme[];
}
export interface ProjectRuntime {
	elementDiagnostic?: string | null;
	status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
	book: Book | null;
	renderedHtml: string;
	error: string | null;
	previewDesign: BookProjectDesign | null;
	previewPrintSettings: BookPrintSettings | null;
	printPageCount: number | null;
}
export interface BookProjectSnapshot {
	registryRevision: number;
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

export type ProjectImportCollisionStrategy = 'reject' | 'replace' | 'copy';

export class ProjectNameValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProjectNameValidationError';
	}
}

export class ProjectIdConflictError extends Error {
	constructor(readonly projectId: string) {
		super(`A project with ID "${projectId}" already exists.`);
		this.name = 'ProjectIdConflictError';
	}
}

export const DEFAULT_PROJECT_METADATA: BookProjectMetadata = { title: '', author: '', language: 'english', publisher: '', isbn: '' };
export const DEFAULT_PROJECT_DESIGN: BookProjectDesign = { themeId: 'classic', customThemeId: null, typographyScale: 'comfortable', chapterStyleId: 'quiet', firstParagraphStyleId: 'indented', sceneBreakId: 'space' };
const EMPTY_RUNTIME: ProjectRuntime = { status: 'idle', book: null, renderedHtml: '', error: null, previewDesign: null, previewPrintSettings: null, printPageCount: null };

export function emptyProjectRegistry(): BookProjectRegistry { return { version: 1, projects: [], activeProjectId: null, mockups: [], themes: [] }; }

export function normalizeProjectRegistry(value: unknown, defaultDevice: PreviewDeviceId): BookProjectRegistry {
	if (!isRecord(value) || !Array.isArray(value.projects)) return emptyProjectRegistry();
	const rawProjects: unknown[] = value.projects;
	const projects = rawProjects.flatMap((candidate) => normalizeProject(candidate, defaultDevice));
	const mockups = normalizeImportedMockups(value.mockups);
	const themes = normalizeCustomThemes(value.themes);
	// Phase 1 initially embedded a single imported mockup in each project. Pull
	// those legacy entries into the shared library on the next save instead of
	// losing users' existing device frames.
	for (const candidate of rawProjects) {
		if (!isRecord(candidate) || !isRecord(candidate.preview)) continue;
		const legacyMockup = normalizeImportedMockup(candidate.preview.importedMockup);
		if (legacyMockup && !mockups.some((mockup) => mockup.id === legacyMockup.id)) mockups.push(legacyMockup);
	}
	for (const project of projects) {
		const legacyCandidate = rawProjects.find((candidate) => isRecord(candidate) && candidate.id === project.id && isRecord(candidate.preview));
		const legacyPreview: unknown = isRecord(legacyCandidate) ? legacyCandidate.preview : undefined;
		const legacyId = isRecord(legacyPreview) ? normalizeImportedMockup(legacyPreview.importedMockup)?.id : null;
		if (project.preview.deviceId === 'imported' && !project.preview.importedMockupId && legacyId) project.preview.importedMockupId = legacyId;
		if (project.preview.deviceId === 'imported' && !mockups.some((mockup) => mockup.id === project.preview.importedMockupId)) {
			project.preview = { ...project.preview, deviceId: defaultDevice === 'imported' ? 'ereader-6' : defaultDevice, importedMockupId: null };
		}
	}
	const requestedId = typeof value.activeProjectId === 'string' ? value.activeProjectId : null;
	for (const project of projects) {
		if (project.design.customThemeId && !themes.some((theme) => theme.id === project.design.customThemeId)) project.design.customThemeId = null;
	}
	return { version: 1, projects, mockups, themes, elements: normalizeLibrary(value.elements), activeProjectId: projects.some((project) => project.id === requestedId) ? requestedId : projects[0]?.id ?? null };
}

export class BookProjectStore {
	private elementArtifact: ElementArtifact | null = null;
	private persistQueue: Promise<void> = Promise.resolve();
	private registry: BookProjectRegistry;
	private runtime: ProjectRuntime = { ...EMPTY_RUNTIME };
	private revision = 0;
	private registryRevision = 0;
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
	whenPersisted(): Promise<void> { return this.persistQueue; }
	subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

	createProject(folderPath: string, folderName: string): BookProject {
		const name = nextProjectName(folderName.trim() || 'Untitled project', this.registry.projects);
		const project: BookProject = {
			id: this.nextAvailableProjectId(), name, source: { type: 'folder', path: folderPath },
			metadata: { ...DEFAULT_PROJECT_METADATA, title: folderName }, design: { ...DEFAULT_PROJECT_DESIGN },
			print: { ...DEFAULT_PRINT_SETTINGS },
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

	duplicateProject(projectId: string, requestedName: string): BookProject {
		const source = this.registry.projects.find((project) => project.id === projectId);
		if (!source) throw new Error('Select a project before using Save as.');
		const name = this.validatedUniqueName(requestedName);
		const project = cloneProject(source);
		if (!project) throw new Error('The selected project could not be copied.');
		project.id = this.nextAvailableProjectId();
		project.name = name;
		project.preview = resetTransientPreview(project.preview);
		this.registry = { ...this.registry, projects: [...this.registry.projects, project], activeProjectId: project.id };
		this.runtime = { ...EMPTY_RUNTIME, status: 'loading' };
		this.commit(true);
		return cloneProject(project) as BookProject;
	}

	renameProject(projectId: string, requestedName: string): BookProject {
		const existing = this.registry.projects.find((project) => project.id === projectId);
		if (!existing) throw new Error('That project no longer exists.');
		const name = this.validatedUniqueName(requestedName, projectId);
		if (name === existing.name) return cloneProject(existing) as BookProject;
		const renamed = { ...existing, name };
		this.registry = { ...this.registry, projects: this.registry.projects.map((project) => project.id === projectId ? renamed : project) };
		this.commit(true);
		return cloneProject(renamed) as BookProject;
	}

	deleteProject(projectId: string): boolean {
		const deletedIndex = this.registry.projects.findIndex((project) => project.id === projectId);
		if (deletedIndex < 0) return false;
		const projects = this.registry.projects.filter((project) => project.id !== projectId);
		const deletingActive = this.registry.activeProjectId === projectId;
		const fallback = projects[Math.min(deletedIndex, projects.length - 1)] ?? null;
		this.registry = {
			...this.registry,
			projects,
			activeProjectId: deletingActive ? fallback?.id ?? null : this.registry.activeProjectId,
		};
		if (deletingActive) this.runtime = fallback ? { ...EMPTY_RUNTIME, status: 'loading' } : { ...EMPTY_RUNTIME };
		this.commit(true);
		return true;
	}

	hasProject(projectId: string): boolean {
		return this.registry.projects.some((project) => project.id === projectId);
	}

	getProjectSnapshot(projectId: string): { project: BookProject; mockups: ImportedHtmlMockup[]; themes: CustomBookTheme[]; elements: ElementLibraryEntry[] } | null {
		const project = this.registry.projects.find((candidate) => candidate.id === projectId);
		if (!project) return null;
		const referencedIds = projectMockupIds(project);
		return {
			project: cloneProject(project) as BookProject,
			elements: (this.registry.elements ?? []).filter((entry) => referencedElementIds(project, this.registry.themes.filter((theme) => theme.id === project.design.customThemeId)).has(entry.id)).map(cloneEntry),
			mockups: this.registry.mockups.filter((mockup) => referencedIds.has(mockup.id)).map(cloneImportedMockup),
			themes: project.design.customThemeId
				? this.registry.themes.filter((theme) => theme.id === project.design.customThemeId).map(cloneCustomTheme)
				: [],
		};
	}

	importProject(
		incomingProject: BookProject,
		incomingMockups: ImportedHtmlMockup[],
		incomingThemes: CustomBookTheme[] = [],
		collisionStrategy: ProjectImportCollisionStrategy = 'reject',
		incomingElements: ElementLibraryEntry[] = [],
	): BookProject {
		const conflicts = this.hasProject(incomingProject.id);
		if (conflicts && collisionStrategy === 'reject') throw new ProjectIdConflictError(incomingProject.id);
		const elements = (this.registry.elements ?? []).map(cloneEntry);
		const ids = new Map<string, string>();
		for (const entry of incomingElements) {
			const identical = elements.find((existing) => existing.package.files['index.html'] === entry.package.files['index.html']);
			if (identical) { ids.set(entry.id, identical.id); continue; }
			let id = entry.id;
			while (elements.some((existing) => existing.id === id)) id = `element-${defaultProjectId()}`;
			ids.set(entry.id, id); elements.push({ ...cloneEntry(entry), id, previousPackage: undefined });
		}
		if (elements.length > 200) throw new Error('Import would exceed the 200-entry element library limit.');
		// A missing portable package must not accidentally bind to unrelated installed content.
		for (const id of referencedElementIds(incomingProject, incomingThemes)) {
			if (!id.startsWith('builtin.') && !ids.has(id) && elements.some((entry) => entry.id === id)) ids.set(id, `unresolved-${defaultProjectId()}`);
		}
		const merged = mergeImportedMockups(this.registry.mockups, incomingMockups, { ...incomingProject, design: remapDesignElements(incomingProject.design, ids) });
		const themeMerge = mergeCustomThemes(this.registry.themes, incomingThemes.map((theme) => ({ ...theme, design: remapDesignElements(theme.design, ids) })), merged.project);
		const project = themeMerge.project;
		if (conflicts && collisionStrategy === 'copy') project.id = this.nextAvailableProjectId();
		const nameCandidates = this.registry.projects.filter((candidate) => !(conflicts && collisionStrategy === 'replace' && candidate.id === project.id));
		project.name = nextProjectName(project.name.trim() || 'Imported project', nameCandidates);
		project.preview = resetTransientPreview(project.preview);
		const projects = conflicts && collisionStrategy === 'replace'
			? this.registry.projects.map((candidate) => candidate.id === project.id ? project : candidate)
			: [...this.registry.projects, project];
		this.registry = { ...this.registry, projects, elements, mockups: merged.mockups, themes: themeMerge.themes, activeProjectId: project.id };
		this.runtime = { ...EMPTY_RUNTIME, status: 'loading' };
		this.commit(true);
		return cloneProject(project) as BookProject;
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
	updateDesign(design: Partial<BookProjectDesign>): void { this.updateActive((project) => ({ ...project, design: cloneDesign({ ...project.design, ...design }) }), true); }
	updatePrintSettings(settings: BookPrintSettings): void {
		const normalized = normalizePrintSettings(settings);
		const errors = validatePrintSettings(normalized);
		if (errors.length > 0) throw new Error(errors[0]);
		this.runtime = { ...this.runtime, previewPrintSettings: this.runtime.previewPrintSettings ? normalized : null, printPageCount: null };
		this.updateActive((project) => ({ ...project, print: normalized, preview: { ...project.preview, pageIndex: 0 } }), false);
	}
	setPrintSettingsPreview(settings: BookPrintSettings | null): void {
		const next = settings ? normalizePrintSettings(settings) : null;
		if (next && validatePrintSettings(next).length > 0) return;
		if (sameNullablePrintSettings(this.runtime.previewPrintSettings, next)) return;
		this.runtime = { ...this.runtime, previewPrintSettings: next ? { ...next } : null, printPageCount: null };
		this.commit(false);
	}
	setPrintMarginGuides(showMarginGuides: boolean): void {
		this.updateActive((project) => ({ ...project, print: { ...project.print, showMarginGuides } }), false);
	}
	getThemeOptions(): BookThemeOption[] {
		return themeOptions(this.registry.themes);
	}
	duplicateTheme(sourceThemeId: string): CustomBookTheme {
		const source = findThemeOption(sourceThemeId, this.registry.themes);
		if (!source) throw new Error('That theme no longer exists.');
		const id = nextCustomThemeId(new Set(this.registry.themes.map((theme) => theme.id)));
		const theme: CustomBookTheme = {
			id,
			name: nextThemeName(`${source.name} copy`, this.registry.themes),
			baseThemeId: source.design.themeId,
			design: cloneDesign({ ...source.design, customThemeId: id }),
		};
		this.registry = { ...this.registry, themes: [...this.registry.themes, theme] };
		this.commit(true);
		return cloneCustomTheme(theme);
	}
	updateCustomTheme(themeId: string, update: { name?: string; design?: Partial<BookProjectDesign> }): CustomBookTheme {
		const existing = this.registry.themes.find((theme) => theme.id === themeId);
		if (!existing) throw new Error('That custom theme no longer exists.');
		const name = update.name === undefined ? existing.name : validatedThemeName(update.name, this.registry.themes, themeId);
		const design = cloneDesign(update.design ? { ...existing.design, ...update.design, customThemeId: themeId } : existing.design);
		const theme: CustomBookTheme = { ...existing, name, baseThemeId: design.themeId, design };
		this.registry = { ...this.registry, themes: this.registry.themes.map((candidate) => candidate.id === themeId ? theme : candidate) };
		this.commit(true);
		return cloneCustomTheme(theme);
	}
	applyTheme(themeId: string): void {
		const theme = findThemeOption(themeId, this.registry.themes);
		if (!theme) return;
		this.runtime = { ...this.runtime, previewDesign: null };
		this.updateActive((project) => ({ ...project, design: cloneDesign(theme.design) }), true);
	}
	setDesignPreview(design: BookProjectDesign | null): void {
		const next = design ? cloneDesign(design) : null;
		if (sameDesign(this.runtime.previewDesign, next)) return;
		this.runtime = { ...this.runtime, previewDesign: next };
		this.refreshRenderedHtml();
		this.commit(false);
	}
	updatePreview(preview: Partial<BookProjectPreviewState>): void {
		this.updateActive((project) => {
			const previous = project.preview;
			const next = { ...previous, ...preview };
			const settings = { ...previous.deviceContentSettings };
			settings[previewContentKey(previous)] = contentSettingsFromPreview(previous);
			const targetKey = previewContentKey(next);
			const hasContentChange = preview.readerScale !== undefined || preview.contentWidth !== undefined || preview.contentHeight !== undefined || preview.frameColor !== undefined
				|| preview.displayTheme !== undefined || preview.brightness !== undefined || preview.warmth !== undefined
				|| preview.einkRenderMode !== undefined || preview.colorSoftTone !== undefined || preview.publisherFontSettings !== undefined
				|| preview.printPaginationMode !== undefined || preview.printFacingPages !== undefined;
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
		const previewDesign = this.runtime.previewDesign;
		const previewPrintSettings = this.runtime.previewPrintSettings;
		this.runtime = book.sections.length === 0 ? { ...EMPTY_RUNTIME, status: 'empty', book, previewDesign, previewPrintSettings } : { status: 'ready', book, renderedHtml: '', error: null, previewDesign, previewPrintSettings, printPageCount: null };
		this.refreshRenderedHtml();
		this.commit(false);
	}
	setPrintPageCount(projectId: string, pageCount: number | null): void {
		if (this.registry.activeProjectId !== projectId) return;
		const normalized = typeof pageCount === 'number' && Number.isInteger(pageCount) && pageCount > 0 ? pageCount : null;
		if (this.runtime.printPageCount === normalized) return;
		this.runtime = { ...this.runtime, printPageCount: normalized };
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
	private validatedUniqueName(requestedName: string, excludedProjectId?: string): string {
		const name = requestedName.trim();
		if (!name) throw new ProjectNameValidationError('Project names cannot be blank.');
		if (name.length > 200 || containsControlCharacter(name)) throw new ProjectNameValidationError('Use a project name of 200 characters or fewer without control characters.');
		if (this.registry.projects.some((project) => project.id !== excludedProjectId && project.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0)) {
			throw new ProjectNameValidationError(`A project named "${name}" already exists.`);
		}
		return name;
	}
	private nextAvailableProjectId(): string {
		for (let attempt = 0; attempt < 100; attempt += 1) {
			const id = this.createId();
			if (id && !this.registry.projects.some((project) => project.id === id)) return id;
		}
		return defaultProjectIdWithSuffix(new Set(this.registry.projects.map((project) => project.id)));
	}
	private refreshRenderedHtml(): void {
		const project = this.activeProject;
		if (!project || !this.runtime.book) return;
		const design = this.runtime.previewDesign ?? project.design;
		this.runtime = { ...this.runtime, renderedHtml: renderBookPreviewDocument(this.runtime.book, design, project.preview.readerScale, design.elements?.blockquote ? this.elementArtifact : null) };
	}
	setElementArtifact(artifact: ElementArtifact | null): void {
		if (artifact === this.elementArtifact) return;
		this.elementArtifact = artifact; this.refreshRenderedHtml(); this.commit(false);
	}
	setElementDiagnostic(message: string | null): void {
		if ((this.runtime.elementDiagnostic ?? null) === message) return;
		this.runtime = { ...this.runtime, elementDiagnostic: message }; this.commit(false);
	}
	async commitElementRegistry(next: BookProjectRegistry, expectedRevision: number): Promise<void> {
		const candidate = cloneRegistry(next);
		const transaction = this.persistQueue.catch(() => undefined).then(async () => {
			if (this.registryRevision !== expectedRevision) throw new Error('Projects changed during confirmation. Please try again.');
			await this.persist(candidate);
			if (this.registryRevision !== expectedRevision) {
				await this.persist(cloneRegistry(this.registry));
				throw new Error('Projects changed while saving. Element change was canceled.');
			}
			this.registry = candidate; this.registryRevision++; this.elementArtifact = null; this.runtime = { ...this.runtime, previewDesign: null }; this.refreshRenderedHtml(); this.commit(false);
		});
		this.persistQueue = transaction.catch(() => undefined);
		return transaction;
	}
	private commit(shouldPersist: boolean): void {
		if (shouldPersist) this.registryRevision++;
		this.revision += 1;
		this.snapshot = this.createSnapshot();
		for (const listener of this.listeners) listener();
		if (shouldPersist) {
			const registry = cloneRegistry(this.registry);
			this.persistQueue = this.persistQueue.catch(() => undefined).then(() => this.persist(registry));
			void this.persistQueue.catch((error: unknown) => { console.error('Book Designer could not persist project settings.', error); });
		}
	}
	private createSnapshot(): BookProjectSnapshot {
		return {
			registry: cloneRegistry(this.registry),
			activeProject: cloneProject(this.activeProject),
			runtime: { ...this.runtime, previewDesign: this.runtime.previewDesign ? cloneDesign(this.runtime.previewDesign) : null, previewPrintSettings: this.runtime.previewPrintSettings ? { ...this.runtime.previewPrintSettings } : null },
			revision: this.revision,
			registryRevision: this.registryRevision,
		};
	}
	private get activeProject(): BookProject | null { return this.registry.projects.find((project) => project.id === this.registry.activeProjectId) ?? null; }
}

export function renderPreviewState(snapshot: BookProjectSnapshot): PreviewRenderState {
	const project = snapshot.activeProject;
	return {
		title: project?.metadata.title.trim() || 'Untitled book', author: project?.metadata.author.trim() || 'Unknown author',
		themeLabel: project ? findThemeOption(project.design.customThemeId ?? project.design.themeId, snapshot.registry.themes)?.name ?? THEME_LABELS[project.design.themeId] : '', typographyLabel: project ? TYPOGRAPHY_SCALE_LABELS[project.design.typographyScale] : '',
		chapterStyleLabel: project ? CHAPTER_STYLE_LABELS[project.design.chapterStyleId] : '', sceneBreakLabel: project ? SCENE_BREAK_LABELS[project.design.sceneBreakId] : '',
		hasManuscript: snapshot.runtime.status === 'ready', revision: snapshot.revision,
	};
}

function normalizeProject(value: unknown, defaultDevice: PreviewDeviceId): BookProject[] {
	if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !isRecord(value.source) || value.source.type !== 'folder' || typeof value.source.path !== 'string') return [];
	const metadata = isRecord(value.metadata) ? value.metadata : {};
	const design = isRecord(value.design) ? value.design : {};
	const preview = isRecord(value.preview) ? value.preview : {};
	return [{ id: value.id, name: value.name, source: { type: 'folder', path: value.source.path }, metadata: {
		title: stringOr(metadata.title, ''), author: stringOr(metadata.author, ''), language: stringOr(metadata.language, 'english'), publisher: stringOr(metadata.publisher, ''), isbn: stringOr(metadata.isbn, ''),
	}, design: normalizeProjectDesign(design), print: normalizePrintSettings(value.print, preview.printColorMode), preview: normalizePreviewState(preview, defaultDevice) }];
}
function normalizeProjectDesign(design: Record<string, unknown>): BookProjectDesign {
	let elements: ElementAssignments = {};
	try { elements = parseAssignments(design.elements); } catch { /* Corrupt assignments cannot enter the runtime. */ }
	const themeId = stringOr(design.themeId, '');
	const typographyScale = stringOr(design.typographyScale, '');
	const chapterStyleId = stringOr(design.chapterStyleId, '');
	const firstParagraphStyleId = stringOr(design.firstParagraphStyleId, '');
	const sceneBreakId = stringOr(design.sceneBreakId, '');
	return {
		themeId: isThemeId(themeId) ? themeId : 'classic',
		...(elements.blockquote ? { elements } : {}),
		customThemeId: typeof design.customThemeId === 'string' && validCustomThemeId(design.customThemeId) ? design.customThemeId : null,
		typographyScale: isTypographyScale(typographyScale) ? typographyScale : 'comfortable',
		chapterStyleId: isChapterStyleId(chapterStyleId) ? chapterStyleId : 'quiet',
		firstParagraphStyleId: isFirstParagraphStyleId(firstParagraphStyleId) ? firstParagraphStyleId : 'indented',
		sceneBreakId: isSceneBreakId(sceneBreakId) ? sceneBreakId : 'space',
	};
}
function isPreviewDevice(value: unknown): value is PreviewDeviceId { return typeof value === 'string' && ['phone-narrow', 'phone', 'ereader-6', 'ereader-large', 'tablet', 'custom', 'kindle-paperwhite', MOTOROLA_RAZR_ID, 'print', 'imported'].includes(value); }
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
	printPaginationMode: 'fast',
	printFacingPages: false,
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
		printPaginationMode: preview.printPaginationMode,
		printFacingPages: preview.printFacingPages,
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
		printPaginationMode: isPrintPaginationMode(value.printPaginationMode) ? value.printPaginationMode : 'fast',
		printFacingPages: typeof value.printFacingPages === 'boolean' ? value.printFacingPages : false,
	};
}
function isDisplayTheme(value: unknown): value is DisplayTheme { return typeof value === 'string' && DISPLAY_THEMES.includes(value as DisplayTheme); }
function isEInkRenderMode(value: unknown): value is EInkRenderMode { return typeof value === 'string' && EINK_RENDER_MODES.includes(value as EInkRenderMode); }
function isColorSoftTone(value: unknown): value is ColorSoftTone { return typeof value === 'string' && COLORSOFT_TONES.includes(value as ColorSoftTone); }
function isPrintPaginationMode(value: unknown): value is PrintPaginationMode { return typeof value === 'string' && PRINT_PAGINATION_MODES.includes(value as PrintPaginationMode); }
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
	return { deviceId: resolvedDeviceId, ...content, deviceContentSettings: { [previewContentKey({ deviceId: resolvedDeviceId, importedMockupId: null })]: content }, deviceScale: 100, autoDeviceScale: true, customDeviceWidth: 390, customDeviceHeight: 844, mockupId: 'plain', importedMockupId: null, mockupPostures: {}, mode: deviceId === 'ereader-6' || deviceId === 'print' ? 'paged' : 'continuous', orientation: 'portrait', pageIndex: 0, activeSectionId: null, scrollTop: 0 };
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
		mode: isPreviewMode(value.mode) ? value.mode : deviceId === 'ereader-6' || deviceId === 'print' ? 'paged' : 'continuous',
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
function normalizeCustomThemes(value: unknown): CustomBookTheme[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	return value.flatMap((candidate) => {
		if (!isRecord(candidate) || typeof candidate.id !== 'string' || !validCustomThemeId(candidate.id) || seen.has(candidate.id)
			|| typeof candidate.name !== 'string' || !candidate.name.trim() || candidate.name.length > 200 || !isRecord(candidate.design)) return [];
		const design = normalizeProjectDesign(candidate.design);
		seen.add(candidate.id);
		return [{ id: candidate.id, name: candidate.name.trim(), baseThemeId: design.themeId, design: { ...design, customThemeId: candidate.id } }];
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
function cloneProject(project: BookProject | null): BookProject | null { return project ? { ...project, source: { ...project.source }, metadata: { ...project.metadata }, design: cloneDesign(project.design), print: { ...project.print }, preview: { ...project.preview, mockupPostures: { ...project.preview.mockupPostures }, deviceContentSettings: Object.fromEntries(Object.entries(project.preview.deviceContentSettings).map(([key, value]) => [key, { ...value }])) } } : null; }
function cloneImportedMockup(mockup: ImportedHtmlMockup): ImportedHtmlMockup {
	return { ...mockup, color: { ...mockup.color }, display: { ...mockup.display }, postures: mockup.postures.map((posture) => ({ ...posture, frame: posture.frame ? { ...posture.frame } : null })) };
}
function cloneCustomTheme(theme: CustomBookTheme): CustomBookTheme { return { ...theme, design: cloneDesign(theme.design) }; }
function cloneRegistry(registry: BookProjectRegistry): BookProjectRegistry { return { version: 1, activeProjectId: registry.activeProjectId, projects: registry.projects.map((project) => cloneProject(project) as BookProject), mockups: registry.mockups.map(cloneImportedMockup), themes: registry.themes.map(cloneCustomTheme), elements: (registry.elements ?? []).map(cloneEntry) }; }
function resetTransientPreview(preview: BookProjectPreviewState): BookProjectPreviewState {
	return { ...preview, pageIndex: 0, activeSectionId: null, scrollTop: 0 };
}
function projectMockupIds(project: BookProject): Set<string> {
	const ids = new Set<string>();
	if (project.preview.importedMockupId) ids.add(project.preview.importedMockupId);
	for (const id of Object.keys(project.preview.mockupPostures)) ids.add(id);
	for (const key of Object.keys(project.preview.deviceContentSettings)) {
		if (key.startsWith('imported:')) ids.add(key.slice('imported:'.length));
	}
	return ids;
}
function mergeImportedMockups(
	existingMockups: ImportedHtmlMockup[],
	incomingMockups: ImportedHtmlMockup[],
	incomingProject: BookProject,
): { project: BookProject; mockups: ImportedHtmlMockup[] } {
	const mockups = existingMockups.map(cloneImportedMockup);
	const idMap = new Map<string, string>();
	for (const incoming of incomingMockups) {
		const existing = mockups.find((mockup) => mockup.id === incoming.id);
		if (!existing) {
			mockups.push(cloneImportedMockup(incoming));
			idMap.set(incoming.id, incoming.id);
			continue;
		}
		if (JSON.stringify(existing) === JSON.stringify(incoming)) {
			idMap.set(incoming.id, incoming.id);
			continue;
		}
		const id = nextImportedMockupId(incoming.id, new Set(mockups.map((mockup) => mockup.id)));
		mockups.push({ ...cloneImportedMockup(incoming), id });
		idMap.set(incoming.id, id);
	}
	return { project: remapProjectMockups(incomingProject, idMap), mockups };
}
function remapProjectMockups(project: BookProject, idMap: Map<string, string>): BookProject {
	const cloned = cloneProject(project) as BookProject;
	const importedMockupId = cloned.preview.importedMockupId
		? idMap.get(cloned.preview.importedMockupId) ?? cloned.preview.importedMockupId
		: null;
	const mockupPostures = Object.fromEntries(Object.entries(cloned.preview.mockupPostures).map(([id, posture]) => [idMap.get(id) ?? id, posture]));
	const deviceContentSettings = Object.fromEntries(Object.entries(cloned.preview.deviceContentSettings).map(([key, settings]) => {
		if (!key.startsWith('imported:')) return [key, settings];
		const id = key.slice('imported:'.length);
		return [`imported:${idMap.get(id) ?? id}`, settings];
	}));
	return { ...cloned, preview: { ...cloned.preview, importedMockupId, mockupPostures, deviceContentSettings } };
}
function mergeCustomThemes(
	existingThemes: CustomBookTheme[],
	incomingThemes: CustomBookTheme[],
	incomingProject: BookProject,
): { project: BookProject; themes: CustomBookTheme[] } {
	const themes = existingThemes.map(cloneCustomTheme);
	let project = cloneProject(incomingProject) as BookProject;
	for (const incoming of incomingThemes) {
		const existing = themes.find((theme) => theme.id === incoming.id);
		if (!existing) {
			themes.push(cloneCustomTheme(incoming));
			continue;
		}
		if (sameDesign(existing.design, incoming.design) && existing.name === incoming.name) continue;
		const id = nextCustomThemeId(new Set(themes.map((theme) => theme.id)));
		const remapped = { ...cloneCustomTheme(incoming), id, design: { ...incoming.design, customThemeId: id } };
		themes.push(remapped);
		if (project.design.customThemeId === incoming.id) project = { ...project, design: { ...project.design, customThemeId: id } };
	}
	return { project, themes };
}
function nextImportedMockupId(baseId: string, used: Set<string>): string {
	for (let suffix = 2; ; suffix += 1) {
		const candidate = `${baseId}-imported-${suffix}`;
		if (!used.has(candidate)) return candidate;
	}
}
function nextProjectName(folderName: string, projects: BookProject[]): string {
	const used = new Set(projects.map((project) => project.name.toLocaleLowerCase()));
	if (!used.has(folderName.toLocaleLowerCase())) return folderName;
	for (let suffix = 2; ; suffix += 1) {
		const candidate = `${folderName} ${suffix}`;
		if (!used.has(candidate.toLocaleLowerCase())) return candidate;
	}
}
function nextThemeName(requestedName: string, themes: CustomBookTheme[]): string {
	const used = new Set([...BUILT_IN_THEME_OPTIONS.map((theme) => theme.name), ...themes.map((theme) => theme.name)].map((name) => name.toLocaleLowerCase()));
	if (!used.has(requestedName.toLocaleLowerCase())) return requestedName;
	for (let suffix = 2; ; suffix += 1) {
		const candidate = `${requestedName} ${suffix}`;
		if (!used.has(candidate.toLocaleLowerCase())) return candidate;
	}
}
function validatedThemeName(requestedName: string, themes: CustomBookTheme[], excludedThemeId: string): string {
	const name = requestedName.trim();
	if (!name || name.length > 200 || containsControlCharacter(name)) throw new ProjectNameValidationError('Use a non-empty theme name of 200 characters or fewer.');
	const duplicate = [...BUILT_IN_THEME_OPTIONS.map((theme) => ({ id: theme.id, name: theme.name })), ...themes]
		.some((theme) => theme.id !== excludedThemeId && theme.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0);
	if (duplicate) throw new ProjectNameValidationError(`A theme named "${name}" already exists.`);
	return name;
}
function nextCustomThemeId(used: Set<string>): string {
	for (;;) {
		const candidate = `theme-${defaultProjectId()}`;
		if (!used.has(candidate)) return candidate;
	}
}
function validCustomThemeId(value: string): boolean { return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(value); }
function sameDesign(left: BookProjectDesign | null, right: BookProjectDesign | null): boolean {
	return left === right || Boolean(left && right
		&& left.themeId === right.themeId
		&& left.customThemeId === right.customThemeId
		&& left.typographyScale === right.typographyScale
		&& left.chapterStyleId === right.chapterStyleId
		&& left.firstParagraphStyleId === right.firstParagraphStyleId
		&& left.sceneBreakId === right.sceneBreakId && sameElements(left.elements, right.elements));
}
function sameNullablePrintSettings(left: BookPrintSettings | null, right: BookPrintSettings | null): boolean {
	return left === right || Boolean(left && right && samePrintSettings(left, right));
}
function defaultProjectIdWithSuffix(used: Set<string>): string {
	const base = defaultProjectId();
	if (!used.has(base)) return base;
	for (let suffix = 2; ; suffix += 1) {
		const candidate = `${base}-${suffix}`;
		if (!used.has(candidate)) return candidate;
	}
}
function containsControlCharacter(value: string): boolean {
	return Array.from(value).some((character) => character.charCodeAt(0) < 32);
}
function defaultProjectId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
