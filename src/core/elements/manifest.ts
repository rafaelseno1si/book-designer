import { parse, serialize, ErrorCodes, html as htmlNamespace, type DefaultTreeAdapterMap } from 'parse5';
import { parseSettingsSchema, validateSettings } from './settings';
import { validateEditorCss } from './css-validation';
import { ELEMENT_LIMITS, type ElementManifest, type ElementPackage, type InspectedElement } from './types';
import { bounded, fail, onlyKeys, record, safeId, text } from './validation';

type HtmlNode = DefaultTreeAdapterMap['node'];
export function singleHtmlPackage(html: string): ElementPackage {
	return { entryPath: 'index.html', files: { 'index.html': html } };
}
export function inspectElementPackage(value: unknown): InspectedElement {
	if (!record(value) || value.entryPath !== 'index.html' || !record(value.files))
		fail('INVALID_PACKAGE', 'V1 requires one index.html entry. ZIP/assets are not supported yet.');
	onlyKeys(value, ['entryPath', 'files']);
	onlyKeys(value.files, ['index.html']);
	const html = value.files['index.html'];
	if (typeof html !== 'string') fail('INVALID_PACKAGE', 'Missing HTML entry document.');
	bounded(html, ELEMENT_LIMITS.package, 'Element package');
	const document = parse(html, {
		onParseError: (error) => {
			if (error.code !== ErrorCodes.missingDoctype)
				fail('INVALID_HTML', `Package HTML: ${error.code}.`);
		},
	});
	let manifestSource: string | null = null;
	let count = 0;
	function inspect(node: HtmlNode, depth: number): void {
		if (++count > 2000 || depth > 32) fail('HTML_COMPLEXITY', 'Package HTML is too complex.');
		if ('tagName' in node) {
			const tag = node.tagName;
			if (tag === 'head') node.attrs = []; // Host reconstruction always has an unambiguous policy insertion point.
			if (
				node.namespaceURI !== htmlNamespace.NS.HTML ||
				[
					'base',
					'link',
					'iframe',
					'object',
					'embed',
					'img',
					'video',
					'audio',
					'source',
					'track',
					'template',
					'form',
				].includes(tag)
			)
				fail('UNSUPPORTED_HTML', `Package element <${tag}> is not supported.`);
			for (const attr of node.attrs) {
				if (attr.name === 'style') validateEditorCss(`div{${attr.value}}`);
				if (
					attr.name.startsWith('on') ||
					[
						'src',
						'srcset',
						'href',
						'action',
						'formaction',
						'http-equiv',
						'ping',
						'background',
						'poster',
						'srcdoc',
					].includes(attr.name)
				)
					fail('EXTERNAL_RESOURCE', `Package attribute ${attr.name} is not supported.`);
			}
			if (tag === 'style')
				validateEditorCss(
					node.childNodes.map((child) => ('value' in child ? child.value : '')).join(''),
				);
			if (tag === 'script') {
				const type = node.attrs.find((attr) => attr.name === 'type')?.value;
				const marker = node.attrs.some((attr) => attr.name === 'data-book-designer-manifest');
				if (marker) {
					if (type !== 'application/json' || manifestSource !== null)
						fail('INVALID_MANIFEST', 'Provide exactly one JSON manifest block.');
					manifestSource = node.childNodes
						.map((child) => ('value' in child ? child.value : ''))
						.join('');
				} else if (type && type !== 'text/javascript')
					fail('UNSUPPORTED_SCRIPT', 'Only local inline classic JavaScript is supported.');
			}
		}
		if ('childNodes' in node) for (const child of node.childNodes) inspect(child, depth + 1);
	}
	inspect(document, 0);
	if (manifestSource === null) fail('INVALID_MANIFEST', 'Missing element manifest.');
	bounded(manifestSource, ELEMENT_LIMITS.manifest, 'Manifest');
	let raw: unknown;
	try {
		raw = JSON.parse(manifestSource) as unknown;
	} catch {
		fail('INVALID_MANIFEST', 'Manifest contains invalid JSON.');
	}
	const manifest = parseManifest(raw);
	return { package: singleHtmlPackage(html), manifest, editorHtml: serialize(document) };
}
export function parseManifest(value: unknown): ElementManifest {
	if (!record(value)) fail('INVALID_MANIFEST', 'Manifest must be an object.');
	onlyKeys(value, [
		'format',
		'version',
		'apiVersion',
		'id',
		'name',
		'description',
		'packageVersion',
		'category',
		'placement',
		'contract',
		'outputs',
		'defaults',
		'settingsSchema',
		'presets',
	]);
	if (value.format !== 'book-designer-element' || value.version !== 1 || value.apiVersion !== 1)
		fail('UNSUPPORTED_VERSION', 'Only element format 1 and host API 1 are supported.');
	if (
		value.category !== 'block.blockquote' ||
		value.placement !== 'normal-flow' ||
		value.contract !== 'wrap-content' ||
		!Array.isArray(value.outputs) ||
		value.outputs.length !== 1 ||
		value.outputs[0] !== 'xhtml'
	)
		fail(
			'UNSUPPORTED_CONTRACT',
			'V1 supports only normal-flow blockquotes using wrap-content and XHTML/CSS.',
		);
	const schema = parseSettingsSchema(value.settingsSchema);
	if (!Array.isArray(value.presets) || !value.presets.length || value.presets.length > 32)
		fail('INVALID_PRESETS', 'Provide between 1 and 32 presets.');
	const seen = new Set<string>();
	const presets = value.presets.map((preset: unknown) => {
		if (!record(preset)) fail('INVALID_PRESET', 'Preset must be an object.');
		onlyKeys(preset, ['id', 'name', 'description', 'settings']);
		const id = safeId(preset.id);
		if (seen.has(id)) fail('DUPLICATE_PRESET', `Duplicate preset: ${id}.`);
		seen.add(id);
		return {
			id,
			name: text(preset.name, 'Preset name'),
			...(preset.description !== undefined
				? { description: text(preset.description, 'Preset description', 2000) }
				: {}),
			settings: validateSettings(preset.settings, schema, true),
		};
	});
	return {
		format: 'book-designer-element',
		version: 1,
		apiVersion: 1,
		id: safeId(value.id),
		name: text(value.name, 'Name'),
		packageVersion: text(value.packageVersion, 'Package version', 64),
		...(value.description !== undefined
			? { description: text(value.description, 'Description', 2000) }
			: {}),
		category: 'block.blockquote',
		placement: 'normal-flow',
		contract: 'wrap-content',
		outputs: ['xhtml'],
		defaults: validateSettings(value.defaults, schema),
		settingsSchema: schema,
		presets,
	};
}
