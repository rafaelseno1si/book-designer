import type {
	ManuscriptSource,
	ManuscriptSourceAdapter,
	VaultManuscriptReader,
} from './manuscript-source';

export interface FolderSourceConfig {
	type: 'folder';
	path: string;
}

const naturalPathCollator = new Intl.Collator('en', {
	numeric: true,
	sensitivity: 'base',
	usage: 'sort',
});

export class FolderSourceAdapter
	implements ManuscriptSourceAdapter<FolderSourceConfig>
{
	readonly type = 'folder' as const;

	constructor(private readonly reader: VaultManuscriptReader) {}

	async load(config: FolderSourceConfig): Promise<ManuscriptSource> {
		const folderPath = normalizeVaultPath(config.path);
		const paths = (await this.reader.listMarkdownFiles())
			.map(normalizeVaultPath)
			.filter((path) => isPathInsideFolder(path, folderPath))
			.sort(compareVaultPaths);
		const files = await Promise.all(
			paths.map(async (vaultPath) => ({
				id: vaultPath,
				vaultPath,
				content: await this.reader.readMarkdownFile(vaultPath),
			})),
		);

		return { id: `folder:${folderPath}`, type: this.type, files };
	}
}

export function isPathInsideFolder(path: string, folderPath: string): boolean {
	const normalizedPath = normalizeVaultPath(path);
	const normalizedFolder = normalizeVaultPath(folderPath);
	return normalizedFolder.length === 0 || normalizedPath.startsWith(`${normalizedFolder}/`);
}

export function compareVaultPaths(left: string, right: string): number {
	const naturalComparison = naturalPathCollator.compare(left, right);
	return naturalComparison !== 0 ? naturalComparison : left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeVaultPath(path: string): string {
	return path.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
}
