import { describe, expect, it } from 'vitest';
import { parseImportedMockupManifest, previewMockup } from './preview-mockup';

describe('preview mockup manifests', () => {
	it('keeps Kindle geometry declarative and validates import-safe manifests', () => {
		expect(previewMockup('kindle-paperwhite').screen).toMatchObject({ top: 6.17, width: 83.78, height: 80.41 });
		expect(parseImportedMockupManifest({
			version: 1,
			id: 'my-reader',
			name: 'My Reader',
			screen: { top: 8, left: 8, width: 84, height: 80, borderRadius: 2 },
			frame: { background: '#202020', borderColor: '#111111', borderRadius: 4 },
		})).toMatchObject({ id: 'my-reader', name: 'My Reader' });
		expect(parseImportedMockupManifest({ version: 1, id: 'bad', name: 'Bad', screen: {}, frame: {} })).toBeNull();
	});
});
