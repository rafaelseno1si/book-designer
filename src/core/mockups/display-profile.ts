/** Physical screen technology declared by an imported or built-in device. */
export const DISPLAY_CATEGORIES = ['oled-lcd', 'eink'] as const;
export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

export interface DeviceDisplayProfile {
	category: DisplayCategory;
}

export const DEFAULT_DISPLAY_PROFILE: DeviceDisplayProfile = { category: 'oled-lcd' };

/** Built-in reader shells that intentionally emulate reflective E-ink panels. */
export function builtInDisplayCategory(deviceId: string | undefined): DisplayCategory {
	return deviceId === 'kindle-paperwhite' || deviceId === 'ereader-6' || deviceId === 'ereader-large'
		? 'eink'
		: 'oled-lcd';
}

export function normalizeDisplayProfile(value: unknown): DeviceDisplayProfile | null {
	if (!isRecord(value) || !DISPLAY_CATEGORIES.includes(value.category as DisplayCategory)) return null;
	return { category: value.category as DisplayCategory };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
