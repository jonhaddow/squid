<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { dev, version } from '$app/env';
	import SquidPreview from '#lib/components/SquidPreview.svelte';
	import { unlock, sounds } from '#lib/game/audio.ts';
	import { Game, HEARTS } from '#lib/game/game.ts';
	import type { Mode } from '#lib/game/gestures.ts';
	import { loadPlayers, nextHat, savePlayers, type Hat, type Player } from '#lib/game/progress.ts';

	let players = $state<Player[]>([]);
	/** The squid tapped on the start screen, now choosing easy or hard. */
	let chosen = $state<number | null>(null);
	/** Which kid is playing, or null on the start screen. */
	let playing = $state<number | null>(null);
	let mode = $state<Mode>('easy');
	/** How the level ended: all friends (and maybe a new hat), or out of hearts. */
	let ended = $state<{ won: true; hat: Hat | null } | { won: false } | null>(null);
	/** Bumped to restart the game: the next level, or a retry. */
	let round = $state(0);
	let portrait = $state(false);
	/** A new version has taken over: reload into it when nobody's mid-game. */
	let updated = $state(false);

	onMount(() => {
		players = loadPlayers(localStorage);
		const query = matchMedia('(orientation: portrait)');
		portrait = query.matches;
		const change = () => (portrait = query.matches);
		query.addEventListener('change', change);
		return () => query.removeEventListener('change', change);
	});

	// Offline play and updates. The service worker keeps a copy of the whole
	// app (in a cache named after its version) so it works offline. A new
	// deploy's worker downloads its version, swaps the copy and takes over; this
	// page notices the copy is newer than itself. iPads resume the home-screen
	// app rather than relaunching it, so check each time it comes back on
	// screen too. Checks fail offline, which doesn't matter.
	onMount(() => {
		const sw = navigator.serviceWorker;
		if (!sw) return;
		sw.register('/service-worker.js', { type: dev ? 'module' : 'classic' }).catch(() => {});
		const newer = async () => {
			// Versions are build times, so a bigger one is newer.
			const keys = await caches.keys();
			if (keys.some((k) => k.startsWith('squid-') && Number(k.slice(6)) > Number(version)))
				updated = true;
		};
		const takeover = () => void newer();
		const check = () => {
			if (document.visibilityState === 'visible')
				sw.getRegistration()
					.then((r) => r?.update())
					.then(newer)
					.catch(() => {});
		};
		sw.addEventListener('controllerchange', takeover);
		document.addEventListener('visibilitychange', check);
		return () => {
			sw.removeEventListener('controllerchange', takeover);
			document.removeEventListener('visibilitychange', check);
		};
	});

	// Never mid-level: only on the start screen (progress is already saved).
	$effect(() => {
		if (updated && playing === null && chosen === null) location.reload();
	});

	const HEART =
		'M12 21C5 15.5 2 12.3 2 8.5A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 10 2.5c0 3.8-3 7-10 12.5z';

	const save = () => savePlayers(localStorage, $state.snapshot(players));

	function pick(i: number) {
		unlock();
		sounds.pop();
		chosen = i;
	}

	function play(m: Mode) {
		sounds.friend();
		mode = m;
		ended = null;
		playing = chosen;
		chosen = null;
	}

	function changeHat(i: number) {
		unlock();
		sounds.pop();
		nextHat(players[i]);
		save();
	}

	function again() {
		sounds.pop();
		ended = null;
		round++;
	}

	function home() {
		sounds.pop();
		ended = null;
		playing = null;
	}

	/** Runs the game on the canvas while it's on screen. */
	function run(player: Player) {
		return (canvas: HTMLCanvasElement) => {
			// Untracked: the game changes the player as it goes (stars, level), which
			// mustn't restart it. A new level restarts it through `round`.
			const game = untrack(
				() =>
					new Game(canvas, player, mode, {
						save,
						levelDone: (hat) => (ended = { won: true, hat }),
						gameOver: () => (ended = { won: false })
					})
			);
			window.__squid = game;
			game.start();
			const resize = () => game.resize();
			window.addEventListener('resize', resize);
			$effect(() => {
				game.paused = portrait;
			});
			const at = (e: PointerEvent) => {
				const r = canvas.getBoundingClientRect();
				return { x: e.clientX - r.left, y: e.clientY - r.top };
			};
			const down = (e: PointerEvent) => {
				canvas.setPointerCapture(e.pointerId);
				game.down(at(e));
			};
			const move = (e: PointerEvent) => game.move(at(e));
			const up = () => game.up();
			canvas.addEventListener('pointerdown', down);
			canvas.addEventListener('pointermove', move);
			canvas.addEventListener('pointerup', up);
			canvas.addEventListener('pointercancel', up);
			return () => {
				game.stop();
				window.removeEventListener('resize', resize);
				delete window.__squid;
			};
		};
	}
</script>

<main>
	{#if playing === null && chosen !== null}
		<section class="start">
			<div class="modes">
				<button class="block mode easy" onclick={() => play('easy')}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="currentColor" />
						<circle cx="8.5" cy="10" r="1.6" fill="#5dff9d" />
						<circle cx="15.5" cy="10" r="1.6" fill="#5dff9d" />
						<path
							d="M7.5 14a5 5 0 0 0 9 0"
							fill="none"
							stroke="#5dff9d"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
					Easy
				</button>
				<button class="block mode hard" onclick={() => play('hard')}>
					<span class="hearts" aria-hidden="true">
						{#each { length: HEARTS }, i (i)}
							<svg viewBox="0 0 24 24"><path d={HEART} fill="currentColor" /></svg>
						{/each}
					</span>
					Hard
				</button>
			</div>
			<button class="back" onclick={() => (chosen = null)} aria-label="Back">
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3" /></svg
				>
			</button>
		</section>
	{:else if playing === null}
		<section class="start">
			<h1>Squid Spells</h1>
			<div class="squids">
				{#each players as player, i (i)}
					<div class="slot">
						<button
							class="pick"
							onclick={() => pick(i)}
							aria-label="Play as the {i === 0 ? 'purple' : 'orange'} squid"
							style:--squid={player.color}
						>
							<SquidPreview color={player.color} hat={player.hat} />
							<span class="stars" aria-label="{player.stars} stars">
								<svg viewBox="0 0 24 24" aria-hidden="true"
									><path
										d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"
									/></svg
								>
								{player.stars}
							</span>
						</button>
						{#if player.hats.length}
							<button class="block hat" onclick={() => changeHat(i)} aria-label="Change hat">
								<svg viewBox="0 0 24 24" aria-hidden="true"
									><path d="M3 20h18l-3-2-4-15-6 9-2 6z" fill="currentColor" /></svg
								>
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{:else}
		{#key round}
			<canvas class="game" {@attach run(players[playing])}></canvas>
		{/key}
		<button class="block corner" onclick={home} aria-label="Home">
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" fill="currentColor" /></svg
			>
		</button>
		{#if ended}
			<div class="done">
				<p class="cheer">{ended.won ? 'You did it!' : 'Oh no!'}</p>
				<div class="row">
					<button class="block big" onclick={home} aria-label="Home">
						<svg viewBox="0 0 24 24" aria-hidden="true"
							><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" fill="currentColor" /></svg
						>
					</button>
					<button
						class="block big go"
						onclick={again}
						aria-label={ended.won ? 'Next level' : 'Try again'}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							{#if ended.won}
								<path d="M7 4l13 8-13 8z" fill="currentColor" />
							{:else}
								<path
									d="M19 12a7 7 0 1 1-2.1-5M19 3v5h-5"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
								/>
							{/if}
						</svg>
					</button>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Shown by CSS in portrait, so it's there from the first paint. -->
	<div class="rotate" role="alert" aria-label="Turn your device sideways">
		<div class="turn">
			<div class="phone">
				<!-- Only while it shows: its animation would cost frames during play. -->
				{#if portrait}
					<SquidPreview
						color={players[playing ?? 0]?.color ?? '#b45cff'}
						hat={players[playing ?? 0]?.hat ?? null}
						size={96}
					/>
				{/if}
			</div>
			<svg class="arrow" viewBox="0 0 100 100" aria-hidden="true">
				<path d="M90 30 A46 46 0 0 0 10 30" />
				<path d="M3 20 L10 31 L22 26" />
			</svg>
		</div>
		<p>Turn me sideways!</p>
	</div>
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		background: linear-gradient(var(--sea-3), var(--sea-2) 55%, var(--sea));
	}

	.start {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2vh;
		padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
	}

	h1 {
		margin: 0;
		font-size: clamp(36px, 11vh, 80px);
		font-weight: 400;
		color: var(--gold);
		letter-spacing: 0.02em;
		text-shadow:
			0 5px 0 var(--violet),
			0 0 30px rgba(124, 240, 255, 0.5);
		transform: rotate(-2deg);
	}

	.squids {
		display: flex;
		gap: 6vw;
	}

	.slot {
		position: relative;
	}

	.pick {
		display: grid;
		justify-items: center;
		padding: 8px 16px 12px;
		background: rgba(255, 255, 255, 0.06);
		border: 4px solid color-mix(in srgb, var(--squid) 70%, white);
		border-radius: 0;
		box-shadow:
			0 0 0 4px var(--ink),
			0 0 30px color-mix(in srgb, var(--squid) 60%, transparent);
		animation: float 3s ease-in-out infinite;
	}
	.slot:nth-child(2) .pick {
		animation-delay: -1.5s;
	}
	.pick:active {
		transform: scale(0.95);
	}

	.stars {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 28px;
	}
	.stars svg {
		width: 26px;
		fill: var(--gold);
	}

	.modes {
		display: flex;
		gap: 6vw;
	}
	.mode {
		width: min(34vw, 260px);
		height: min(56vh, 220px);
		align-content: center;
		gap: 4vh;
		font-size: clamp(28px, 9vh, 56px);
	}
	.mode svg {
		width: 40%;
		height: auto;
	}
	.easy {
		background: #5dff9d;
		box-shadow: 0 6px 0 #1f9e55;
	}
	.easy:active {
		box-shadow: 0 1px 0 #1f9e55;
	}
	.hard {
		background: #ff6b8b;
		box-shadow: 0 6px 0 #b02a49;
	}
	.hard:active {
		box-shadow: 0 1px 0 #b02a49;
	}
	.hearts {
		display: flex;
		justify-content: center;
		gap: 4px;
	}
	.hearts svg {
		width: 28%;
		color: #fff;
	}
	.back {
		position: absolute;
		top: max(12px, env(safe-area-inset-top));
		left: max(14px, env(safe-area-inset-left));
		width: 52px;
		height: 52px;
		padding: 8px;
		background: none;
		border: 0;
	}

	.hat {
		position: absolute;
		top: -14px;
		right: -18px;
		width: 52px;
		height: 52px;
		padding: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.pick {
			animation: none;
		}
	}

	@keyframes float {
		50% {
			translate: 0 -8px;
		}
	}

	.game {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
	}

	.corner {
		position: absolute;
		top: max(10px, env(safe-area-inset-top));
		right: max(14px, env(safe-area-inset-right));
		width: 52px;
		height: 52px;
		padding: 0;
	}

	.done {
		position: absolute;
		inset: auto 0 12vh;
		display: grid;
		justify-items: center;
		gap: 3vh;
		pointer-events: none;
	}
	.done button {
		pointer-events: auto;
	}
	.cheer {
		margin: 0;
		font-size: clamp(40px, 13vh, 96px);
		color: var(--gold);
		text-shadow: 0 6px 0 var(--violet);
		animation: pop 600ms cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.row {
		display: flex;
		gap: 24px;
	}
	.big {
		width: 96px;
		height: 96px;
		padding: 0;
		animation: pop 600ms 200ms cubic-bezier(0.3, 1.6, 0.5, 1) backwards;
	}
	.go {
		width: 140px;
		background: #5dff9d;
		box-shadow: 0 6px 0 #1f9e55;
	}
	.go:active {
		box-shadow: 0 1px 0 #1f9e55;
	}

	@keyframes pop {
		from {
			scale: 0;
		}
	}

	.rotate {
		display: none;
	}
	@media (orientation: portrait) {
		.rotate {
			display: flex;
		}
	}
	.rotate {
		position: fixed;
		inset: 0;
		z-index: 10;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 24px;
		background: linear-gradient(var(--sea-3), var(--sea-2) 55%, var(--sea));
	}
	.turn {
		position: relative;
		width: 260px;
		height: 260px;
		display: grid;
		place-items: center;
	}
	/* A phone with the squid on its screen, turning sideways and back. */
	.phone {
		width: 112px;
		height: 190px;
		display: grid;
		place-items: center;
		border: 7px solid var(--ink);
		border-radius: 22px;
		background: linear-gradient(var(--sea-3), var(--sea));
		box-shadow:
			0 0 0 4px var(--gold),
			0 0 40px rgba(124, 240, 255, 0.35);
		animation: turn 3s ease-in-out infinite;
	}
	/* The squid stays upright while the phone turns, like the game will. */
	.phone > :global(*) {
		animation: upright 3s ease-in-out infinite;
	}
	.arrow {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		fill: none;
		stroke: var(--glow);
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
		animation: nudge 3s ease-in-out infinite;
	}
	.rotate p {
		margin: 0;
		font-size: 34px;
		color: var(--gold);
		text-shadow: 0 4px 0 var(--violet);
	}

	@keyframes turn {
		0%,
		20% {
			rotate: 0deg;
		}
		50%,
		85% {
			rotate: -90deg;
		}
		100% {
			rotate: 0deg;
		}
	}
	@keyframes upright {
		0%,
		20% {
			rotate: 0deg;
		}
		50%,
		85% {
			rotate: 90deg;
		}
		100% {
			rotate: 0deg;
		}
	}
	@keyframes nudge {
		0%,
		15% {
			opacity: 1;
		}
		50%,
		90% {
			opacity: 0.25;
		}
		100% {
			opacity: 1;
		}
	}
</style>
