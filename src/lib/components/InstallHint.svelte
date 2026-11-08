<!--
	A button in the corner of the start screen for a grown-up: how to put the
	game on the home screen, where it plays full screen and offline. Chrome on
	Android installs it straight away; elsewhere it shows the steps in pictures.
	Hidden once it's installed and on computers. It glows until it's been opened once.
-->
<script lang="ts" module>
	import { install, type Install } from '#lib/install.ts';

	/** Chrome's own install offer, which it lets a page show when it likes. */
	type InstallPrompt = Event & { prompt(): Promise<void> };

	// Here, not in the component: Chrome makes its offer once per page load,
	// maybe while a game's on and this button isn't, and it's needed again
	// after every game.
	const hint = $state<{ kind: Install; offer: InstallPrompt | null }>({
		kind: 'none',
		offer: null
	});
	if (typeof window !== 'undefined') {
		hint.kind = install({
			userAgent: navigator.userAgent,
			maxTouchPoints: navigator.maxTouchPoints,
			installed:
				matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
				(navigator as { standalone?: boolean }).standalone === true
		});
		addEventListener('beforeinstallprompt', (e) => {
			// Computers keep Chrome's own install button.
			if (hint.kind === 'none') return;
			e.preventDefault();
			hint.offer = e as InstallPrompt;
		});
		addEventListener('appinstalled', () => {
			hint.kind = 'none';
			hint.offer = null;
		});
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	type Icon = 'share' | 'add' | 'menu' | 'app' | 'safari';

	/** Set once the button's been tapped, so it stops glowing. */
	const SEEN_KEY = 'squid-install-seen';

	let open = $state(false);
	let seen = $state(true);

	onMount(() => {
		try {
			seen = localStorage.getItem(SEEN_KEY) !== null;
		} catch {
			seen = false;
		}
	});

	async function tap() {
		seen = true;
		try {
			localStorage.setItem(SEEN_KEY, '1');
		} catch {
			// Private mode: it just keeps glowing.
		}
		if (hint.offer) {
			const offer = hint.offer;
			hint.offer = null;
			await offer.prompt();
		} else open = true;
	}

	const STEPS: Record<Exclude<Install, 'none'>, { icon: Icon; label: string; note?: string }[]> = {
		ios: [
			{ icon: 'share', label: 'Tap Share', note: 'or ••• then Share' },
			{ icon: 'add', label: 'Add to Home Screen' },
			{ icon: 'app', label: 'Play from there!' }
		],
		'ios-app': [
			{ icon: 'safari', label: 'Open in Safari', note: 'from the ••• menu' },
			{ icon: 'share', label: 'Tap Share' },
			{ icon: 'add', label: 'Add to Home Screen' }
		],
		android: [
			{ icon: 'menu', label: 'Tap the menu' },
			{ icon: 'add', label: 'Add to Home screen', note: 'or Install app' },
			{ icon: 'app', label: 'Play from there!' }
		]
	};
</script>

{#if hint.kind !== 'none'}
	<button class="block install" class:glow={!seen} onclick={tap} aria-label="Add to Home Screen">
		<!-- A phone with a plus. -->
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<rect
				x="5"
				y="2"
				width="14"
				height="20"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
			/>
			<path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.5" />
		</svg>
	</button>
{/if}

{#if open && hint.kind !== 'none'}
	<div class="sheet" role="dialog" aria-modal="true" aria-label="Add to Home Screen">
		<!-- Tapping outside closes it too; the tick is the button for that. -->
		<button class="backdrop" aria-hidden="true" tabindex="-1" onclick={() => (open = false)}
		></button>
		<div class="card">
			<h2>Add to Home Screen</h2>
			<ol>
				{#each STEPS[hint.kind] as step, i (i)}
					<li>
						<span class="n">{i + 1}</span>
						<span class="icon">
							{#if step.icon === 'app'}
								<img src="/icon-192.png" alt="" />
							{:else}
								<svg viewBox="0 0 24 24" aria-hidden="true">
									{#if step.icon === 'share'}
										<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
										<path d="M8 10H5v11h14V10h-3" />
									{:else if step.icon === 'add'}
										<rect x="3" y="3" width="18" height="18" rx="4" />
										<path d="M12 8v8M8 12h8" />
									{:else if step.icon === 'menu'}
										<circle cx="12" cy="5" r="1.6" class="dot" />
										<circle cx="12" cy="12" r="1.6" class="dot" />
										<circle cx="12" cy="19" r="1.6" class="dot" />
									{:else if step.icon === 'safari'}
										<!-- Safari's compass. -->
										<circle cx="12" cy="12" r="9.5" />
										<path d="M15.5 8.5l-2 5-5 2 2-5z" class="dot" />
									{/if}
								</svg>
							{/if}
						</span>
						<span class="label">{step.label}</span>
						{#if step.note}<span class="note">{step.note}</span>{/if}
					</li>
				{/each}
			</ol>
			<button class="block ok" aria-label="Close" onclick={() => (open = false)}>
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.5" /></svg
				>
			</button>
		</div>
	</div>
{/if}

<style>
	.install {
		position: absolute;
		bottom: max(14px, env(safe-area-inset-bottom));
		right: max(14px, env(safe-area-inset-right));
		width: 52px;
		height: 52px;
		padding: 0;
	}
	.glow {
		animation: glow 1.6s ease-in-out infinite;
	}
	@keyframes glow {
		50% {
			box-shadow:
				0 6px 0 var(--gold-dark),
				0 0 26px 6px var(--glow);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.glow {
			animation: none;
			box-shadow:
				0 6px 0 var(--gold-dark),
				0 0 20px 4px var(--glow);
		}
	}

	.sheet {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		z-index: 10;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(7, 26, 61, 0.75);
	}
	.card {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 3vh;
		width: min(92vw, 720px);
		padding: 4vh 24px;
		background: var(--sea-2);
		border: 4px solid var(--glow);
		box-shadow:
			0 0 0 4px var(--ink),
			0 0 40px rgba(124, 240, 255, 0.4);
	}
	h2 {
		margin: 0;
		font-size: clamp(24px, 7vh, 40px);
		font-weight: 400;
		color: var(--gold);
		text-shadow: 0 4px 0 var(--violet);
	}
	ol {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		width: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		position: relative;
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 6px;
		text-align: center;
	}
	.n {
		position: absolute;
		top: -8px;
		left: calc(50% - 52px);
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		background: var(--gold);
		color: var(--ink);
		border: 3px solid var(--ink);
		font-size: 18px;
		line-height: 1;
	}
	.icon {
		display: grid;
		place-items: center;
		width: clamp(56px, 20vh, 84px);
		aspect-ratio: 1;
		background: #fff;
		border-radius: 18px;
		color: #0a7aff;
	}
	.icon svg {
		width: 62%;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.icon .dot {
		fill: currentColor;
		stroke: none;
	}
	.icon img {
		width: 100%;
		border-radius: 18px;
	}
	.label {
		font-size: clamp(16px, 4.6vh, 22px);
		line-height: 1.1;
	}
	.note {
		font-family: system-ui, sans-serif;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.75);
	}
	.ok {
		width: 64px;
		height: 52px;
		padding: 0;
		background: #5dff9d;
		box-shadow: 0 6px 0 #1f9e55;
	}
</style>
