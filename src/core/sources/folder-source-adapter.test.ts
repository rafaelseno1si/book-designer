import { describe, expect, it } from 'vitest';
import { FolderSourceAdapter } from './folder-source-adapter';

describe('FolderSourceAdapter', () => {
	it('loads recursive Markdown files in deterministic natural path order', async () => {
		const contents: Record<string, string> = { 'Novel/10 Finale.md': 'ten', 'Novel/2 Start.md': 'two', 'Novel/Part/01 Middle.md': 'middle' };
		const adapter = new FolderSourceAdapter({ listMarkdownFiles: async () => ['Elsewhere/1.md', 'Novel/10 Finale.md', 'Novel/Part/01 Middle.md', 'Novel/2 Start.md'], readMarkdownFile: async (path) => contents[path] ?? '' });
		const source = await adapter.load({ type: 'folder', path: 'Novel' });
		expect(source.files.map((file) => file.vaultPath)).toEqual(['Novel/2 Start.md', 'Novel/10 Finale.md', 'Novel/Part/01 Middle.md']);
		expect(source.files.map((file) => file.content)).toEqual(['two', 'ten', 'middle']);
	});
});
