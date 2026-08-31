/** Canonical publication values, never derived from the host application's UI theme. */
export function publicationTokens(design: { themeId: 'classic' | 'modern' | 'minimal' }): {
	font: string;
	ink: string;
	accent: string;
} {
	return design.themeId === 'modern'
		? { font: 'system-ui, sans-serif', ink: '#20252d', accent: '#305f79' }
		: design.themeId === 'minimal'
			? { font: 'Georgia, serif', ink: '#222222', accent: '#222222' }
			: { font: 'Georgia, serif', ink: '#2a221b', accent: '#805c2a' };
}
