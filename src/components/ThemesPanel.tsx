import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../core/model/book-model';
import type { BookProjectSnapshot, BookProjectStore } from '../plugin/project-store';
import { selectedThemeOptionId, type ThemeElementSlotId } from '../plugin/theme-catalog';
import { ObsidianIcon } from './ObsidianIcon';
import { ThemeCatalogPage } from './ThemeCatalogPage';
import {
	ThemeEditorOverview,
	ThemeElementPresetsPage,
	ThemeElementSettingsPage,
} from './ThemeEditorPage';
import { ThemeElementsNavigation } from './ThemeElementsNavigation';

type ThemeScreen =
	| { kind: 'catalog' }
	| { kind: 'editor'; themeId: string }
	| { kind: 'presets'; themeId: string; slot: ThemeElementSlotId }
	| { kind: 'settings'; themeId: string; slot: ThemeElementSlotId; presetId: string };

export function ThemesPanel({ snapshot, projectStore }: { snapshot: BookProjectSnapshot; projectStore: BookProjectStore }) {
	const [screen, setScreen] = useState<ThemeScreen>({ kind: 'catalog' });
	const [elementsCollapsed, setElementsCollapsed] = useState(false);
	const project = snapshot.activeProject;
	const previewBook = useMemo(() => firstRootChapterBook(snapshot), [snapshot.runtime.book, project?.id, project?.source.path]);
	const themes = useMemo(() => projectStore.getThemeOptions(), [projectStore, snapshot.registry.themes]);
	const editingTheme = screen.kind === 'catalog' ? null : snapshot.registry.themes.find((theme) => theme.id === screen.themeId) ?? null;
	const activeSlot = screen.kind === 'presets' || screen.kind === 'settings' ? screen.slot : null;

	useEffect(() => () => projectStore.setDesignPreview(null), [projectStore]);
	useEffect(() => {
		projectStore.setDesignPreview(null);
		setScreen({ kind: 'catalog' });
	}, [project?.id]);

	if (!project) {
		return (
			<section className="book-designer-theme-empty">
				<ObsidianIcon name="palette" />
				<h1>Themes</h1>
				<p>Create or open a project before browsing chapter-based theme previews.</p>
			</section>
		);
	}

	if (screen.kind === 'catalog') {
		return (
			<ThemeCatalogPage
				themes={themes}
				book={previewBook}
				appliedThemeId={selectedThemeOptionId(project.design)}
				projectStore={projectStore}
				onEditTheme={(themeId) => setScreen({ kind: 'editor', themeId })}
			/>
		);
	}

	if (!editingTheme) {
		return (
			<section className="book-designer-theme-empty">
				<h1>Theme unavailable</h1>
				<p>The custom theme may have been removed or replaced.</p>
				<button type="button" onClick={() => setScreen({ kind: 'catalog' })}>Return to themes</button>
			</section>
		);
	}

	return (
		<div className={`book-designer-theme-editor-shell${elementsCollapsed ? ' is-elements-collapsed' : ''}`}>
			<div className="book-designer-theme-editor-content">
				{screen.kind === 'editor' && (
					<ThemeEditorOverview
						theme={editingTheme}
						book={previewBook}
						projectStore={projectStore}
						onBack={() => setScreen({ kind: 'catalog' })}
						onOpenSlot={(slot) => setScreen({ kind: 'presets', themeId: editingTheme.id, slot })}
					/>
				)}
				{screen.kind === 'presets' && (
					<ThemeElementPresetsPage
						theme={editingTheme}
						slot={screen.slot}
						book={previewBook}
						projectStore={projectStore}
						onBack={() => setScreen({ kind: 'editor', themeId: editingTheme.id })}
						onEditPreset={(presetId) => setScreen({ kind: 'settings', themeId: editingTheme.id, slot: screen.slot, presetId })}
					/>
				)}
				{screen.kind === 'settings' && (
					<ThemeElementSettingsPage
						theme={editingTheme}
						slot={screen.slot}
						presetId={screen.presetId}
						book={previewBook}
						projectStore={projectStore}
						onBack={() => setScreen({ kind: 'presets', themeId: editingTheme.id, slot: screen.slot })}
					/>
				)}
			</div>
			<ThemeElementsNavigation
				collapsed={elementsCollapsed}
				activeSlot={activeSlot}
				onToggle={() => setElementsCollapsed((collapsed) => !collapsed)}
				onSelect={(slot) => {
					projectStore.setDesignPreview(null);
					setScreen({ kind: 'presets', themeId: editingTheme.id, slot });
				}}
			/>
		</div>
	);
}

function firstRootChapterBook(snapshot: BookProjectSnapshot): Book | null {
	const book = snapshot.runtime.book;
	const project = snapshot.activeProject;
	if (!book || !project) return null;
	const folder = project.source.path.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
	const section = book.sections.find((candidate) => {
		const path = candidate.source.vaultPath.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
		const relative = folder ? path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : path : path;
		return relative.length > 0 && !relative.includes('/');
	}) ?? null;
	return section ? { ...book, sections: [section] } : null;
}
