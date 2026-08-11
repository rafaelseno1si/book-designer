export interface SourceDocument {
	id: string;
	vaultPath: string;
	content: string;
}

export interface ManuscriptSource {
	id: string;
	type: string;
	files: SourceDocument[];
}

export interface ManuscriptSourceAdapter<TConfig> {
	readonly type: TConfig extends { type: infer TType } ? TType : string;
	load(config: TConfig): Promise<ManuscriptSource>;
}

/** A small port implemented by the Obsidian integration, not by the core. */
export interface VaultManuscriptReader {
	listMarkdownFiles(): Promise<string[]>;
	readMarkdownFile(vaultPath: string): Promise<string>;
}
