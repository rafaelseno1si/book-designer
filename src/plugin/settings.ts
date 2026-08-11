export const PREVIEW_DEVICE_IDS = [
	'phone-narrow',
	'phone',
	'ereader-6',
	'ereader-large',
	'tablet',
] as const;

export type PreviewDeviceId = (typeof PREVIEW_DEVICE_IDS)[number];

export interface BookDesignerSettings {
	defaultPreviewDevice: PreviewDeviceId;
	autoRefreshPreview: boolean;
	debugLogging: boolean;
}

export const DEFAULT_SETTINGS: BookDesignerSettings = {
	defaultPreviewDevice: 'ereader-6',
	autoRefreshPreview: true,
	debugLogging: false,
};

export const PREVIEW_DEVICE_LABELS: Record<PreviewDeviceId, string> = {
	'phone-narrow': 'Phone narrow',
	phone: 'Phone',
	'ereader-6': 'E-reader 6"',
	'ereader-large': 'E-reader large',
	tablet: 'Tablet',
};

export function isPreviewDeviceId(value: string): value is PreviewDeviceId {
	return PREVIEW_DEVICE_IDS.some((deviceId) => deviceId === value);
}

export function normalizeBookDesignerSettings(
	persistedSettings: unknown,
): BookDesignerSettings {
	if (!isRecord(persistedSettings)) {
		return { ...DEFAULT_SETTINGS };
	}

	const defaultPreviewDevice =
		typeof persistedSettings.defaultPreviewDevice === 'string' &&
		isPreviewDeviceId(persistedSettings.defaultPreviewDevice)
			? persistedSettings.defaultPreviewDevice
			: DEFAULT_SETTINGS.defaultPreviewDevice;

	const autoRefreshPreview =
		typeof persistedSettings.autoRefreshPreview === 'boolean'
			? persistedSettings.autoRefreshPreview
			: DEFAULT_SETTINGS.autoRefreshPreview;

	const debugLogging =
		typeof persistedSettings.debugLogging === 'boolean'
			? persistedSettings.debugLogging
			: DEFAULT_SETTINGS.debugLogging;

	return {
		defaultPreviewDevice,
		autoRefreshPreview,
		debugLogging,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
