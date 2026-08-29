export const PRINT_UNITS = ['in', 'cm'] as const;
export type PrintUnit = (typeof PRINT_UNITS)[number];
export const PRINT_PROVIDERS = ['generic', 'amazon-kdp', 'ingramspark', 'lulu'] as const;
export type PrintProvider = (typeof PRINT_PROVIDERS)[number];
export const CHAPTER_START_MODES = ['first-recto', 'every-recto'] as const;
export type ChapterStartMode = (typeof CHAPTER_START_MODES)[number];
export const PAGE_NUMBER_STARTS = ['initial-page', 'first-chapter'] as const;
export type PageNumberStart = (typeof PAGE_NUMBER_STARTS)[number];
export const PRINT_IMAGE_MODES = ['black-white', 'color'] as const;
export type PrintImageMode = (typeof PRINT_IMAGE_MODES)[number];

export interface BookPrintSettings {
	unit: PrintUnit;
	trimPresetId: string;
	trimWidthIn: number;
	trimHeightIn: number;
	provider: PrintProvider;
	safeInsideIn: number;
	safeOutsideIn: number;
	contentInsideIn: number;
	contentOutsideIn: number;
	headerTotalIn: number;
	headerGapIn: number;
	footerTotalIn: number;
	footerGapIn: number;
	fontSizePt: number;
	lineHeight: number;
	chapterStart: ChapterStartMode;
	pageNumberStart: PageNumberStart;
	imageMode: PrintImageMode;
	showMarginGuides: boolean;
}

export interface PrintTrimPreset {
	id: string;
	label: string;
	widthIn: number;
	heightIn: number;
	group: 'popular' | 'additional' | 'international' | 'mass-market' | 'large-print';
}

export const PRINT_TRIM_PRESETS: PrintTrimPreset[] = [
	{ id: '5x8', label: '5 × 8', widthIn: 5, heightIn: 8, group: 'popular' },
	{ id: '5.25x8', label: '5.25 × 8', widthIn: 5.25, heightIn: 8, group: 'popular' },
	{ id: '5.5x8.5', label: '5.5 × 8.5', widthIn: 5.5, heightIn: 8.5, group: 'popular' },
	{ id: '6x9', label: '6 × 9', widthIn: 6, heightIn: 9, group: 'popular' },
	{ id: '5.06x7.81', label: '5.06 × 7.81', widthIn: 5.06, heightIn: 7.81, group: 'additional' },
	{ id: '5.5x8.25', label: '5.5 × 8.25', widthIn: 5.5, heightIn: 8.25, group: 'additional' },
	{ id: '6.14x9.21', label: '6.14 × 9.21', widthIn: 6.14, heightIn: 9.21, group: 'additional' },
	{ id: '4.72x7.48', label: '4.72 × 7.48', widthIn: 4.72, heightIn: 7.48, group: 'international' },
	{ id: '4.92x7.48', label: '4.92 × 7.48', widthIn: 4.92, heightIn: 7.48, group: 'international' },
	{ id: '5.83x8.27', label: '5.83 × 8.27 · A5', widthIn: 5.83, heightIn: 8.27, group: 'international' },
	{ id: '5.31x8.46', label: '5.31 × 8.46', widthIn: 5.31, heightIn: 8.46, group: 'international' },
	{ id: '4.12x6.75', label: '4.12 × 6.75', widthIn: 4.12, heightIn: 6.75, group: 'mass-market' },
	{ id: '4.25x7', label: '4.25 × 7', widthIn: 4.25, heightIn: 7, group: 'mass-market' },
	{ id: '4.37x7', label: '4.37 × 7', widthIn: 4.37, heightIn: 7, group: 'mass-market' },
	{ id: 'large-5.5x8.5', label: '5.5 × 8.5 · large print', widthIn: 5.5, heightIn: 8.5, group: 'large-print' },
	{ id: 'large-6x9', label: '6 × 9 · large print', widthIn: 6, heightIn: 9, group: 'large-print' },
	{ id: 'large-6.14x9.21', label: '6.14 × 9.21 · large print', widthIn: 6.14, heightIn: 9.21, group: 'large-print' },
];

export const DEFAULT_PRINT_SETTINGS: BookPrintSettings = {
	unit: 'in',
	trimPresetId: '5.5x8.5',
	trimWidthIn: 5.5,
	trimHeightIn: 8.5,
	provider: 'generic',
	safeInsideIn: 0.375,
	safeOutsideIn: 0.25,
	contentInsideIn: 0.5,
	contentOutsideIn: 0.5,
	headerTotalIn: 0.625,
	headerGapIn: 0.25,
	footerTotalIn: 0.625,
	footerGapIn: 0.25,
	fontSizePt: 11,
	lineHeight: 1.55,
	chapterStart: 'first-recto',
	pageNumberStart: 'first-chapter',
	imageMode: 'black-white',
	showMarginGuides: false,
};

export const PRINT_PROVIDER_META: Record<PrintProvider, { label: string; sourceUrl: string | null; reviewed: string }> = {
	generic: { label: 'Generic printer', sourceUrl: null, reviewed: '2026-08-29' },
	'amazon-kdp': { label: 'Amazon KDP', sourceUrl: 'https://kdp.amazon.com/en_US/help/topic/G201857950', reviewed: '2026-08-29' },
	ingramspark: { label: 'IngramSpark', sourceUrl: 'https://www.ingramspark.com/hubfs/downloads/file-creation-guide.pdf', reviewed: '2026-08-29' },
	lulu: { label: 'Lulu', sourceUrl: 'https://help.lulu.com/en/support/solutions/articles/64000255590-interior-formatting-the-basics', reviewed: '2026-08-29' },
};

const KDP_TRIMS = new Set(['5x8', '5.06x7.81', '5.25x8', '5.5x8.5', '6x9', '6.14x9.21']);
const INGRAM_TRIMS = new Set(['5x8', '5.06x7.81', '5.25x8', '5.5x8.25', '5.5x8.5', '5.83x8.27', '6x9', '6.14x9.21', '4.72x7.48', '4.25x7', '4.37x7']);

export interface ProviderAssessment {
	trimStatus: 'supported' | 'unsupported' | 'not-evaluated';
	recommendedInsideIn: number | null;
	recommendedOutsideIn: number | null;
	notes: string[];
}

export function assessPrintProvider(settings: BookPrintSettings, pageCount: number | null): ProviderAssessment {
	if (settings.provider === 'generic') return { trimStatus: 'not-evaluated', recommendedInsideIn: 0.5, recommendedOutsideIn: 0.5, notes: ['Generic guidance is not tied to a production service.'] };
	const presetId = matchingPresetId(settings.trimWidthIn, settings.trimHeightIn);
	if (settings.provider === 'amazon-kdp') {
		const inside = pageCount === null ? null : pageCount <= 150 ? 0.375 : pageCount <= 300 ? 0.5 : pageCount <= 500 ? 0.625 : pageCount <= 700 ? 0.75 : 0.875;
		return {
			trimStatus: presetId && KDP_TRIMS.has(presetId) ? 'supported' : 'unsupported',
			recommendedInsideIn: inside,
			recommendedOutsideIn: 0.25,
			notes: inside === null ? ['Run the complete print preview to calculate the page-count-based gutter.'] : [`Recommendation uses the current ${pageCount}-page count.`],
		};
	}
	if (settings.provider === 'lulu') {
		const inside = pageCount === null ? null : pageCount <= 60 ? 0.5 : pageCount <= 150 ? 0.625 : pageCount <= 400 ? 1 : pageCount <= 600 ? 1.125 : 1.25;
		return {
			trimStatus: 'not-evaluated',
			recommendedInsideIn: inside,
			recommendedOutsideIn: 0.5,
			notes: inside === null ? ['Run the complete print preview to calculate the page-count-based gutter.'] : [`Recommendation uses the current ${pageCount}-page count.`],
		};
	}
	return {
		trimStatus: presetId && INGRAM_TRIMS.has(presetId) ? 'supported' : 'unsupported',
		recommendedInsideIn: null,
		recommendedOutsideIn: null,
		notes: ['Trim availability is checked; margin values are not evaluated for this profile.'],
	};
}

export function applyProviderRecommendations(settings: BookPrintSettings, assessment: ProviderAssessment): BookPrintSettings {
	const safeInsideIn = assessment.recommendedInsideIn ?? settings.safeInsideIn;
	const safeOutsideIn = assessment.recommendedOutsideIn ?? settings.safeOutsideIn;
	return {
		...settings,
		safeInsideIn,
		safeOutsideIn,
		contentInsideIn: Math.max(settings.contentInsideIn, safeInsideIn),
		contentOutsideIn: Math.max(settings.contentOutsideIn, safeOutsideIn),
	};
}

export function validatePrintSettings(settings: BookPrintSettings): string[] {
	const errors: string[] = [];
	if (!inRange(settings.trimWidthIn, 3, 12) || !inRange(settings.trimHeightIn, 3, 12)) errors.push('Trim width and height must be between 3 and 12 inches.');
	for (const [label, value] of [['Safe inside', settings.safeInsideIn], ['Safe outside', settings.safeOutsideIn], ['Content inside', settings.contentInsideIn], ['Content outside', settings.contentOutsideIn]] as const) {
		if (!inRange(value, 0, 6)) errors.push(`${label} margin must be between 0 and 6 inches.`);
	}
	if (settings.safeInsideIn + settings.safeOutsideIn >= settings.trimWidthIn) errors.push('Safe-zone margins must leave usable page width.');
	if (settings.contentInsideIn + settings.contentOutsideIn >= settings.trimWidthIn) errors.push('Content margins must leave usable page width.');
	if (settings.contentInsideIn < settings.safeInsideIn || settings.contentOutsideIn < settings.safeOutsideIn) errors.push('Content margins must stay inside the printer-safe zone.');
	if (!inRange(settings.headerTotalIn, 0, 6) || !inRange(settings.footerTotalIn, 0, 6)) errors.push('Header and footer space must be between 0 and 6 inches.');
	if (!inRange(settings.headerGapIn, 0, settings.headerTotalIn)) errors.push('Space above the header cannot exceed the total header space.');
	if (!inRange(settings.footerGapIn, 0, settings.footerTotalIn)) errors.push('Space below the footer cannot exceed the total footer space.');
	if (settings.headerTotalIn + settings.footerTotalIn >= settings.trimHeightIn) errors.push('Header and footer spaces must leave usable page height.');
	if (!inRange(settings.fontSizePt, 7, 24)) errors.push('Print font size must be between 7 and 24 points.');
	if (!inRange(settings.lineHeight, 1, 2.5)) errors.push('Line spacing must be between 1 and 2.5.');
	return errors;
}

export function normalizePrintSettings(value: unknown, legacyImageMode?: unknown): BookPrintSettings {
	const source = isRecord(value) ? value : {};
	const imageMode = isOneOf(source.imageMode, PRINT_IMAGE_MODES)
		? source.imageMode
		: isOneOf(legacyImageMode, PRINT_IMAGE_MODES) ? legacyImageMode : DEFAULT_PRINT_SETTINGS.imageMode;
	return {
		unit: isOneOf(source.unit, PRINT_UNITS) ? source.unit : DEFAULT_PRINT_SETTINGS.unit,
		trimPresetId: typeof source.trimPresetId === 'string' ? source.trimPresetId : DEFAULT_PRINT_SETTINGS.trimPresetId,
		trimWidthIn: finiteOr(source.trimWidthIn, DEFAULT_PRINT_SETTINGS.trimWidthIn),
		trimHeightIn: finiteOr(source.trimHeightIn, DEFAULT_PRINT_SETTINGS.trimHeightIn),
		provider: isOneOf(source.provider, PRINT_PROVIDERS) ? source.provider : DEFAULT_PRINT_SETTINGS.provider,
		safeInsideIn: finiteOr(source.safeInsideIn, DEFAULT_PRINT_SETTINGS.safeInsideIn),
		safeOutsideIn: finiteOr(source.safeOutsideIn, DEFAULT_PRINT_SETTINGS.safeOutsideIn),
		contentInsideIn: finiteOr(source.contentInsideIn, DEFAULT_PRINT_SETTINGS.contentInsideIn),
		contentOutsideIn: finiteOr(source.contentOutsideIn, DEFAULT_PRINT_SETTINGS.contentOutsideIn),
		headerTotalIn: finiteOr(source.headerTotalIn, DEFAULT_PRINT_SETTINGS.headerTotalIn),
		headerGapIn: finiteOr(source.headerGapIn, DEFAULT_PRINT_SETTINGS.headerGapIn),
		footerTotalIn: finiteOr(source.footerTotalIn, DEFAULT_PRINT_SETTINGS.footerTotalIn),
		footerGapIn: finiteOr(source.footerGapIn, DEFAULT_PRINT_SETTINGS.footerGapIn),
		fontSizePt: finiteOr(source.fontSizePt, DEFAULT_PRINT_SETTINGS.fontSizePt),
		lineHeight: finiteOr(source.lineHeight, DEFAULT_PRINT_SETTINGS.lineHeight),
		chapterStart: isOneOf(source.chapterStart, CHAPTER_START_MODES) ? source.chapterStart : DEFAULT_PRINT_SETTINGS.chapterStart,
		pageNumberStart: isOneOf(source.pageNumberStart, PAGE_NUMBER_STARTS) ? source.pageNumberStart : DEFAULT_PRINT_SETTINGS.pageNumberStart,
		imageMode,
		showMarginGuides: typeof source.showMarginGuides === 'boolean' ? source.showMarginGuides : DEFAULT_PRINT_SETTINGS.showMarginGuides,
	};
}

export function inchesToUnit(value: number, unit: PrintUnit): number { return unit === 'cm' ? value * 2.54 : value; }
export function unitToInches(value: number, unit: PrintUnit): number { return unit === 'cm' ? value / 2.54 : value; }
export function roundPrintValue(value: number): number { return Math.round(value * 1000) / 1000; }
export function samePrintSettings(left: BookPrintSettings, right: BookPrintSettings): boolean { return JSON.stringify(left) === JSON.stringify(right); }
export function printPreviewDimensions(settings: Pick<BookPrintSettings, 'trimWidthIn' | 'trimHeightIn'>, height = 980): { width: number; height: number } {
	return { width: Math.max(220, Math.round(height * settings.trimWidthIn / settings.trimHeightIn)), height };
}

export function printPageInsets(settings: BookPrintSettings, side: 'recto' | 'verso') {
	return side === 'recto'
		? { leftIn: settings.contentInsideIn, rightIn: settings.contentOutsideIn, safeLeftIn: settings.safeInsideIn, safeRightIn: settings.safeOutsideIn }
		: { leftIn: settings.contentOutsideIn, rightIn: settings.contentInsideIn, safeLeftIn: settings.safeOutsideIn, safeRightIn: settings.safeInsideIn };
}
export function shouldInsertRectoBlank(nextPageIndex: number, mode: ChapterStartMode): boolean {
	return mode === 'every-recto' && nextPageIndex % 2 === 1;
}
export function visiblePrintPageNumber(pageIndex: number, firstChapterPageIndex: number, start: PageNumberStart): number | null {
	if (start === 'first-chapter' && pageIndex < firstChapterPageIndex) return null;
	return start === 'first-chapter' ? pageIndex - firstChapterPageIndex + 1 : pageIndex + 1;
}

function matchingPresetId(width: number, height: number): string | null {
	return PRINT_TRIM_PRESETS.find((preset) => Math.abs(preset.widthIn - width) < 0.005 && Math.abs(preset.heightIn - height) < 0.005)?.id.replace(/^large-/, '') ?? null;
}
function inRange(value: number, minimum: number, maximum: number): boolean { return Number.isFinite(value) && value >= minimum && value <= maximum; }
function finiteOr(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] { return typeof value === 'string' && values.includes(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
