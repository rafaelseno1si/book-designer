import { record } from '../../core/elements/validation';

interface LocalApprovalStorage {
	loadLocalStorage?: (key: string) => unknown;
	saveLocalStorage?: (key: string, value: unknown) => void;
}
const KEY = 'book-designer.element-approvals.v1';
export class ElementApprovals {
	private readonly approved = new Set<string>();
	readonly remembered: boolean;
	constructor(private readonly storage: LocalApprovalStorage) {
		this.remembered =
			typeof storage.loadLocalStorage === 'function' && typeof storage.saveLocalStorage === 'function';
		try {
			const value = this.remembered ? storage.loadLocalStorage?.(KEY) : null;
			if (record(value) && Array.isArray(value.digests))
				for (const digest of value.digests)
					if (typeof digest === 'string' && /^[a-f0-9]{64}$/.test(digest))
						this.approved.add(digest);
		} catch {
			/* Corrupt/unavailable storage never grants approval. */
		}
	}
	has(digest: string): boolean {
		return this.approved.has(digest);
	}
	approve(digest: string): void {
		if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid approval digest.');
		if (this.remembered)
			this.storage.saveLocalStorage?.(KEY, { digests: [...new Set([...this.approved, digest])] });
		this.approved.add(digest);
	}
}
