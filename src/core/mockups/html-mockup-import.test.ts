import { describe, expect, it } from 'vitest';
import { normalizeMockupPostures } from './html-mockup-import';

describe('mockup posture declarations', () => {
	it('accepts sequential fold states and retains their cycling order', () => {
		expect(normalizeMockupPostures([
			{ id: 'unfold', label: 'Unfolded' },
			{ id: 'fold1', label: 'Folded closed' },
			{ id: 'fold2', label: 'Tent mode' },
		])).toEqual([
			{ id: 'unfold', label: 'Unfolded' },
			{ id: 'fold1', label: 'Folded closed' },
			{ id: 'fold2', label: 'Tent mode' },
		]);
	});

	it('rejects skipped, duplicate, or nonstandard posture IDs', () => {
		expect(normalizeMockupPostures([{ id: 'unfold' }, { id: 'fold2' }])).toBeNull();
		expect(normalizeMockupPostures([{ id: 'fold1' }])).toBeNull();
		expect(normalizeMockupPostures([{ id: 'unfold' }, { id: 'fold1' }, { id: 'fold1' }])).toBeNull();
	});
});
