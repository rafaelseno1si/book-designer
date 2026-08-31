import { generate, lexer, parse, walk } from 'css-tree';
import { fail } from './validation';

const properties = new Set([
	'color',
	'background-color',
	'font-style',
	'font-weight',
	'font-size',
	'font-family',
	'line-height',
	'text-align',
	'text-indent',
	'margin',
	'margin-top',
	'margin-bottom',
	'margin-left',
	'margin-right',
	'margin-inline',
	'margin-inline-start',
	'margin-inline-end',
	'margin-block',
	'padding',
	'padding-left',
	'padding-right',
	'padding-top',
	'padding-bottom',
	'padding-inline',
	'padding-inline-start',
	'padding-inline-end',
	'border',
	'border-left',
	'border-right',
	'border-top',
	'border-bottom',
	'border-inline-start',
	'border-inline-end',
	'border-width',
	'border-style',
	'border-color',
]);

export function validateEditorCss(css: string): void {
	const ast = parse(css, { parseCustomProperty: true });
	walk(ast, (node) => {
		if (
			node.type === 'Url' ||
			node.type === 'Raw' ||
			(node.type === 'Atrule' && !['media', 'supports'].includes(node.name.toLowerCase()))
		)
			fail('UNSAFE_EDITOR_CSS', 'Editor CSS cannot load resources or contain unsupported at-rules.');
	});
}

export function scopeElementCss(css: string, scope: string): string {
	const ast = parse(css);
	walk(ast, (node) => {
		if (['Raw', 'Url', 'Atrule', 'Function'].includes(node.type))
			fail('UNSAFE_CSS', 'Output CSS cannot contain at-rules, URLs, functions, or unparsed content.');
		if (node.type === 'ClassSelector' && node.name !== scope) node.name = `${scope}-${node.name}`;
		if (node.type === 'Declaration') {
			const property = node.property.toLowerCase();
			if (
				!properties.has(property) ||
				node.important ||
				!lexer.matchProperty(property, node.value).matched
			)
				fail('UNSAFE_CSS', `Unsupported CSS declaration: ${property}.`);
			walk(node.value, (value) => {
				if (value.type === 'Dimension') {
					const number = Number(value.value);
					if (number < 0 || number > 3 || !['em', 'rem'].includes(value.unit.toLowerCase()))
						fail('UNSAFE_CSS', 'Output dimensions must be between 0 and 3 em/rem.');
				} else if (
					value.type === 'Number' &&
					(Number(value.value) < 0 || Number(value.value) > (property === 'font-weight' ? 900 : 3))
				)
					fail('UNSAFE_CSS', 'CSS number is outside the supported range.');
				else if (
					value.type === 'Percentage' ||
					value.type === 'String' ||
					(value.type === 'Identifier' &&
						['initial', 'revert', 'revert-layer', 'unset', 'transparent'].includes(
							value.name.toLowerCase(),
						))
				)
					fail('UNSAFE_CSS', 'Unsupported CSS value.');
			});
			if (property === 'font-family' && generate(node.value) !== 'inherit')
				fail('UNSAFE_CSS', 'Elements must inherit publication typography.');
		}
		if (node.type === 'Selector') {
			const parts = node.children.toArray();
			const first = parts.shift();
			if (first?.type !== 'PseudoClassSelector' || first.name !== 'scope' || first.children !== null)
				fail('UNSAFE_SELECTOR', 'Every output selector must start with :scope.');
			let needsTarget = false;
			let atRoot = true;
			for (const part of parts) {
				if (part.type === 'Combinator' && part.name === '>' && !needsTarget) {
					needsTarget = true;
					atRoot = false;
				} else if (
					!atRoot &&
					((part.type === 'TypeSelector' && /^[a-z]+$/.test(part.name)) ||
						(part.type === 'ClassSelector' && /^[a-zA-Z][\w-]*$/.test(part.name)))
				)
					needsTarget = false;
				else
					fail(
						'UNSAFE_SELECTOR',
						'Only direct-child tag/class selectors after :scope are supported.',
					);
			}
			if (needsTarget) fail('UNSAFE_SELECTOR', 'Incomplete selector.');
			node.children.shift();
			node.children.prependData({ type: 'ClassSelector', name: scope });
		}
	});
	return generate(ast);
}
