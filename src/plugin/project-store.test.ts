import { describe, expect, it } from 'vitest';
import { BookProjectStore, renderPreviewState } from './project-store';

describe('BookProjectStore', () => {
	it('notifies subscribers when design changes', () => {
		const store = new BookProjectStore();
		let notificationCount = 0;
		const unsubscribe = store.subscribe(() => {
			notificationCount += 1;
		});

		store.updateDesign({ themeId: 'modern' });
		unsubscribe();
		store.updateDesign({ themeId: 'minimal' });

		expect(notificationCount).toBe(1);
	});

	it('uses one shared state for designer changes and preview rendering', () => {
		const store = new BookProjectStore();

		store.updateMetadata({
			title: 'The Test Manuscript',
			author: 'Rafael Seno',
		});
		store.updateDesign({
			themeId: 'modern',
			typographyScale: 'spacious',
			chapterStyleId: 'ornament',
			sceneBreakId: 'asterisks',
		});

		expect(renderPreviewState(store.getSnapshot())).toMatchObject({
			title: 'The Test Manuscript',
			author: 'Rafael Seno',
			themeLabel: 'Modern',
			typographyLabel: 'Spacious',
			chapterStyleLabel: 'Ornament',
			sceneBreakLabel: 'Asterisks',
		});
	});
});
