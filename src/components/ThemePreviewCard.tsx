import type { Book } from '../core/model/book-model';
import { CompiledThemePreview } from './elements/ElementServices';
import type { BookProjectDesign } from '../plugin/project-store';
import { ObsidianIcon } from './ObsidianIcon';

export interface ThemePreviewItem {
	id: string;
	name: string;
	description?: string;
	design: BookProjectDesign;
}

interface ThemePreviewCardProps {
	item: ThemePreviewItem;
	book: Book | null;
	selected: boolean;
	applied?: boolean;
	onPreview: (item: ThemePreviewItem) => void;
	onRestorePreview: () => void;
	onSelect: (item: ThemePreviewItem) => void;
	onEditDuplicate: (item: ThemePreviewItem) => void;
}

export function ThemePreviewCard({
	item,
	book,
	selected,
	applied = false,
	onPreview,
	onRestorePreview,
	onSelect,
	onEditDuplicate,
}: ThemePreviewCardProps) {
	const cardClasses = [
		'book-designer-theme-card',
		selected ? 'is-selected' : '',
		applied ? 'is-applied' : '',
	].filter(Boolean).join(' ');

	return (
		<article className={cardClasses}>
			<button
				type="button"
				className="book-designer-theme-preview-button"
				onPointerEnter={() => onPreview(item)}
				onPointerLeave={onRestorePreview}
				onFocus={() => onPreview(item)}
				onBlur={onRestorePreview}
				onClick={() => onSelect(item)}
				aria-pressed={selected}
			>
				<div className="book-designer-theme-preview-frame" aria-hidden="true">
					{book
						? <CompiledThemePreview title={`${item.name} theme preview`} book={book} design={item.design} />
						: <div className="book-designer-theme-preview-placeholder"><ObsidianIcon name="book-open" /><span>Open a project to preview its first chapter</span></div>}
				</div>
				<span className="book-designer-theme-card-copy">
					<span className="book-designer-theme-card-title"><strong>{item.name}</strong>{applied && <span>Applied</span>}</span>
					{item.description && <small>{item.description}</small>}
				</span>
			</button>
			<button
				type="button"
				className="book-designer-theme-duplicate-button"
				onClick={() => onEditDuplicate(item)}
				aria-label={`Edit a duplicate of ${item.name}`}
				title="Edit duplicate"
			>
				<ObsidianIcon name="copy-plus" />
				<span>Edit duplicate</span>
			</button>
		</article>
	);
}

export function ThemeActionBar({
	label,
	applyLabel,
	onApply,
	onCancel,
}: {
	label: string;
	applyLabel: string;
	onApply: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="book-designer-theme-action-bar" aria-label="Theme preview actions">
			<span>Previewing <strong>{label}</strong></span>
			<div>
				<button type="button" onClick={onCancel}>Cancel</button>
				<button type="button" className="mod-cta" onClick={onApply}>{applyLabel}</button>
			</div>
		</div>
	);
}
