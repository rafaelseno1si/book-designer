import { describe, expect, it } from 'vitest';
import { normalizeBookDesignerData } from './data';

describe('normalizeBookDesignerData', () => {
	it('migrates Phase 0 flat settings and creates an empty versioned registry', () => {
		expect(normalizeBookDesignerData({ defaultPreviewDevice: 'tablet', debugLogging: true })).toEqual({
			version: 1,
			settings: { defaultPreviewDevice: 'tablet', debugLogging: true },
			projects: { version: 1, projects: [], activeProjectId: null },
		});
	});
});
