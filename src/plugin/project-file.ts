import { normalizeDisplayProfile } from '../core/mockups/display-profile';
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

export const BOOK_DESIGNER_PROJECT_FORMAT = 'book-designer-project';
export const BOOK_DESIGNER_PROJECT_FILE_VERSION = 1;
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

export interface BookDesignerProjectFileV1 {
	format: typeof BOOK_DESIGNER_PROJECT_FORMAT;
	version: typeof BOOK_DESIGNER_PROJECT_FILE_VERSION;
	project: PortableBookProject;
	mockups: ImportedHtmlMockup[];
}

export interface ProjectExportSnapshot {
	project: BookProject;
	mockups: ImportedHtmlMockup[];
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
	const file: BookDesignerProjectFileV1 = {
		format: BOOK_DESIGNER_PROJECT_FORMAT,
		version: BOOK_DESIGNER_PROJECT_FILE_VERSION,
		project,
		mockups,
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
	if (value.version !== BOOK_DESIGNER_PROJECT_FILE_VERSION) {
		if (typeof value.version === 'number' && value.version > BOOK_DESIGNER_PROJECT_FILE_VERSION) {
			throw new ProjectFileValidationError(`Project file version ${value.version} is newer than this version of Book Designer supports.`);
		}
		throw new ProjectFileValidationError('Only Book Designer project-file version 1 is supported.');
	}

	const rawProject = validateProjectShape(value.project);
	const rawMockups = validateMockups(value.mockups);
	const rawPreview = rawProject.preview;
	if (rawPreview.deviceId === 'imported' && typeof rawPreview.importedMockupId === 'string'
		&& !rawMockups.some((mockup) => mockup.id === rawPreview.importedMockupId)) {
		throw new ProjectFileValidationError(`The selected imported mockup "${rawPreview.importedMockupId}" is missing from the file.`);
	}

	const registry = normalizeProjectRegistry({
		projects: [{ ...rawProject, preview: { ...rawPreview, pageIndex: 0, activeSectionId: null, scrollTop: 0 } }],
		activeProjectId: rawProject.id,
		mockups: rawMockups,
	}, 'ereader-6');
	const project = registry.projects[0];
	if (!project) throw new ProjectFileValidationError('The project configuration could not be normalized safely.');
	project.name = project.name.trim();
	project.source.path = normalizePortableVaultPath(project.source.path);
	project.preview = { ...project.preview, pageIndex: 0, activeSectionId: null, scrollTop: 0 };
	const referencedIds = referencedMockupIds(project.preview);
	return {
		project,
		mockups: registry.mockups.filter((mockup) => referencedIds.has(mockup.id)).map(cloneMockup),
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

function validateProjectShape(value: unknown): Record<string, unknown> & {
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
	if (typeof value.design.themeId !== 'string' || !isThemeId(value.design.themeId)
		|| typeof value.design.typographyScale !== 'string' || !isTypographyScale(value.design.typographyScale)
		|| typeof value.design.chapterStyleId !== 'string' || !isChapterStyleId(value.design.chapterStyleId)
		|| typeof value.design.sceneBreakId !== 'string' || !isSceneBreakId(value.design.sceneBreakId)) {
		throw new ProjectFileValidationError('The project contains unsupported design settings.');
	}
	if (!isRecord(value.preview)) throw new ProjectFileValidationError('The project preview settings must be an object.');
	validatePreviewShape(value.preview);
	return { ...value, id, name, source, metadata: value.metadata, design: value.design, preview: value.preview };
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

function portableProject(project: BookProject): PortableBookProject {
	const { pageIndex: _pageIndex, activeSectionId: _activeSectionId, scrollTop: _scrollTop, ...durablePreview } = project.preview;
	return {
		id: project.id,
		name: project.name,
		source: { ...project.source },
		metadata: { ...project.metadata },
		design: { ...project.design },
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
