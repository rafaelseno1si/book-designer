export type ElementCategory = 'block.blockquote';
export type ElementPlacement = 'normal-flow';
export type ElementContract = 'wrap-content';
export type ElementOutput = 'xhtml';
export type ElementSettings = Record<string, string | number | boolean>;
export type SettingRule =
	| { type: 'boolean' }
	| { type: 'number'; minimum: number; maximum: number }
	| { type: 'string'; maxLength: number; enum?: string[]; format?: 'color-or-theme' };
export interface ElementPreset {
	id: string;
	name: string;
	description?: string;
	settings: ElementSettings;
}
export interface ElementManifest {
	format: 'book-designer-element';
	version: 1;
	apiVersion: 1;
	id: string;
	name: string;
	description?: string;
	packageVersion: string;
	category: ElementCategory;
	placement: ElementPlacement;
	contract: ElementContract;
	outputs: ElementOutput[];
	defaults: ElementSettings;
	settingsSchema: Record<string, SettingRule>;
	presets: ElementPreset[];
}
/** Ingestion boundary: future archive importers must produce validated package-relative entries. */
export interface ElementPackage {
	entryPath: 'index.html';
	files: { 'index.html': string };
}
export interface InspectedElement {
	package: ElementPackage;
	manifest: ElementManifest;
	editorHtml: string;
}
export interface ElementAssignment {
	elementId: string;
	presetId: string;
	settingsOverrides: ElementSettings;
}
export interface ElementAssignments {
	blockquote?: ElementAssignment;
}
export interface ElementLibraryEntry {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	package: ElementPackage;
	previousPackage?: ElementPackage;
	/** Recomputed at ingestion; never an approval grant. Optional for legacy in-memory entries. */
	contentDigest?: string;
}
export interface ElementContext {
	target: 'ebook' | 'print';
	language: string;
	slot: ElementCategory;
	bodyFontFamily: string;
	textColor: string;
	accentColor: string;
	print?: {
		unit: 'in';
		width: number;
		height: number;
		inside: number;
		outside: number;
		top: number;
		bottom: number;
	};
}
export interface ElementRenderResult {
	xhtml: string;
	css: string;
}
export interface ElementArtifact {
	key: string;
	before: string;
	after: string;
	css: string;
}
export interface ElementDiagnostic {
	code: string;
	message: string;
	elementId?: string;
}
export const BUILTIN_BLOCKQUOTE_ID = 'builtin.basic-blockquote';
export const ELEMENT_LIMITS = {
	package: 512 * 1024,
	manifest: 32 * 1024,
	settings: 16 * 1024,
	message: 128 * 1024,
	output: 32 * 1024,
	handshakeMs: 3000,
	requestMs: 5000,
} as const;
