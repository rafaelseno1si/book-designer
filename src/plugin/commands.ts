import type BookDesignerPlugin from '../main';
import {
	OPEN_BOOK_DESIGNER_COMMAND_ID,
	OPEN_BOOK_PREVIEW_COMMAND_ID,
} from './constants';

export function registerBookDesignerCommands(plugin: BookDesignerPlugin) {
	plugin.addCommand({
		id: OPEN_BOOK_DESIGNER_COMMAND_ID,
		name: 'Open',
		callback: () => {
			void plugin.activateDesignerView();
		},
	});

	plugin.addCommand({
		id: OPEN_BOOK_PREVIEW_COMMAND_ID,
		name: 'Open preview',
		callback: () => {
			void plugin.activatePreviewView();
		},
	});
}
