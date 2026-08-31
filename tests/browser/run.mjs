import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const result = await build({
	entryPoints: ['tests/browser/harness.ts'],
	bundle: true,
	minify: true,
	write: false,
	format: 'iife',
	platform: 'browser',
	target: 'es2021',
	loader: { '.html': 'text' },
});
const bundle = result.outputFiles[0].text;
const uiResult = await build({
	entryPoints: ['tests/browser/ui-harness.tsx'],
	bundle: true,
	write: false,
	format: 'iife',
	platform: 'browser',
	target: 'es2021',
	loader: { '.html': 'text' },
	alias: { obsidian: resolve('tests/browser/obsidian-stub.ts') },
});
const uiBundle = uiResult.outputFiles[0].text;
const styles = await readFile('styles.css', 'utf8');
const uiHtml =
	'<!doctype html><html><head><title>Book Designer elements UI</title><link rel="stylesheet" href="/styles.css"><style>:root{--background-primary:#faf9f6;--background-secondary:#efeee9;--background-modifier-border:#d6d4cc;--text-normal:#282925;--text-muted:#696b62;--interactive-accent:#557751;--text-on-accent:#fff;--font-interface:system-ui;--font-ui-small:13px;--font-ui-smaller:12px;--font-ui-medium:16px;--radius-m:8px}body{margin:0;font:15px system-ui;color:var(--text-normal);background:var(--background-primary)}#app{height:100vh}button,input,select{font:inherit;padding:6px 10px;background:var(--background-primary);border:1px solid var(--background-modifier-border);border-radius:5px;color:inherit}button{cursor:pointer}button:disabled{opacity:.5}.test-modal{position:fixed;inset:15% 20%;padding:28px;background:#fff;box-shadow:0 0 0 999px #0005;z-index:999;overflow:auto}.test-modal button{margin:8px}.test-notice{position:fixed;bottom:0;background:#fff;padding:20px;z-index:1000}</style></head><body><div id="app"></div><script src="/ui.js"></script></body></html>';
const html =
	'<!doctype html><html><head><title>Element browser verification</title></head><body><div id="editor" style="width:480px;height:600px"></div><div id="background" style="position:absolute;left:-10000px;width:480px;height:600px"></div><iframe id="preview" sandbox="" style="width:400px;height:600px"></iframe><script src="/harness.js"></script></body></html>';
const networkLeaks = [];
const server = createServer((request, response) => {
	if (request.url.startsWith('/blocked')) networkLeaks.push(request.url);
	const routes = {
		'/harness.js': ['text/javascript', bundle],
		'/ui.js': ['text/javascript', uiBundle],
		'/ui': ['text/html', uiHtml],
		'/styles.css': ['text/css', styles],
	};
	const route = routes[request.url] ?? ['text/html', html];
	response.setHeader('Content-Type', route[0]);
	response.end(route[1]);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await chromium.launch({ headless: true });
try {
	const page = await browser.newPage();
	const errors = [];
	page.on('pageerror', (error) => {
		errors.push(error.message);
		console.error('Page error:', error.message);
	});
	page.on('console', (msg) => {
		if (process.env.DEBUG_BROWSER) console.log(msg.type(), msg.text());
	});
	await page.goto(`http://127.0.0.1:${address.port}`);
	await page.waitForFunction(() => !!window.elementHarness);
	const isolation = await page.evaluate(() => window.elementHarness.verify());
	console.log('Isolation probe:', isolation);
	assert.equal(isolation, true, 'Imported execution must remain disabled if the isolation probe fails');
	await page.evaluate(() => window.elementHarness.open());
	const editor = page.frameLocator('#editor > iframe').frameLocator('iframe');
	await editor.locator('#italic').check();
	await page.waitForFunction(() => window.elementHarness.changed() > 0);
	const rendered = await page.evaluate(() => window.elementHarness.render());
	assert.match(rendered.css, /font-style:italic/);
	assert.doesNotMatch(
		rendered.html,
		/<script|data-book-designer-content-slot|BookDesignerElement|<input|<iframe/,
	);
	await page.frameLocator('#preview').locator('blockquote').waitFor();
	await page.evaluate(() => window.elementHarness.close());
	const closed = await page.evaluate(() => window.elementHarness.render());
	assert.equal(closed.html, rendered.html);
	const staticContext = await browser.newContext({ javaScriptEnabled: false });
	const staticPage = await staticContext.newPage();
	await staticPage.setContent(
		`<!doctype html><style>${rendered.publication.css}</style>${rendered.publication.xhtml}`,
	);
	await staticPage.locator('blockquote').waitFor();
	assert.equal(await staticPage.locator('script,iframe,input,template').count(), 0);
	await staticContext.close();
	const imported = await page.evaluate(() => window.elementHarness.imported());
	assert.match(imported.before, /blockquote/);
	const origin = `http://127.0.0.1:${address.port}`;
	await page.evaluate(
		(origin) =>
			window.elementHarness.attack(
				`fetch('${origin}/blocked/fetch').catch(()=>{});const image=new Image();image.src='${origin}/blocked/image';document.body.append(image);window.open('${origin}/blocked/popup');`,
			),
		origin,
	);
	await page.evaluate(
		(origin) =>
			window.elementHarness.attack(`
		const form=document.createElement('form');form.action='${origin}/blocked/form';document.body.append(form);form.submit();
		const embedded=document.createElement('iframe');embedded.src='${origin}/blocked/frame';document.body.append(embedded);
		try { const worker=new Worker('${origin}/blocked/worker');worker.onerror=event=>event.preventDefault();worker.terminate(); } catch {}
		try { top.location.href='${origin}/blocked/top'; } catch {}
		document.querySelector('meta[http-equiv]')?.remove();
		fetch('${origin}/blocked/removed-policy').catch(()=>{});
	`),
		origin,
	);
	assert.deepEqual(networkLeaks, [], 'The local server must receive no forbidden requests');
	assert.deepEqual(errors, []);
	console.log(
		'Browser smoke passed: controls, static output, closed-editor compilation, imported contract, CSP resource blocking.',
	);
	await page.goto(`${origin}/ui`);
	await page.waitForFunction(() => Boolean(window.uiHarness));
	assert.equal(
		await page.locator('body > .book-designer-element-background').count(),
		1,
		'Element services must initialize under the body without appending a second document root',
	);
	await page.addStyleTag({ content: '*{box-sizing:border-box}' }); // Obsidian's global UI reset.
	await page.getByRole('button', { name: 'Elements', exact: true }).click();
	await page.getByRole('heading', { name: 'Elements', exact: true }).waitFor();
	await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
	assert.equal(await page.locator('.book-designer-element-library-row').count(), 1);
	await page.getByRole('button', { name: 'Create/import element' }).click();
	await page.getByRole('button', { name: 'Elements/quotation.html' }).click();
	await page.getByRole('button', { name: 'Import as new', exact: true }).click();
	await page.getByRole('button', { name: 'Approve authoring code' }).click();
	await page.getByRole('heading', { name: 'Imported quotation', exact: true }).waitFor();
	assert.equal(await page.locator('.book-designer-element-library-row').count(), 2);
	await page.evaluate(() => window.uiHarness.createProject());
	await page.getByRole('button', { name: 'Themes', exact: true }).click();
	await page.getByRole('button', { name: 'Edit a duplicate of Classic', exact: true }).click();
	assert.equal(
		await page
			.getByRole('navigation', { name: 'Theme elements', exact: true })
			.getByRole('button')
			.count(),
		5,
	);
	await page
		.getByRole('navigation', { name: 'Theme elements', exact: true })
		.getByRole('button', { name: 'Blockquote', exact: true })
		.click();
	await page.getByRole('button', { name: 'Collapse theme elements', exact: true }).click();
	assert.equal(await page.locator('.book-designer-theme-card').count(), 4);
	await page.getByRole('button', { name: 'Edit settings', exact: true }).first().click();
	const authored = page.frameLocator('.book-designer-element-editor > iframe').frameLocator('iframe');
	await authored.locator('#italic').check();
	await mkdir('dist', { recursive: true });
	await page.screenshot({ path: 'dist/elements-authored-settings.png' });
	await page.getByRole('button', { name: 'Reset', exact: true }).click();
	await authored.locator('#italic').waitFor();
	assert.equal(await authored.locator('#italic').isChecked(), false);
	await authored.locator('#italic').check();
	await page.getByRole('button', { name: 'Apply', exact: true }).click();
	const assignment = await page.evaluate(
		() => window.uiHarness.store.getSnapshot().registry.themes[0].design.elements.blockquote,
	);
	assert.equal(assignment.settingsOverrides.italic, true);
	await page.getByRole('button', { name: 'Edit settings', exact: true }).first().click();
	await authored.locator('#italic').uncheck();
	await page.getByRole('button', { name: 'Cancel', exact: true }).click();
	assert.equal(
		await page.evaluate(
			() =>
				window.uiHarness.store.getSnapshot().registry.themes[0].design.elements.blockquote
					.settingsOverrides.italic,
		),
		true,
	);
	await page.getByRole('button', { name: 'Manage elements', exact: true }).click();
	const importedRow = page
		.locator('.book-designer-element-library-row')
		.filter({ has: page.getByRole('heading', { name: 'Imported quotation', exact: true }) });
	await importedRow.getByRole('button', { name: 'Duplicate', exact: true }).click();
	const copyRow = page
		.locator('.book-designer-element-library-row')
		.filter({ has: page.getByRole('heading', { name: 'Imported quotation copy', exact: true }) });
	await copyRow.getByRole('button', { name: 'Edit details', exact: true }).click();
	await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Local quotation');
	await page.getByRole('dialog').getByRole('button', { name: 'Next', exact: true }).click();
	await page.getByRole('dialog').getByLabel('Description', { exact: true }).fill('');
	await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
	const localRow = page
		.locator('.book-designer-element-library-row')
		.filter({ has: page.getByRole('heading', { name: 'Local quotation', exact: true }) });
	await localRow.getByRole('button', { name: 'Disable', exact: true }).click();
	assert.equal(await localRow.getByRole('button', { name: 'Preview', exact: true }).isDisabled(), true);
	await localRow.getByRole('button', { name: 'Enable', exact: true }).click();
	await localRow.getByRole('button', { name: 'Delete', exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
	await page.waitForFunction(() => window.uiHarness.store.getSnapshot().registry.elements.length === 1);
	const originalSource = await page.evaluate(() => window.uiHarness.getSource());
	await page.evaluate(() => {
		const { store } = window.uiHarness;
		const registry = store.getSnapshot().registry;
		store.updateCustomTheme(registry.themes[0].id, {
			design: {
				elements: {
					blockquote: {
						elementId: registry.elements[0].id,
						presetId: 'classic-rule',
						settingsOverrides: { inset: 2 },
					},
				},
			},
		});
		store.applyTheme(registry.themes[0].id);
		store.duplicateProject(registry.projects[0].id, 'Closed book');
		window.uiHarness.setSource(
			window.uiHarness.getSource().replace('1.0.0', '1.1.0').replace('"spacing": 1.5', '"spacing": 2'),
		);
	});
	assert.equal(await importedRow.getByRole('button', { name: 'Delete', exact: true }).isDisabled(), true);
	await importedRow.getByRole('button', { name: 'Replace element file', exact: true }).click();
	await page.getByRole('button', { name: 'Elements/quotation.html' }).click();
	await page
		.getByRole('dialog')
		.getByText(/Closed book/)
		.waitFor();
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await page.getByRole('button', { name: 'Approve authoring code', exact: true }).click();
	await importedRow.getByText(/Blockquote · 1.1.0/).waitFor();
	const effective = await page.evaluate(() => window.uiHarness.effectiveSettings());
	assert.equal(effective.length, 2);
	assert.ok(effective.every((value) => value.inset === 2 && value.spacing === 1.5));
	await importedRow.getByRole('button', { name: 'Restore previous file', exact: true }).click();
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await importedRow.getByText(/Blockquote · 1.0.0/).waitFor();
	await importedRow.getByRole('button', { name: 'Duplicate backup', exact: true }).click();
	await page.getByRole('heading', { name: 'Imported quotation copy', exact: true }).waitFor();
	assert.equal(
		await page.evaluate(() => window.uiHarness.getSource()),
		originalSource.replace('1.0.0', '1.1.0').replace('"spacing": 1.5', '"spacing": 2'),
		'Library operations never edit the authored vault file',
	);
	await page.getByRole('searchbox', { name: 'Search elements' }).fill('does not exist');
	assert.equal(await page.locator('.book-designer-element-library-row').count(), 0);
	await page.getByRole('searchbox', { name: 'Search elements' }).fill('');
	await importedRow.getByRole('button', { name: 'Duplicate', exact: true }).click();
	await page.waitForFunction(() => window.uiHarness.service.entries().length === 4);
	await importedRow.getByRole('button', { name: 'Duplicate', exact: true }).click();
	await page.waitForFunction(() => window.uiHarness.service.entries().length === 5);
	await page.locator('.book-designer-theme-per-page select').selectOption('4');
	await page.getByRole('button', { name: 'Next page', exact: true }).click();
	assert.equal(await page.locator('.book-designer-element-library-row').count(), 1);
	await page.getByRole('button', { name: 'Previous page', exact: true }).click();
	await page.locator('.book-designer-theme-per-page select').selectOption('8');
	await mkdir('dist', { recursive: true });
	await page.screenshot({ path: 'dist/elements-library.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: 'dist/elements-library-narrow.png', fullPage: true });
	assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.evaluate(() => {
		const { store } = window.uiHarness;
		const project = store.getSnapshot().registry.projects[0];
		store.selectProject(project.id);
		window.uiHarness.openPreview();
	});
	// The active manuscript is reloaded explicitly by the source adapter in this harness.
	await page.evaluate(() => {
		const { store } = window.uiHarness;
		const project = store.getSnapshot().activeProject;
		store.setRuntimeBook(project.id, {
			id: project.id,
			metadata: project.metadata,
			sections: [
				{
					id: 'q',
					type: 'chapter',
					title: 'Live quotation',
					source: { vaultPath: 'Manuscript/q.md' },
					blocks: Array.from({ length: 12 }, () => ({
						type: 'blockquote',
						blocks: [
							{
								type: 'paragraph',
								inlines: [
									{
										type: 'text',
										text: 'A passage that remains readable during reflow and manuscript refresh.',
									},
								],
							},
						],
					})),
				},
			],
		});
	});
	await page
		.frameLocator('iframe[title="Book preview"]')
		.locator('blockquote[class^="bd-element-"]')
		.first()
		.waitFor();
	await page.evaluate(() => window.uiHarness.store.updatePreview({ readerScale: 250, mode: 'paged' }));
	await page.locator('.book-preview-device-stage').hover();
	await page.getByRole('button', { name: 'Next page', exact: true }).waitFor();
	await page.getByRole('button', { name: 'Next page', exact: true }).click();
	assert.ok(
		(await page.evaluate(() => window.uiHarness.store.getSnapshot().activeProject.preview.pageIndex)) > 0,
	);
	await page.screenshot({ path: 'dist/elements-reader-large.png' });
	await page.evaluate(() => window.uiHarness.dispose());
	assert.equal(await page.locator('iframe').count(), 0);
	assert.deepEqual(errors, []);
	console.log(
		'React UI passed: project-independent CRUD/approval, five slots, shared catalog, Reset/Apply/Cancel, closed-book replacement/recovery, search/pagination, narrow layout, large reader reflow, cleanup.',
	);
} finally {
	await browser.close();
	await new Promise((resolve) => server.close(resolve));
}
