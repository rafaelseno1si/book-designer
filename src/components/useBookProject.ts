import { useSyncExternalStore } from 'react';
import type {
	BookProjectState,
	BookProjectStore,
} from '../plugin/project-store';

export function useBookProject(projectStore: BookProjectStore): BookProjectState {
	return useSyncExternalStore(
		(listener) => projectStore.subscribe(listener),
		() => projectStore.getSnapshot(),
		() => projectStore.getSnapshot(),
	);
}
