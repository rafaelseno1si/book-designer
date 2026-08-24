import { describe, expect, it } from 'vitest';
import { builtInDisplayCategory, normalizeDisplayProfile } from './display-profile';

describe('device display profiles', () => {
	it('classifies the built-in Paperwhite as E-ink and Razr as OLED/LCD', () => {
		expect(builtInDisplayCategory('kindle-paperwhite')).toBe('eink');
		expect(builtInDisplayCategory('motorola-razr')).toBe('oled-lcd');
	});

	it('only accepts declared display categories for imports', () => {
		expect(normalizeDisplayProfile({ category: 'eink' })).toEqual({ category: 'eink' });
		expect(normalizeDisplayProfile({ category: 'print' })).toBeNull();
	});
});
