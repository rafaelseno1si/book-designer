import { ElementSandbox, verifyElementIsolation } from '../../src/plugin/elements/sandbox-host';
import { inspectElementPackage, singleHtmlPackage } from '../../src/core/elements/manifest';
import { validateElementOutput } from '../../src/core/elements/output-validation';
import { ElementCompiler } from '../../src/plugin/elements/compiler';
import { ElementApprovals } from '../../src/plugin/elements/approval';
import { BUILTIN_ELEMENT } from '../../src/plugin/elements/library';
import { elementContext } from '../../src/plugin/elements/context';
import { DEFAULT_PROJECT_DESIGN } from '../../src/plugin/project-store';
import { BLOCKQUOTE_SAMPLE } from '../../src/components/elements/ElementServices';
import {
	renderBookThemeSampleDocument,
	renderPublicationFragment,
} from '../../src/core/renderer/book-preview-renderer';

const host = document.getElementById('editor')!;
const background = document.getElementById('background')!;
const inspected = inspectElementPackage(BUILTIN_ELEMENT.package);
const context = elementContext(null, DEFAULT_PROJECT_DESIGN);
const approvals = new ElementApprovals({});
const compiler = new ElementCompiler(background, approvals);
let editor: ElementSandbox | null = null;
let settings = inspected.manifest.defaults;
let changed = 0;
Object.assign(window, {
	elementHarness: {
		async verify() {
			return verifyElementIsolation(background);
		},
		async open() {
			editor = new ElementSandbox(host, inspected);
			editor.onEvent = (message) => {
				if (message.type === 'changed') {
					settings = message.payload as typeof settings;
					changed++;
				}
			};
			await editor.request('init', { settings, context }, 1);
		},
		changed: () => changed,
		async render() {
			const artifact = await compiler.compile(
				BUILTIN_ELEMENT,
				{ elementId: BUILTIN_ELEMENT.id, presetId: 'classic-rule', settingsOverrides: settings },
				context,
			);
			const html = renderBookThemeSampleDocument(BLOCKQUOTE_SAMPLE, DEFAULT_PROJECT_DESIGN, artifact);
			(document.getElementById('preview') as HTMLIFrameElement).srcdoc = html;
			return {
				html,
				css: artifact.css,
				publication: renderPublicationFragment(BLOCKQUOTE_SAMPLE, DEFAULT_PROJECT_DESIGN, artifact),
			};
		},
		close() {
			editor?.dispose();
			editor = null;
		},
		async imported() {
			const entry = {
				...BUILTIN_ELEMENT,
				id: 'imported-copy',
				package: singleHtmlPackage(
					BUILTIN_ELEMENT.package.files['index.html'].replace(
						'book-designer.basic-blockquote',
						'example.imported',
					),
				),
			};
			approvals.approve(await compiler.digest(entry));
			return compiler.compile(
				entry,
				{ elementId: entry.id, presetId: 'plain-quotation', settingsOverrides: {} },
				context,
			);
		},
		async attack(script: string) {
			const source = BUILTIN_ELEMENT.package.files['index.html'].replace(
				'</body>',
				`<script>${script}</script></body>`,
			);
			const sandbox = new ElementSandbox(host, inspectElementPackage(singleHtmlPackage(source)));
			try {
				return await sandbox.request('render', { settings, context }, 1);
			} finally {
				sandbox.dispose();
			}
		},
		validate: validateElementOutput,
	},
});
