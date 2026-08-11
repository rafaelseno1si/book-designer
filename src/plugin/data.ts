import { normalizeProjectRegistry, type BookProjectRegistry } from './project-store';
import { normalizeBookDesignerSettings, type BookDesignerSettings } from './settings';

export interface BookDesignerPersistedData {
	version: 1;
	settings: BookDesignerSettings;
	projects: BookProjectRegistry;
}

export function normalizeBookDesignerData(value: unknown): BookDesignerPersistedData {
	const root = isRecord(value) ? value : {};
	// Phase 0 stored settings directly in plugin data; preserve those values on upgrade.
	const rawSettings = isRecord(root.settings) ? root.settings : root;
	const settings = normalizeBookDesignerSettings(rawSettings);
	return {
		version: 1,
		settings,
		projects: normalizeProjectRegistry(root.projects, settings.defaultPreviewDevice),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
