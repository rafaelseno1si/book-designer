import {
	ELEMENT_LIMITS,
	type ElementAssignment,
	type ElementAssignments,
	type ElementManifest,
	type ElementSettings,
	type SettingRule,
} from './types';
import { bounded, canonical, fail, onlyKeys, record, safeId, hasControlCharacters } from './validation';

export function parseSettingsSchema(value: unknown): Record<string, SettingRule> {
	if (!record(value) || Object.keys(value).length > 32)
		fail('INVALID_SCHEMA', 'settingsSchema must define at most 32 scalar settings.');
	const result: Record<string, SettingRule> = {};
	for (const [key, rule] of Object.entries(value)) {
		safeId(key);
		if (!record(rule)) fail('INVALID_SCHEMA', `Invalid schema for ${key}.`);
		if (rule.type === 'boolean') {
			onlyKeys(rule, ['type']);
			result[key] = { type: 'boolean' };
		} else if (rule.type === 'number') {
			onlyKeys(rule, ['type', 'minimum', 'maximum']);
			if (
				typeof rule.minimum !== 'number' ||
				typeof rule.maximum !== 'number' ||
				!Number.isFinite(rule.minimum) ||
				!Number.isFinite(rule.maximum) ||
				rule.minimum > rule.maximum
			)
				fail('INVALID_SCHEMA', `${key} needs finite minimum/maximum bounds.`);
			result[key] = { type: 'number', minimum: rule.minimum, maximum: rule.maximum };
		} else if (rule.type === 'string') {
			onlyKeys(rule, ['type', 'maxLength', 'enum', 'format']);
			if (
				!Number.isInteger(rule.maxLength) ||
				typeof rule.maxLength !== 'number' ||
				rule.maxLength < 1 ||
				rule.maxLength > 2000
			)
				fail('INVALID_SCHEMA', `${key} needs maxLength between 1 and 2000.`);
			if (rule.format !== undefined && rule.format !== 'color-or-theme')
				fail('INVALID_SCHEMA', `Unsupported format for ${key}.`);
			if (
				rule.enum !== undefined &&
				(!Array.isArray(rule.enum) ||
					!rule.enum.length ||
					rule.enum.length > 32 ||
					!rule.enum.every(
						(item: unknown) =>
							typeof item === 'string' && item.length <= (rule.maxLength as number),
					))
			)
				fail('INVALID_SCHEMA', `Invalid enum for ${key}.`);
			result[key] = {
				type: 'string',
				maxLength: rule.maxLength,
				...(rule.enum ? { enum: [...(rule.enum as string[])] } : {}),
				...(rule.format ? { format: rule.format } : {}),
			};
		} else fail('INVALID_SCHEMA', `Unsupported setting type for ${key}.`);
	}
	return result;
}
export function scalarSettings(value: unknown): ElementSettings {
	if (!record(value) || Object.keys(value).length > 32)
		fail('INVALID_SETTINGS', 'Settings must be an object of at most 32 scalar values.');
	bounded(JSON.stringify(value), ELEMENT_LIMITS.settings, 'Settings');
	const result: ElementSettings = {};
	for (const [key, item] of Object.entries(value)) {
		safeId(key);
		if (
			!(
				typeof item === 'boolean' ||
				typeof item === 'string' ||
				(typeof item === 'number' && Number.isFinite(item))
			)
		)
			fail('INVALID_SETTINGS', `${key} must be a finite number, boolean, or string.`);
		result[key] = item;
	}
	return result;
}
export function validateSettings(
	value: unknown,
	schema: Record<string, SettingRule>,
	partial = false,
): ElementSettings {
	const settings = scalarSettings(value);
	for (const [key, item] of Object.entries(settings)) {
		const rule = Object.prototype.hasOwnProperty.call(schema, key) ? schema[key] : undefined;
		if (!rule) fail('INVALID_SETTINGS', `Unknown setting: ${key}.`);
		if (
			(rule.type === 'boolean' && typeof item !== 'boolean') ||
			(rule.type === 'number' &&
				(typeof item !== 'number' || item < rule.minimum || item > rule.maximum)) ||
			(rule.type === 'string' &&
				(typeof item !== 'string' ||
					item.length > rule.maxLength ||
					hasControlCharacters(item) ||
					(rule.enum && !rule.enum.includes(item)) ||
					(rule.format === 'color-or-theme' && item !== 'theme' && !/^#[0-9a-f]{6}$/i.test(item))))
		)
			fail('INVALID_SETTINGS', `Invalid value for ${key}.`);
	}
	if (!partial)
		for (const key of Object.keys(schema))
			if (!Object.prototype.hasOwnProperty.call(settings, key))
				fail('INVALID_SETTINGS', `Missing setting: ${key}.`);
	return settings;
}
export function resolveElementSettings(
	manifest: ElementManifest,
	assignment: Pick<ElementAssignment, 'presetId' | 'settingsOverrides'>,
): ElementSettings {
	const preset = manifest.presets.find((candidate) => candidate.id === assignment.presetId);
	if (!preset) fail('MISSING_PRESET', `Preset “${assignment.presetId}” is unavailable.`);
	validateSettings(assignment.settingsOverrides, manifest.settingsSchema, true);
	return validateSettings(
		{ ...manifest.defaults, ...preset.settings, ...assignment.settingsOverrides },
		manifest.settingsSchema,
	);
}
export function parseAssignments(value: unknown): ElementAssignments {
	if (value === undefined) return {};
	if (!record(value)) fail('INVALID_ASSIGNMENT', 'Element assignments must be an object.');
	onlyKeys(value, ['blockquote']);
	if (value.blockquote === undefined) return {};
	const assignment = value.blockquote;
	if (!record(assignment)) fail('INVALID_ASSIGNMENT', 'Blockquote assignment must be an object.');
	onlyKeys(assignment, ['elementId', 'presetId', 'settingsOverrides']);
	return {
		blockquote: {
			elementId: safeId(assignment.elementId),
			presetId: safeId(assignment.presetId),
			settingsOverrides: scalarSettings(assignment.settingsOverrides),
		},
	};
}
export function cloneDesign<T extends { elements?: ElementAssignments }>(design: T): T {
	return { ...design, ...(design.elements ? { elements: parseAssignments(design.elements) } : {}) };
}
export function sameElements(a?: ElementAssignments, b?: ElementAssignments): boolean {
	return canonical(a ?? {}) === canonical(b ?? {});
}
