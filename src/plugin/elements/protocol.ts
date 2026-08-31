import { ELEMENT_LIMITS } from '../../core/elements/types';
import { bounded, fail, onlyKeys, record } from '../../core/elements/validation';

export interface BridgeMessage {
	protocol: 1;
	session: string;
	requestId: number;
	revision: number;
	type: 'init' | 'read' | 'render' | 'result' | 'error' | 'changed' | 'height' | 'probe';
	payload: unknown;
}
export function parseBridgeMessage(value: unknown, session: string): BridgeMessage {
	if (typeof value !== 'string') fail('INVALID_MESSAGE', 'Bridge payload must be bounded JSON text.');
	bounded(value, ELEMENT_LIMITS.message, 'Message');
	const message: unknown = JSON.parse(value);
	if (!record(message)) fail('INVALID_MESSAGE', 'Invalid bridge envelope.');
	onlyKeys(message, ['protocol', 'session', 'requestId', 'revision', 'type', 'payload']);
	if (
		message.protocol !== 1 ||
		message.session !== session ||
		typeof message.requestId !== 'number' ||
		!Number.isSafeInteger(message.requestId) ||
		message.requestId < 0 ||
		typeof message.revision !== 'number' ||
		!Number.isSafeInteger(message.revision) ||
		message.revision < 0 ||
		typeof message.type !== 'string' ||
		!['init', 'read', 'render', 'result', 'error', 'changed', 'height', 'probe'].includes(message.type)
	)
		fail('INVALID_MESSAGE', 'Unexpected bridge session, revision, or message type.');
	if (
		message.type === 'height' &&
		(typeof message.payload !== 'number' ||
			!Number.isFinite(message.payload) ||
			message.payload < 160 ||
			message.payload > 800)
	)
		fail('INVALID_HEIGHT', 'Editor height must be between 160 and 800 CSS pixels.');
	return message as unknown as BridgeMessage;
}
