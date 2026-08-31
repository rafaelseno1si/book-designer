import { describe, expect, it } from 'vitest';
import html from '../../elements/builtins/basic-blockquote.html';
import { inspectElementPackage, singleHtmlPackage, parseManifest } from './manifest';
import { cloneDesign, parseAssignments, resolveElementSettings, validateSettings } from './settings';
import { scopeElementCss } from './css-validation';
import { parseBridgeMessage } from '../../plugin/elements/protocol';
import { ElementApprovals } from '../../plugin/elements/approval';

const manifest = inspectElementPackage(singleHtmlPackage(html)).manifest;
describe('element package contract', () => {
	it('inspects the actual built-in without evaluating its scripts', () => {
		const inspected = inspectElementPackage(
			singleHtmlPackage(html.replace('(() => {', 'throw new Error("must not execute"); (() => {')),
		);
		expect(inspected.manifest.presets.map((p) => p.id)).toEqual(['classic-rule', 'plain-quotation']);
		expect(inspected.editorHtml).toContain('id="alignment"');
	});
	it.each([
		{ version: 2 },
		{ apiVersion: 2 },
		{ category: 'block.timeline' },
		{ outputs: ['svg'] },
		{ capabilities: ['network'] },
	])('rejects unsupported contract %j', (change) => {
		expect(() => parseManifest({ ...manifest, ...change })).toThrow();
	});
	it('rejects duplicate manifests, external assets and invalid packages', () => {
		expect(() =>
			inspectElementPackage(
				singleHtmlPackage(
					html.replace(
						'</body>',
						'<script type="application/json" data-book-designer-manifest>{}</script></body>',
					),
				),
			),
		).toThrow(/exactly one/);
		expect(() =>
			inspectElementPackage(
				singleHtmlPackage(html.replace('</body>', '<img src="https://example.com/image"></body>')),
			),
		).toThrow();
		expect(() =>
			inspectElementPackage({
				entryPath: 'index.html',
				files: { 'index.html': html, 'assets/a.png': '' },
			}),
		).toThrow();
		expect(() => inspectElementPackage(singleHtmlPackage('x'.repeat(524289)))).toThrow(/limit/);
	});
	it('rejects duplicate presets and invalid defaults', () => {
		expect(() =>
			parseManifest({ ...manifest, presets: [manifest.presets[0], manifest.presets[0]] }),
		).toThrow(/Duplicate/);
		expect(() => parseManifest({ ...manifest, defaults: {} })).toThrow(/Missing setting/);
	});
	it('resolves defaults, preset values and assignment overrides in order', () => {
		const value = resolveElementSettings(manifest, {
			presetId: 'plain-quotation',
			settingsOverrides: { italic: false, inset: 2 },
		});
		expect(value).toMatchObject({ italic: false, rule: false, inset: 2, accent: 'theme' });
		expect(() =>
			resolveElementSettings(manifest, { presetId: 'missing', settingsOverrides: {} }),
		).toThrow(/unavailable/);
	});
	it.each([
		{ unknown: true },
		{ toString: true },
		{ hasOwnProperty: true },
		{ inset: 99 },
		{ italic: 'yes' },
		{ accent: 'url(x)' },
		{ nested: {} },
		JSON.parse('{"__proto__":true}') as unknown,
	])('rejects invalid settings %j', (settings) => {
		expect(() => validateSettings(settings, manifest.settingsSchema, true)).toThrow();
	});
	it('deep clones assignment settings and preserves absent assignments', () => {
		const design = {
			elements: {
				blockquote: { elementId: 'a', presetId: 'classic-rule', settingsOverrides: { inset: 1 } },
			},
		};
		const copy = cloneDesign(design);
		copy.elements.blockquote.settingsOverrides.inset = 2;
		expect(design.elements.blockquote.settingsOverrides.inset).toBe(1);
		expect(parseAssignments(undefined)).toEqual({});
	});
});
describe('CSS policy', () => {
	it('rewrites only root-relative selectors and namespaces author classes', () => {
		expect(scopeElementCss(':scope{border:0}:scope > .content > p{text-indent:0}', 'host')).toBe(
			'.host{border:0}.host>.host-content>p{text-indent:0}',
		);
	});
	it.each([
		'body{color:red}',
		':scope ~ body{color:red}',
		':scope p{color:red}',
		':scope:has(body){color:red}',
		'@import "x";',
		':scope{position:fixed}',
		':scope{color:var(--x)}',
		':scope{margin:-1em}',
		':scope{background:url(x)}',
		':scope{color:red!important}',
	])('rejects escaping/unsafe CSS %s', (css) => expect(() => scopeElementCss(css, 'host')).toThrow());
});
describe('bridge and local approvals', () => {
	const message = {
		protocol: 1,
		session: 'session-a',
		revision: 1,
		requestId: 1,
		type: 'result',
		payload: {},
	};
	it('validates session, protocol, request identities and message sizes', () => {
		expect(parseBridgeMessage(JSON.stringify(message), 'session-a').revision).toBe(1);
		for (const change of [
			{ session: 'other' },
			{ protocol: 2 },
			{ revision: -1 },
			{ requestId: 1.5 },
			{ type: 'execute' },
		])
			expect(() =>
				parseBridgeMessage(JSON.stringify({ ...message, ...change }), 'session-a'),
			).toThrow();
		expect(() => parseBridgeMessage(' '.repeat(131073), 'session-a')).toThrow();
	});
	it('keeps approvals local and bound to exact content', () => {
		let stored: unknown = null;
		const storage = {
			loadLocalStorage: () => stored,
			saveLocalStorage: (_key: string, value: unknown) => {
				stored = value;
			},
		};
		const approvals = new ElementApprovals(storage);
		approvals.approve('a'.repeat(64));
		expect(new ElementApprovals(storage).has('a'.repeat(64))).toBe(true);
		expect(new ElementApprovals({}).has('a'.repeat(64))).toBe(false);
		expect(approvals.has('b'.repeat(64))).toBe(false);
	});
});
