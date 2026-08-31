import { normalizeDisplayProfile } from '../core/mockups/display-profile';
import { cloneDesign, parseAssignments, resolveElementSettings, validateSettings } from '../core/elements/settings';
import { inspectElementPackage } from '../core/elements/manifest';
import type { ElementLibraryEntry } from '../core/elements/types';
import { BUILTIN_ELEMENT, cloneEntry, parseLibraryEntry, referencedElementIds } from './elements/library';
import {
	normalizeMockupColorConfig,
	normalizeMockupPostures,
	type ImportedHtmlMockup,
} from '../core/mockups/html-mockup-import';
import {
	isChapterStyleId,
	isSceneBreakId,
	isThemeId,
	isTypographyScale,
	normalizeProjectRegistry,
	type BookProject,
	type BookProjectPreviewState,
} from './project-store';
import type { CustomBookTheme } from './theme-catalog';
import { normalizePrintSettings, validatePrintSettings } from './print-settings';

export const BOOK_DESIGNER_PROJECT_FORMAT = 'book-designer-project';
export const BOOK_DESIGNER_PROJECT_FILE_VERSION = 3;
export const BOOK_DESIGNER_PROJECT_FILE_EXTENSION = '.book-designer.json';
export const MAX_PROJECT_FILE_BYTES = 5_000_000;

const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 200;
const MAX_TEXT_LENGTH = 2_000;
const MAX_PATH_LENGTH = 1_024;
const MAX_MOCKUPS = 24;
const MAX_MOCKUP_HTML_LENGTH = 1_000_000;

export type DurablePreviewState = Omit<
	BookProjectPreviewState,
	'pageIndex' | 'activeSectionId' | 'scrollTop'
>;

export interface PortableBookProject extends Omit<BookProject, 'preview'> {
	preview: DurablePreviewState;
}

export interface BookDesignerProjectFileV3 {
	format: typeof BOOK_DESIGNER_PROJECT_FORMAT;
	version: typeof BOOK_DESIGNER_PROJECT_FILE_VERSION;
	project: PortableBookProject;
	mockups: ImportedHtmlMockup[];
	themes: CustomBookTheme[];
	elements: ElementLibraryEntry[];
}

export interface ProjectExportSnapshot {
	warnings?: string[];
	project: BookProject;
	mockups: ImportedHtmlMockup[];
	themes: CustomBookTheme[];
	elements?: ElementLibraryEntry[];
}

export class ProjectFileValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProjectFileValidationError';
	}
}

export function serializeProjectFile(snapshot: ProjectExportSnapshot): string {
	const project = portableProject(snapshot.project);
	const referencedIds = referencedMockupIds(project.preview);
	const mockups = snapshot.mockups
		.filter((mockup) => referencedIds.has(mockup.id))
		.map(cloneMockup)
		.sort((left, right) => left.id.localeCompare(right.id));
	const exportedThemes = snapshot.themes.filter((theme) => theme.id === project.design.customThemeId);
	const elementIds = referencedElementIds(project, exportedThemes);
	const file: BookDesignerProjectFileV3 = {
		format: BOOK_DESIGNER_PROJECT_FORMAT,
		version: BOOK_DESIGNER_PROJECT_FILE_VERSION,
		project,
		mockups,
		elements: (snapshot.elements ?? []).filter((entry) => elementIds.has(entry.id)).map((entry) => { const { previousPackage: _backup, ...portable } = cloneEntry(entry); return portable; }).sort((a, b) => a.id.localeCompare(b.id)),
		themes: snapshot.themes
			.filter((theme) => theme.id === project.design.customThemeId)
			.map((theme) => ({ ...theme, design: cloneDesign(theme.design) }))
			.sort((left, right) => left.id.localeCompare(right.id)),
	};
	const serialized = `${JSON.stringify(file, null, 2)}\n`;
	if (new TextEncoder().encode(serialized).byteLength > MAX_PROJECT_FILE_BYTES) {
		throw new ProjectFileValidationError('This project configuration is larger than the supported 5 MB export limit.');
	}
	return serialized;
}

export function parseProjectFileJson(source: string): ProjectExportSnapshot {
	if (new TextEncoder().encode(source).byteLength > MAX_PROJECT_FILE_BYTES) {
		throw new ProjectFileValidationError('This project file is larger than the supported 5 MB limit.');
	}

	let value: unknown;
	try {
		value = JSON.parse(source) as unknown;
	} catch {
		throw new ProjectFileValidationError('This file does not contain valid JSON.');
	}

	if (!isRecord(value)) throw new ProjectFileValidationError('The project file must contain a JSON object.');
	if (value.format !== BOOK_DESIGNER_PROJECT_FORMAT) {
		throw new ProjectFileValidationError(`Expected format "${BOOK_DESIGNER_PROJECT_FORMAT}".`);
	}
	if (value.version !== 1 && value.version !== 2 && value.version !== BOOK_DESIGNER_PROJECT_FILE_VERSION) {
		if (typeof value.version === 'number' && value.version > BOOK_DESIGNER_PROJECT_FILE_VERSION) {
			throw new ProjectFileValidationError(`Project file version ${value.version} is newer than this version of Book Designer supports.`);
		}
		throw new ProjectFileValidationError('Only Book Designer project-file versions 1, 2 and 3 are supported.');
	}

	const rawProject = validateProjectShape(value.project, value.version);
	const rawMockups = validateMockups(value.mockups);
	const rawThemes = validateThemes(value.themes);
	const elements = validateElements(value.version === 3 ? value.elements : []);
	const rawPreview = rawProject.preview;
	const rawDesign = rawProject.design;
	if (rawPreview.deviceId === 'imported' && typeof rawPreview.importedMockupId === 'string'
		&& !rawMockups.some((mockup) => mockup.id === rawPreview.importedMockupId)) {
		throw new ProjectFileValidationError(`The selected imported mockup "${rawPreview.importedMockupId}" is missing from the file.`);
	}
	if (typeof rawDesign.customThemeId === 'string'
		&& !rawThemes.some((theme) => isRecord(theme) && theme.id === rawDesign.customThemeId)) {
		throw new ProjectFileValidationError(`The selected custom theme "${rawDesign.customThemeId}" is missing from the file.`);
	}

	const registry = normalizeProjectRegistry({
		projects: [{ ...rawProject, preview: { ...rawPreview, pageIndex: 0, activeSectionId: null, scrollTop: 0 } }],
		activeProjectId: rawProject.id,
		mockups: rawMockups,
		themes: rawThemes,
		elements,
	}, 'ereader-6');
	const project = registry.projects[0];
	if (!project) throw new ProjectFileValidationError('The project configuration could not be normalized safely.');
	project.name = project.name.trim();
	project.source.path = normalizePortableVaultPath(project.source.path);
	project.preview = { ...project.preview, pageIndex: 0, activeSectionId: null, scrollTop: 0 };
	const referencedIds = referencedMockupIds(project.preview);
	const themes = registry.themes.filter((theme) => theme.id === project.design.customThemeId);
	const warnings: string[] = [];
	for (const design of [project.design, ...themes.map((theme) => theme.design)]) {
		const assignment = design.elements?.blockquote;
		const entry = assignment ? [BUILTIN_ELEMENT, ...elements].find((entry) => entry.id === assignment.elementId) : null;
		if (assignment && entry) {
			const manifest = inspectElementPackage(entry.package).manifest;
			validateSettings(assignment.settingsOverrides, manifest.settingsSchema, true);
			if (manifest.presets.some((preset) => preset.id === assignment.presetId)) resolveElementSettings(manifest, assignment);
			else warnings.push(`Preset “${assignment.presetId}” is missing from “${entry.name}”. The assignment is retained with standard blockquote fallback.`);
		}
	}
	const elementIds = referencedElementIds(project, themes);
	return {
		project,
		...(warnings.length ? { warnings: [...new Set(warnings)] } : {}),
		elements: elements.filter((entry) => elementIds.has(entry.id)),
		mockups: registry.mockups.filter((mockup) => referencedIds.has(mockup.id)).map(cloneMockup),
		themes: project.design.customThemeId
			? registry.themes.filter((theme) => theme.id === project.design.customThemeId).map((theme) => ({ ...theme, design: cloneDesign(theme.design) }))
			: [],
	};
}

export function safeProjectFilename(projectName: string): string {
	const base = projectName
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9._-]+/g, '-')
		.replace(/^[._-]+|[._-]+$/g, '')
		.toLowerCase()
		.slice(0, 80) || 'book-project';
	return `${base}${BOOK_DESIGNER_PROJECT_FILE_EXTENSION}`;
}

export function normalizePortableVaultPath(path: string): string {
	const normalized = path.trim().replace(/^\/+|\/+$/g, '');
	if (path.length > MAX_PATH_LENGTH || path.includes('\\') || path.includes('\0') || path.includes('//') || /^\//.test(path)) {
		throw new ProjectFileValidationError('The manuscript folder path is not a safe vault-relative path.');
	}
	const segments = normalized.split('/');
	if (segments.some((segment) => segment === '.' || segment === '..' || containsControlCharacter(segment))) {
		throw new ProjectFileValidationError('The manuscript folder path cannot contain ".", "..", or control characters.');
	}
	return normalized;
}

function validateProjectShape(value: unknown, fileVersion: number): Record<string, unknown> & {
	id: string;
	name: string;
	source: Record<string, unknown>;
	metadata: Record<string, unknown>;
	design: Record<string, unknown>;
	preview: Record<string, unknown>;
} {
	if (!isRecord(value)) throw new ProjectFileValidationError('The file must contain one project object.');
	const id = requireSafeId(value.id, 'project ID');
	const name = requireText(value.name, 'project name', MAX_NAME_LENGTH).trim();
	if (!name) throw new ProjectFileValidationError('The project name cannot be blank.');
	if (!isRecord(value.source) || value.source.type !== 'folder' || typeof value.source.path !== 'string') {
		throw new ProjectFileValidationError('The project source must reference a vault folder.');
	}
	const source = { type: 'folder', path: normalizePortableVaultPath(value.source.path) };
	if (!isRecord(value.metadata)) throw new ProjectFileValidationError('The project metadata must be an object.');
	for (const key of ['title', 'author', 'language', 'publisher', 'isbn']) {
		if (value.metadata[key] !== undefined) requireText(value.metadata[key], `metadata.${key}`, MAX_TEXT_LENGTH);
	}
	if (!isRecord(value.design)) throw new ProjectFileValidationError('The project design settings must be an object.');
	validateDesignShape(value.design);
	if (fileVersion >= 2 && !isRecord(value.print)) throw new ProjectFileValidationError('The project print settings must be an object.');
	if (value.print !== undefined) {
		if (!isRecord(value.print)) throw new ProjectFileValidationError('The project print settings must be an object.');
		validatePrintShape(value.print);
		const printErrors = validatePrintSettings(normalizePrintSettings(value.print));
		if (printErrors[0]) throw new ProjectFileValidationError(printErrors[0]);
	}
	if (!isRecord(value.preview)) throw new ProjectFileValidationError('The project preview settings must be an object.');
	validatePreviewShape(value.preview);
	return { ...value, id, name, source, metadata: value.metadata, design: value.design, preview: value.preview };
}

function validatePrintShape(print: Record<string, unknown>): void {
	const stringKeys = ['unit', 'trimPresetId', 'provider', 'chapterStart', 'pageNumberStart', 'imageMode'];
	const numberKeys = ['trimWidthIn', 'trimHeightIn', 'safeInsideIn', 'safeOutsideIn', 'contentInsideIn', 'contentOutsideIn', 'headerTotalIn', 'headerGapIn', 'footerTotalIn', 'footerGapIn', 'fontSizePt', 'lineHeight'];
	for (const key of stringKeys) {
		if (print[key] !== undefined && typeof print[key] !== 'string') throw new ProjectFileValidationError(`print.${key} must be text.`);
	}
	for (const key of numberKeys) {
		if (print[key] !== undefined && (typeof print[key] !== 'number' || !Number.isFinite(print[key]))) throw new ProjectFileValidationError(`print.${key} must be a finite number.`);
	}
	if (print.showMarginGuides !== undefined && typeof print.showMarginGuides !== 'boolean') throw new ProjectFileValidationError('print.showMarginGuides must be true or false.');
}

function validatePreviewShape(preview: Record<string, unknown>): void {
	const stringKeys = ['deviceId', 'frameColor', 'displayTheme', 'einkRenderMode', 'colorSoftTone', 'printColorMode', 'printPaginationMode', 'mockupId', 'mode', 'orientation'];
	const numberKeys = ['readerScale', 'contentWidth', 'contentHeight', 'brightness', 'warmth', 'deviceScale', 'customDeviceWidth', 'customDeviceHeight'];
	const booleanKeys = ['publisherFontSettings', 'printFacingPages', 'autoDeviceScale'];
	for (const key of stringKeys) {
		if (preview[key] !== undefined && typeof preview[key] !== 'string') throw new ProjectFileValidationError(`preview.${key} must be text.`);
	}
	for (const key of numberKeys) {
		if (preview[key] !== undefined && (typeof preview[key] !== 'number' || !Number.isFinite(preview[key]))) throw new ProjectFileValidationError(`preview.${key} must be a finite number.`);
	}
	for (const key of booleanKeys) {
		if (preview[key] !== undefined && typeof preview[key] !== 'boolean') throw new ProjectFileValidationError(`preview.${key} must be true or false.`);
	}
	if (preview.importedMockupId !== undefined && preview.importedMockupId !== null) requireSafeId(preview.importedMockupId, 'imported mockup ID');
	if (preview.deviceContentSettings !== undefined && !isRecord(preview.deviceContentSettings)) throw new ProjectFileValidationError('preview.deviceContentSettings must be an object.');
	if (preview.mockupPostures !== undefined && !isRecord(preview.mockupPostures)) throw new ProjectFileValidationError('preview.mockupPostures must be an object.');
}

function validateMockups(value: unknown): ImportedHtmlMockup[] {
	if (!Array.isArray(value)) throw new ProjectFileValidationError('The project file mockups field must be an array.');
	if (value.length > MAX_MOCKUPS) throw new ProjectFileValidationError(`A project file can contain at most ${MAX_MOCKUPS} imported mockups.`);
	const seen = new Set<string>();
	return value.map((candidate) => {
		if (!isRecord(candidate)) throw new ProjectFileValidationError('Every imported mockup must be an object.');
		const id = requireSafeId(candidate.id, 'mockup ID');
		if (seen.has(id)) throw new ProjectFileValidationError(`The mockup ID "${id}" appears more than once.`);
		seen.add(id);
		const name = requireText(candidate.name, 'mockup name', MAX_NAME_LENGTH).trim();
		const html = requireText(candidate.html, 'mockup HTML', MAX_MOCKUP_HTML_LENGTH);
		if (!name || hasUnsafeMockupHtml(html)) throw new ProjectFileValidationError(`Imported mockup "${id}" contains an invalid name or unsafe HTML.`);
		if (!validDimension(candidate.width) || !validDimension(candidate.height)) throw new ProjectFileValidationError(`Imported mockup "${id}" has unsupported dimensions.`);
		const postures = Array.isArray(candidate.postures) && candidate.postures.length === 0
			? []
			: normalizeMockupPostures(candidate.postures);
		const color = normalizeMockupColorConfig(candidate.color);
		const display = normalizeDisplayProfile(candidate.display);
		if (!postures || !color || !display) throw new ProjectFileValidationError(`Imported mockup "${id}" has malformed settings.`);
		return { id, name, html, width: candidate.width, height: candidate.height, postures, color, display };
	});
}

function validateThemes(value: unknown): unknown[] {
	if (value === undefined) return [];
	if (!Array.isArray(value) || value.length > 50) throw new ProjectFileValidationError('The project themes field must be an array of at most 50 themes.');
	const seen = new Set<string>();
	for (const candidate of value) {
		if (!isRecord(candidate)) throw new ProjectFileValidationError('Every custom theme must be an object.');
		const id = requireSafeId(candidate.id, 'custom theme ID');
		if (seen.has(id)) throw new ProjectFileValidationError(`The custom theme ID "${id}" appears more than once.`);
		seen.add(id);
		if (!requireText(candidate.name, 'custom theme name', MAX_NAME_LENGTH).trim() || !isRecord(candidate.design)) {
			throw new ProjectFileValidationError(`Custom theme "${id}" is malformed.`);
		}
		validateDesignShape(candidate.design);
	}
	return value;
}

function validateElements(value: unknown): ElementLibraryEntry[] {
	if (!Array.isArray(value) || value.length > 32) throw new ProjectFileValidationError('The elements field must contain at most 32 packages.');
	const seen = new Set<string>();
	return value.map((raw: unknown) => {
		const entry = parseLibraryEntry(raw);
		if (seen.has(entry.id)) throw new ProjectFileValidationError(`Duplicate element ID: ${entry.id}.`);
		seen.add(entry.id);
		delete entry.previousPackage;
		return entry;
	});
}

function validateDesignShape(design: Record<string, unknown>): void {
	parseAssignments(design.elements);
	if (typeof design.themeId !== 'string' || !isThemeId(design.themeId)
		|| typeof design.typographyScale !== 'string' || !isTypographyScale(design.typographyScale)
		|| typeof design.chapterStyleId !== 'string' || !isChapterStyleId(design.chapterStyleId)
		|| design.firstParagraphStyleId !== undefined && (typeof design.firstParagraphStyleId !== 'string' || !['indented', 'flush', 'drop-cap'].includes(design.firstParagraphStyleId))
		|| typeof design.sceneBreakId !== 'string' || !isSceneBreakId(design.sceneBreakId)) {
		throw new ProjectFileValidationError('The project contains unsupported design settings.');
	}
	if (design.customThemeId !== undefined && design.customThemeId !== null) requireSafeId(design.customThemeId, 'custom theme ID');
}

function portableProject(project: BookProject): PortableBookProject {
	const { pageIndex: _pageIndex, activeSectionId: _activeSectionId, scrollTop: _scrollTop, ...durablePreview } = project.preview;
	return {
		id: project.id,
		name: project.name,
		source: { ...project.source },
		metadata: { ...project.metadata },
		design: cloneDesign(project.design),
		print: { ...project.print },
		preview: {
			...durablePreview,
			deviceContentSettings: sortRecord(durablePreview.deviceContentSettings, (settings) => ({ ...settings })),
			mockupPostures: sortRecord(durablePreview.mockupPostures, (posture) => posture),
		},
	};
}

function referencedMockupIds(preview: Pick<DurablePreviewState, 'importedMockupId' | 'mockupPostures' | 'deviceContentSettings'>): Set<string> {
	const ids = new Set<string>();
	if (preview.importedMockupId) ids.add(preview.importedMockupId);
	for (const id of Object.keys(preview.mockupPostures)) ids.add(id);
	for (const key of Object.keys(preview.deviceContentSettings)) {
		if (key.startsWith('imported:') && key.length > 'imported:'.length) ids.add(key.slice('imported:'.length));
	}
	return ids;
}

function sortRecord<T, U>(value: Record<string, T>, clone: (item: T) => U): Record<string, U> {
	return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, clone(item)]));
}

function cloneMockup(mockup: ImportedHtmlMockup): ImportedHtmlMockup {
	return {
		...mockup,
		postures: mockup.postures.map((posture) => ({ ...posture, frame: posture.frame ? { ...posture.frame } : null })),
		color: { ...mockup.color },
		display: { ...mockup.display },
	};
}

function requireSafeId(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.length > MAX_ID_LENGTH || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
		throw new ProjectFileValidationError(`The ${label} must use only letters, numbers, dots, underscores, and hyphens.`);
	}
	return value;
}

function requireText(value: unknown, label: string, maximumLength: number): string {
	if (typeof value !== 'string' || value.length > maximumLength || containsControlCharacter(value, true)) {
		throw new ProjectFileValidationError(`The ${label} is missing or contains an unsafe value.`);
	}
	return value;
}

function validDimension(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 200 && value <= 2_000;
}

function hasUnsafeMockupHtml(html: string): boolean {
	return /<\s*(?:script|noscript|base|link|iframe|object|embed)\b/i.test(html)
		|| /\son[a-z]+\s*=/i.test(html)
		|| /javascript\s*:/i.test(html)
		|| /@import\b/i.test(html)
		|| /url\s*\(\s*['"]?\s*(?:https?:|\/\/)/i.test(html);
}

function containsControlCharacter(value: string, allowTextWhitespace = false): boolean {
	return Array.from(value).some((character) => {
		const code = character.charCodeAt(0);
		return code < 32 && (!allowTextWhitespace || code !== 9 && code !== 10 && code !== 13);
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
