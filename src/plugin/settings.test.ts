import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	normalizeBookDesignerSettings,
} from './settings';

describe('normalizeBookDesignerSettings', () => {
	it('returns defaults for missing persisted data', () => {
		expect(normalizeBookDesignerSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeBookDesignerSettings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it('rejects invalid device values', () => {
		expect(
			normalizeBookDesignerSettings({
				defaultPreviewDevice: 'exact-kindle',
				autoRefreshPreview: false,
				debugLogging: true,
			}),
		).toEqual({
			defaultPreviewDevice: DEFAULT_SETTINGS.defaultPreviewDevice,
			autoRefreshPreview: false,
			debugLogging: true,
		});
	});

	it('rejects invalid boolean values', () => {
		expect(
			normalizeBookDesignerSettings({
				defaultPreviewDevice: 'tablet',
				autoRefreshPreview: 'yes',
				debugLogging: 1,
			}),
		).toEqual({
			defaultPreviewDevice: 'tablet',
			autoRefreshPreview: DEFAULT_SETTINGS.autoRefreshPreview,
			debugLogging: DEFAULT_SETTINGS.debugLogging,
		});
	});

	it('merges partial persisted settings with defaults', () => {
		expect(
			normalizeBookDesignerSettings({
				defaultPreviewDevice: 'phone',
			}),
		).toEqual({
			...DEFAULT_SETTINGS,
			defaultPreviewDevice: 'phone',
		});
	});

	it('preserves valid persisted settings', () => {
		expect(
			normalizeBookDesignerSettings({
				defaultPreviewDevice: 'ereader-large',
				autoRefreshPreview: false,
				debugLogging: true,
				extra: 'ignored',
			}),
		).toEqual({
			defaultPreviewDevice: 'ereader-large',
			autoRefreshPreview: false,
			debugLogging: true,
		});
	});
});
