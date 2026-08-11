import { useSyncExternalStore } from 'react';
import type {
	BookProjectSnapshot,
	BookProjectStore,
} from '../plugin/project-store';

export function useBookProject(projectStore: BookProjectStore): BookProjectSnapshot {
	return useSyncExternalStore(
		(listener) => projectStore.subscribe(listener),
		() => projectStore.getSnapshot(),
		() => projectStore.getSnapshot(),
	);
}
