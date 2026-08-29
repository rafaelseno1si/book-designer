import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PRINT_SETTINGS,
	applyProviderRecommendations,
	assessPrintProvider,
	inchesToUnit,
	normalizePrintSettings,
	printPageInsets,
	printPreviewDimensions,
	shouldInsertRectoBlank,
	visiblePrintPageNumber,
	unitToInches,
	validatePrintSettings,
} from './print-settings';

describe('print settings', () => {
	it('normalizes defaults and migrates the legacy print color mode', () => {
		expect(normalizePrintSettings(undefined)).toEqual(DEFAULT_PRINT_SETTINGS);
		expect(normalizePrintSettings(undefined, 'color').imageMode).toBe('color');
	});

	it('converts display units without changing canonical inches', () => {
		expect(inchesToUnit(6, 'cm')).toBeCloseTo(15.24);
		expect(unitToInches(15.24, 'cm')).toBeCloseTo(6);
	});

	it('derives trim aspect ratio and mirrors physical page insets', () => {
		expect(printPreviewDimensions({ trimWidthIn: 6, trimHeightIn: 9 }, 900)).toEqual({ width: 600, height: 900 });
		const settings = { ...DEFAULT_PRINT_SETTINGS, contentInsideIn: 0.7, contentOutsideIn: 0.4 };
		expect(printPageInsets(settings, 'recto')).toMatchObject({ leftIn: 0.7, rightIn: 0.4 });
		expect(printPageInsets(settings, 'verso')).toMatchObject({ leftIn: 0.4, rightIn: 0.7 });
	});

	it('calculates recto chapter blanks and page-number starts', () => {
		expect(shouldInsertRectoBlank(3, 'every-recto')).toBe(true);
		expect(shouldInsertRectoBlank(4, 'every-recto')).toBe(false);
		expect(shouldInsertRectoBlank(3, 'first-recto')).toBe(false);
		expect(visiblePrintPageNumber(1, 2, 'first-chapter')).toBeNull();
		expect(visiblePrintPageNumber(2, 2, 'first-chapter')).toBe(1);
		expect(visiblePrintPageNumber(2, 2, 'initial-page')).toBe(3);
	});

	it('validates custom trim and usable geometry', () => {
		expect(validatePrintSettings({ ...DEFAULT_PRINT_SETTINGS, trimWidthIn: 2.9 })).toContain('Trim width and height must be between 3 and 12 inches.');
		expect(validatePrintSettings({ ...DEFAULT_PRINT_SETTINGS, contentInsideIn: 3, contentOutsideIn: 3 })).toContain('Content margins must leave usable page width.');
		expect(validatePrintSettings({ ...DEFAULT_PRINT_SETTINGS, contentInsideIn: 0.2 })).toContain('Content margins must stay inside the printer-safe zone.');
		expect(validatePrintSettings({ ...DEFAULT_PRINT_SETTINGS, headerGapIn: 1 })).toContain('Space above the header cannot exceed the total header space.');
	});

	it('uses page-count-aware KDP and Lulu recommendations', () => {
		const kdp = assessPrintProvider({ ...DEFAULT_PRINT_SETTINGS, provider: 'amazon-kdp' }, 320);
		expect(kdp).toMatchObject({ trimStatus: 'supported', recommendedInsideIn: 0.625, recommendedOutsideIn: 0.25 });
		const applied = applyProviderRecommendations({ ...DEFAULT_PRINT_SETTINGS, provider: 'amazon-kdp', contentInsideIn: 0.4 }, kdp);
		expect(applied).toMatchObject({ safeInsideIn: 0.625, contentInsideIn: 0.625 });
		expect(assessPrintProvider({ ...DEFAULT_PRINT_SETTINGS, provider: 'lulu' }, 500).recommendedInsideIn).toBe(1.125);
	});

	it('does not invent IngramSpark margin values', () => {
		expect(assessPrintProvider({ ...DEFAULT_PRINT_SETTINGS, provider: 'ingramspark' }, 200)).toMatchObject({ trimStatus: 'supported', recommendedInsideIn: null, recommendedOutsideIn: null });
	});
});
