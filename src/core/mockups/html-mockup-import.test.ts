import { describe, expect, it } from 'vitest';
import { normalizeMockupColorConfig, normalizeMockupPostures } from './html-mockup-import';

describe('mockup posture declarations', () => {
	it('accepts sequential fold states and retains their cycling order', () => {
		expect(normalizeMockupPostures([
			{ id: 'unfold', label: 'Unfolded', frame: { left: 0, top: 0, width: 800, height: 600 } },
			{ id: 'fold1', label: 'Folded closed', frame: { left: 200, top: 100, width: 400, height: 600 } },
			{ id: 'fold2', label: 'Tent mode', frame: { left: 120, top: 180, width: 560, height: 500 } },
		])).toEqual([
			{ id: 'unfold', label: 'Unfolded', frame: { left: 0, top: 0, width: 800, height: 600 } },
			{ id: 'fold1', label: 'Folded closed', frame: { left: 200, top: 100, width: 400, height: 600 } },
			{ id: 'fold2', label: 'Tent mode', frame: { left: 120, top: 180, width: 560, height: 500 } },
		]);
	});

	it('rejects skipped, duplicate, or nonstandard posture IDs', () => {
		expect(normalizeMockupPostures([{ id: 'unfold' }, { id: 'fold2' }])).toBeNull();
		expect(normalizeMockupPostures([{ id: 'fold1' }])).toBeNull();
		expect(normalizeMockupPostures([{ id: 'unfold' }, { id: 'fold1' }, { id: 'fold1' }])).toBeNull();
	});

	it('normalizes the explicit color capability contract', () => {
		expect(normalizeMockupColorConfig({ mode: 'tonal-ramp', hardware: 'fixed' })).toEqual({ mode: 'tonal-ramp', hardware: 'fixed' });
		expect(normalizeMockupColorConfig({ mode: 'tonal-ramp' })).toBeNull();
		expect(normalizeMockupColorConfig({ mode: 'gradient', hardware: 'dynamic' })).toBeNull();
	});
});
