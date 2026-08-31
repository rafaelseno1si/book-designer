import {
	THEME_ELEMENT_SLOT_IDS,
	THEME_ELEMENT_SLOT_LABELS,
	type ThemeElementSlotId,
} from '../plugin/theme-catalog';
import { ObsidianIcon } from './ObsidianIcon';

export function ThemeElementsNavigation({
	collapsed,
	activeSlot,
	onToggle,
	onSelect,
}: {
	collapsed: boolean;
	activeSlot: ThemeElementSlotId | null;
	onToggle: () => void;
	onSelect: (slot: ThemeElementSlotId) => void;
}) {
	return (
		<aside className={`book-designer-theme-elements${collapsed ? ' is-collapsed' : ''}`}>
			<div className="book-designer-theme-elements-header">
				<span><ObsidianIcon name="blocks" /><strong>Theme elements</strong></span>
				<button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand theme elements' : 'Collapse theme elements'} title={collapsed ? 'Expand theme elements' : 'Collapse theme elements'}>
					<ObsidianIcon name={collapsed ? 'panel-right-open' : 'panel-right-close'} />
				</button>
			</div>
			<nav aria-label="Theme elements">
				{THEME_ELEMENT_SLOT_IDS.map((slot) => (
					<button key={slot} type="button" className={activeSlot === slot ? 'is-selected' : undefined} onClick={() => onSelect(slot)} title={collapsed ? THEME_ELEMENT_SLOT_LABELS[slot] : undefined} aria-label={THEME_ELEMENT_SLOT_LABELS[slot]}>
						<ObsidianIcon name={slotIcon(slot)} />
						<span>{THEME_ELEMENT_SLOT_LABELS[slot]}</span>
					</button>
				))}
			</nav>
		</aside>
	);
}

function slotIcon(slot: ThemeElementSlotId): Parameters<typeof ObsidianIcon>[0]['name'] {
	switch (slot) {
		case 'chapter-opening': return 'heading-1';
		case 'first-paragraph': return 'pilcrow';
		case 'typography': return 'type';
		case 'ornamental-break': return 'separator-horizontal';
		case 'blockquote': return 'quote';
	}
}
