import type { ElementContext } from '../../core/elements/types';
import type { BookProject, BookProjectDesign } from '../project-store';
import type { BookPrintSettings } from '../print-settings';
import { publicationTokens } from '../../core/renderer/theme-tokens';
export function elementContext(
	project: BookProject | null,
	design: BookProjectDesign,
	printDraft?: BookPrintSettings | null,
): ElementContext {
	const tokens = publicationTokens(design);
	const print = printDraft ?? (project?.preview.deviceId === 'print' ? project.print : null);
	return {
		target: print ? 'print' : 'ebook',
		language: project?.metadata.language ?? 'english',
		slot: 'block.blockquote',
		bodyFontFamily: tokens.font,
		textColor: tokens.ink,
		accentColor: tokens.accent,
		...(print
			? {
					print: {
						unit: 'in' as const,
						width: print.trimWidthIn,
						height: print.trimHeightIn,
						inside: print.contentInsideIn,
						outside: print.contentOutsideIn,
						top: print.headerTotalIn,
						bottom: print.footerTotalIn,
					},
				}
			: {}),
	};
}
