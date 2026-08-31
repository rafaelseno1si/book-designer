import type { InspectedElement } from '../../core/elements/types';
import { ELEMENT_LIMITS } from '../../core/elements/types';
import { escapeXhtml } from '../../core/elements/output-validation';
import { bounded, record } from '../../core/elements/validation';
import { parseBridgeMessage, type BridgeMessage } from './protocol';
import { guardBootstrap, runnerBootstrap } from './runner-bootstrap';

const CSP =
	"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";
export class ElementSandbox {
	private readonly frame: HTMLIFrameElement;
	private readonly session = crypto.randomUUID();
	private readonly channel = new MessageChannel();
	private readonly pending = new Map<
		number,
		{
			revision: number;
			resolve: (value: unknown) => void;
			reject: (reason: Error) => void;
			timer: number;
		}
	>();
	private requestId = 0;
	private eventSequence = -1;
	private disposed = false;
	private readyResolve!: () => void;
	private readyReject!: (error: Error) => void;
	private readyTimer: number;
	private readonly ready: Promise<void>;
	private rateStart = Date.now();
	private rateCount = 0;
	private probe: boolean;
	private blockedResolve!: () => void;
	private readonly blocked = new Promise<void>((resolve) => {
		this.blockedResolve = resolve;
	});
	onEvent?: (message: BridgeMessage) => void;
	constructor(
		private readonly container: HTMLElement,
		element: InspectedElement | null,
	) {
		this.probe = element === null;
		const document = container.ownerDocument;
		this.frame = document.createElement('iframe');
		this.frame.title = element?.manifest.name ?? 'Element isolation check';
		this.frame.className = 'book-designer-element-frame';
		this.frame.setAttribute('sandbox', 'allow-scripts');
		this.frame.referrerPolicy = 'no-referrer';
		this.ready = new Promise((resolve, reject) => {
			this.readyResolve = resolve;
			this.readyReject = reject;
		});
		// Attach a handler immediately: disposal can occur before a request awaits readiness.
		void this.ready.catch(() => undefined);
		this.readyTimer = window.setTimeout(
			() => this.dispose(new Error('Element handshake timed out.')),
			ELEMENT_LIMITS.handshakeMs,
		);
		document.defaultView?.addEventListener('message', this.handleWindowMessage);
		this.channel.port1.onmessage = (event: MessageEvent<unknown>) => this.receive(event.data);
		this.channel.port1.start();
		this.frame.addEventListener(
			'load',
			() => {
				if (!this.disposed)
					this.frame.contentWindow?.postMessage(`bd-connect:${this.session}`, '*', [
						this.channel.port2,
					]);
			},
			{ once: true },
		);
		const policy = `<meta http-equiv="Content-Security-Policy" content="${escapeXhtml(CSP)}">`;
		const bootstrap = `<script>(${runnerBootstrap.toString()})();</script>`;
		// Parsed package content is placed AFTER the policy and bridge in a fresh document.
		const source = element?.editorHtml ?? '<html><head></head><body></body></html>';
		const runner = source.replace('<head>', `<head>${policy}${bootstrap}`);
		const encoded = JSON.stringify(runner).replaceAll('<', '\\u003c');
		this.frame.srcdoc = `<!doctype html><html><head>${policy}<style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head><body><script>(${guardBootstrap.toString()})(${encoded},${JSON.stringify(this.session)});</script></body></html>`;
		container.appendChild(this.frame);
	}
	private handleWindowMessage = (event: MessageEvent<unknown>): void => {
		if (event.source !== this.frame.contentWindow) return;
		if (event.data === `bd-ready:${this.session}`) {
			window.clearTimeout(this.readyTimer);
			this.readyResolve();
		}
		if (event.data === `bd-blocked-navigation:${this.session}`) this.blockedResolve();
		if (event.data === `bd-navigation:${this.session}` && !this.probe)
			this.dispose(new Error('Element attempted to navigate its runner.'));
	};
	private receive(value: unknown): void {
		if (this.disposed) return;
		if (Date.now() - this.rateStart > 1000) {
			this.rateStart = Date.now();
			this.rateCount = 0;
		}
		if (++this.rateCount > 100) {
			this.dispose(new Error('Element exceeded the message-rate limit.'));
			return;
		}
		try {
			const message = parseBridgeMessage(value, this.session);
			if (message.type === 'changed' || message.type === 'height') {
				if (message.requestId <= this.eventSequence) return;
				this.eventSequence = message.requestId;
				this.onEvent?.(message);
				return;
			}
			const pending = this.pending.get(message.requestId);
			if (!pending || message.revision !== pending.revision) return;
			if (message.type !== 'result' && message.type !== 'error')
				throw new Error('Unexpected response type.');
			window.clearTimeout(pending.timer);
			this.pending.delete(message.requestId);
			if (message.type === 'error')
				pending.reject(
					new Error(
						record(message.payload) && typeof message.payload.message === 'string'
							? message.payload.message.slice(0, 1000)
							: 'Element failed.',
					),
				);
			else pending.resolve(message.payload);
		} catch (error) {
			this.dispose(error instanceof Error ? error : new Error('Invalid element message.'));
		}
	}
	async request(
		type: 'init' | 'read' | 'render' | 'probe',
		payload: unknown,
		revision: number,
	): Promise<unknown> {
		await this.ready;
		if (this.disposed) throw new Error('Element session closed.');
		const requestId = ++this.requestId;
		const message = JSON.stringify({
			protocol: 1,
			session: this.session,
			requestId,
			revision,
			type,
			payload,
		});
		bounded(message, ELEMENT_LIMITS.message, 'Request');
		return new Promise((resolve, reject) => {
			const timer = window.setTimeout(
				() => this.dispose(new Error('Element request timed out.')),
				ELEMENT_LIMITS.requestMs,
			);
			this.pending.set(requestId, { resolve, reject, timer, revision });
			this.channel.port1.postMessage(message);
		});
	}
	async navigationWasBlocked(): Promise<boolean> {
		let timer = 0;
		try {
			return await Promise.race([
				this.blocked.then(() => true),
				new Promise<false>((resolve) => {
					timer = window.setTimeout(() => resolve(false), 500);
				}),
			]);
		} finally {
			window.clearTimeout(timer);
		}
	}
	dispose(error = new Error('Element session closed.')): void {
		if (this.disposed) return;
		this.disposed = true;
		window.clearTimeout(this.readyTimer);
		this.readyReject(error);
		this.container.ownerDocument.defaultView?.removeEventListener('message', this.handleWindowMessage);
		for (const pending of this.pending.values()) {
			window.clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pending.clear();
		this.channel.port1.close();
		this.channel.port2.close();
		this.frame.remove();
	}
}

export async function verifyElementIsolation(container: HTMLElement, signal?: AbortSignal): Promise<boolean> {
	const sandbox = new ElementSandbox(container, null);
	const abort = () => sandbox.dispose();
	signal?.addEventListener('abort', abort, { once: true });
	if (signal?.aborted) abort();
	try {
		const result = await sandbox.request('probe', {}, 0);
		return (
			record(result) &&
			result.parentBlocked === true &&
			result.privileged === false &&
			(await sandbox.navigationWasBlocked())
		);
	} catch {
		return false;
	} finally {
		signal?.removeEventListener('abort', abort);
		sandbox.dispose();
	}
}
