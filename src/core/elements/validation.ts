export class ElementValidationError extends Error {
	constructor(
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = 'ElementValidationError';
	}
}
export function fail(code: string, message: string): never {
	throw new ElementValidationError(code, message);
}
export function record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function text(value: unknown, label: string, maximum = 200): string {
	if (typeof value !== 'string' || !value.trim() || value.length > maximum || hasControlCharacters(value))
		fail('INVALID_TEXT', `${label} must be non-empty text (${maximum} characters maximum).`);
	return value;
}
export function safeId(value: unknown): string {
	const id = text(value, 'ID', 128);
	if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id))
		fail('INVALID_ID', 'Use letters, numbers, dots, underscores and hyphens in IDs.');
	return id;
}
export function hasControlCharacters(value: string): boolean {
	return Array.from(value).some((character) => character.charCodeAt(0) < 32);
}
export function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): void {
	for (const key of Object.keys(value))
		if (!keys.includes(key)) fail('UNSUPPORTED_FIELD', `Unsupported field: ${key}.`);
}
export function byteLength(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}
export function bounded(value: string, limit: number, label: string): void {
	if (byteLength(value) > limit) fail('SIZE_LIMIT', `${label} exceeds the ${limit} byte limit.`);
}
export function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (record(value))
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
			.join(',')}}`;
	return JSON.stringify(value);
}
export async function contentDigest(source: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
