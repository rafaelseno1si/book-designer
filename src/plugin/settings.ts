export const PREVIEW_DEVICE_IDS = [
	'phone-narrow',
	'phone',
	'ereader-6',
	'ereader-large',
	'tablet',
	'custom',
] as const;

export type PreviewDeviceId = (typeof PREVIEW_DEVICE_IDS)[number];

export interface BookDesignerSettings {
	defaultPreviewDevice: PreviewDeviceId;
	debugLogging: boolean;
}

export const DEFAULT_SETTINGS: BookDesignerSettings = {
	defaultPreviewDevice: 'ereader-6',
	debugLogging: false,
};

export const PREVIEW_DEVICE_LABELS: Record<PreviewDeviceId, string> = {
	'phone-narrow': 'Phone narrow',
	phone: 'Phone',
	'ereader-6': 'E-reader 6"',
	'ereader-large': 'E-reader large',
	tablet: 'Tablet',
	custom: 'Custom size',
};

export const PREVIEW_DEVICE_DIMENSIONS: Record<PreviewDeviceId, { width: number; height: number }> = {
	'phone-narrow': { width: 300, height: 620 },
	phone: { width: 350, height: 680 },
	'ereader-6': { width: 460, height: 700 },
	'ereader-large': { width: 540, height: 760 },
	tablet: { width: 680, height: 760 },
	custom: { width: 390, height: 844 },
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

	const debugLogging =
		typeof persistedSettings.debugLogging === 'boolean'
			? persistedSettings.debugLogging
			: DEFAULT_SETTINGS.debugLogging;

	return {
		defaultPreviewDevice,
		debugLogging,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
