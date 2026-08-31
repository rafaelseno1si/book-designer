import { scopeElementCss } from './css-validation';
import { ELEMENT_LIMITS, type ElementArtifact } from './types';
import { bounded, fail, onlyKeys, record } from './validation';

const tags = new Set(['blockquote', 'div', 'span', 'p', 'cite', 'em', 'strong', 'br']);
export function validateElementOutput(value: unknown, key: string): ElementArtifact {
	if (!/^[a-z0-9-]{1,64}$/.test(key)) fail('INVALID_SCOPE', 'Invalid host scope.');
	if (!record(value) || typeof value.xhtml !== 'string' || typeof value.css !== 'string')
		fail('INVALID_OUTPUT', 'Render must return { xhtml, css } strings.');
	onlyKeys(value, ['xhtml', 'css']);
	bounded(value.xhtml, ELEMENT_LIMITS.output, 'Wrapper');
	bounded(value.css, ELEMENT_LIMITS.output, 'CSS');
	// XML processing instructions/DTD are not part of the fragment contract.
	if (value.xhtml.includes('<!') || value.xhtml.includes('<?'))
		fail('UNSAFE_XHTML', 'Declarations and processing instructions are not supported.');
	const document = new DOMParser().parseFromString(value.xhtml, 'application/xml');
	if (document.querySelector('parsererror') || document.documentElement.localName !== 'blockquote')
		fail('INVALID_XHTML', 'Return one well-formed blockquote XHTML root.');
	const scope = `bd-element-${key}`;
	let nodes = 0;
	let slots = 0;
	let before = '';
	let after = '';
	let pastSlot = false;
	const append = (text: string) => {
		if (pastSlot) after += text;
		else before += text;
	};
	function serialize(node: Node, depth: number): void {
		if (++nodes > 128 || depth > 12) fail('OUTPUT_COMPLEXITY', 'Wrapper is too complex.');
		if (node.nodeType === 3) {
			append(escapeXhtml(node.textContent ?? ''));
			return;
		}
		if (node.nodeType !== 1) fail('UNSAFE_XHTML', 'Only XHTML elements and text are allowed.');
		const element = node as Element;
		if (
			['div', 'p'].includes(element.tagName) &&
			element.parentElement &&
			!['blockquote', 'div'].includes(element.parentElement.tagName)
		)
			fail('INVALID_FLOW', 'Block containers cannot be nested inside phrasing content.');
		if (
			!tags.has(element.tagName) ||
			(depth > 0 && element.tagName === 'blockquote') ||
			(element.namespaceURI && element.namespaceURI !== 'http://www.w3.org/1999/xhtml')
		)
			fail('UNSAFE_XHTML', `Unsupported wrapper element: ${element.tagName}.`);
		const attributes: string[] = [];
		let classes = '';
		let slot = false;
		for (const attr of Array.from(element.attributes)) {
			if (attr.name === 'xmlns' && attr.value === 'http://www.w3.org/1999/xhtml' && depth === 0)
				continue;
			if (attr.name === 'class' && /^[a-zA-Z][\w -]{0,199}$/.test(attr.value)) classes = attr.value;
			else if (
				attr.name === 'data-book-designer-content-slot' &&
				attr.value === '' &&
				element.tagName === 'div' &&
				!element.hasChildNodes()
			) {
				slot = true;
				slots++;
			} else fail('UNSAFE_XHTML', `Unsupported wrapper attribute: ${attr.name}.`);
		}
		classes = classes
			.split(/\s+/)
			.filter(Boolean)
			.map((name) => `${scope}-${name}`)
			.join(' ');
		if (depth === 0) classes = `${scope} ${classes}`.trim();
		if (classes) attributes.push(` class="${escapeXhtml(classes)}"`);
		if (element.tagName === 'br') {
			append('<br />');
			return;
		}
		append(`<${element.tagName}${attributes.join('')}>`);
		if (slot) pastSlot = true;
		for (const child of Array.from(element.childNodes)) serialize(child, depth + 1);
		append(`</${element.tagName}>`);
	}
	serialize(document.documentElement, 0);
	if (slots !== 1) fail('INVALID_SLOT', 'The wrapper must contain exactly one empty content-slot div.');
	return Object.freeze({ key, before, after, css: scopeElementCss(value.css, scope) });
}
export function assembleElement(artifact: ElementArtifact, trustedChildren: string): string {
	return artifact.before + trustedChildren + artifact.after;
}
export function escapeXhtml(text: string): string {
	return text.replace(
		/[&<>"']/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
	);
}
