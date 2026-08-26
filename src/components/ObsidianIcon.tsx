import { useEffect, useRef } from 'react';
import { setIcon, type IconName } from 'obsidian';

export function ObsidianIcon({ name }: { name: IconName }) {
	const iconRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (iconRef.current) setIcon(iconRef.current, name);
	}, [name]);

	return <span ref={iconRef} className="book-designer-icon" aria-hidden="true" />;
}
