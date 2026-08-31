/** Host-owned code. Stringified into the opaque runner, never runs package code in the host. */
export function runnerBootstrap(): void {
	let api: {
		applySettings: (settings: unknown, context: unknown) => unknown;
		readSettings: () => unknown;
		render: (input: unknown) => unknown;
	} | null = null;
	let port: MessagePort | null = null;
	let session = '';
	let revision = 0;
	let sequence = 0;
	let applying = false;
	let requests: Promise<void> = Promise.resolve();
	const send = (type: string, payload: unknown, requestId = ++sequence, rev = revision) => {
		const json = JSON.stringify({ protocol: 1, session, requestId, revision: rev, type, payload });
		if (json.length <= 131072) port?.postMessage(json);
	};
	Object.defineProperty(window, 'BookDesignerElement', {
		value: Object.freeze({
			register(value: typeof api) {
				if (
					api ||
					!value ||
					typeof value.applySettings !== 'function' ||
					typeof value.readSettings !== 'function' ||
					typeof value.render !== 'function'
				)
					throw new Error('Register one complete element API.');
				api = value;
			},
			notifySettingsChanged() {
				if (!applying && api && port) send('changed', api.readSettings());
			},
		}),
	});
	window.addEventListener('message', function connect(event: MessageEvent<unknown>) {
		if (
			event.source !== parent ||
			port ||
			typeof event.data !== 'string' ||
			!event.data.startsWith('bd-connect:') ||
			event.ports.length !== 1
		)
			return;
		session = event.data.slice(11);
		port = event.ports[0] ?? null;
		if (!port) return;
		window.removeEventListener('message', connect);
		port.onmessage = (event: MessageEvent<unknown>) => {
			requests = requests
				.then(async () => {
					if (typeof event.data !== 'string' || event.data.length > 131072) return;
					const message = JSON.parse(event.data) as {
						protocol: number;
						session: string;
						type: string;
						requestId: number;
						revision: number;
						payload: { settings?: unknown; context?: unknown; uiTokens?: Record<string, string> };
					};
					if (
						message.protocol !== 1 ||
						message.session !== session ||
						!Number.isSafeInteger(message.revision) ||
						message.revision < revision
					)
						return;
					revision = message.revision;
					try {
						let result: unknown = null;
						if (message.type === 'probe') {
							let parentBlocked = false;
							try {
								void parent.document.body;
							} catch {
								parentBlocked = true;
							}
							const privileged = 'require' in window || 'process' in window || 'app' in window;
							send(
								'result',
								{ parentBlocked, privileged },
								message.requestId,
								message.revision,
							);
							// A synthetic data document contains no network address or private data.
							window.location.href = 'data:text/html,<title>Blocked navigation probe</title>';
							return;
						} else {
							if (!api) throw new Error('Element did not register its API.');
							if (message.type === 'init') {
								applying = true;
								for (const [key, value] of Object.entries(message.payload.uiTokens ?? {})) {
									if (
										/^--bd-ui-(text|background|surface|muted|border|accent)$/.test(key) &&
										value.length < 100
									)
										document.documentElement.style.setProperty(key, value);
								}
								await api.applySettings(message.payload.settings, message.payload.context);
								result = api.readSettings();
								send('height', Math.min(800, Math.max(160, document.body.scrollHeight)));
							} else if (message.type === 'read') result = api.readSettings();
							else if (message.type === 'render') result = await api.render(message.payload);
							else throw new Error('Unsupported request.');
						}
						send('result', result, message.requestId, message.revision);
					} catch (error) {
						send(
							'error',
							{
								message:
									error instanceof Error
										? error.message.slice(0, 1000)
										: 'Element request failed.',
							},
							message.requestId,
							message.revision,
						);
					} finally {
						applying = false;
					}
				})
				.catch(() => send('error', { message: 'Malformed request.' }));
		};
		port.start();
		const observer = new ResizeObserver(() =>
			send('height', Math.min(800, Math.max(160, document.body.scrollHeight))),
		);
		observer.observe(document.body);
		window.addEventListener(
			'pagehide',
			() => {
				observer.disconnect();
				port?.close();
			},
			{ once: true },
		);
	});
}

/** A trusted outer document holds the frame-src policy outside the package's reach. */
export function guardBootstrap(runnerHtml: string, session: string): void {
	window.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent) => {
		if (event.violatedDirective === 'frame-src')
			parent.postMessage(`bd-blocked-navigation:${session}`, '*');
	});
	// This opaque document has no Obsidian DOM extensions.
	const child = document.body.ownerDocument.createElement('iframe');
	child.title = 'Element authoring runner';
	child.setAttribute('sandbox', 'allow-scripts');
	let port: MessagePort | null = null;
	let loaded = false;
	let transferred = false;
	const connect = () => {
		if (loaded && port && !transferred) {
			transferred = true;
			child.contentWindow?.postMessage(`bd-connect:${session}`, '*', [port]);
			parent.postMessage(`bd-ready:${session}`, '*');
		}
	};
	window.addEventListener('message', (event: MessageEvent<unknown>) => {
		if (
			event.source !== parent ||
			event.data !== `bd-connect:${session}` ||
			port ||
			event.ports.length !== 1
		)
			return;
		port = event.ports[0] ?? null;
		connect();
	});
	child.addEventListener('load', () => {
		if (loaded) {
			parent.postMessage(`bd-navigation:${session}`, '*');
			return;
		}
		loaded = true;
		connect();
	});
	child.srcdoc = runnerHtml;
	document.body.appendChild(child);
}
