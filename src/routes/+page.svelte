<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { dev } from '$app/env';
	import SquidPreview from '#lib/components/SquidPreview.svelte';
	import { unlock, sounds } from '#lib/game/audio.ts';
	import { Game } from '#lib/game/game.ts';
	import { loadPlayers, nextHat, savePlayers, type Hat, type Player } from '#lib/game/progress.ts';

	let players = $state<Player[]>([]);
	/** Which kid is playing, or null on the start screen. */
	let playing = $state<number | null>(null);
	let done = $state<{ hat: Hat | null } | null>(null);
	/** Bumped to restart the game for the next level. */
	let round = $state(0);
	let portrait = $state(false);

	onMount(() => {
		players = loadPlayers(localStorage);
		const query = matchMedia('(orientation: portrait)');
		portrait = query.matches;
		const change = () => (portrait = query.matches);
		query.addEventListener('change', change);
		// Offline play. Re-registering fails offline, which doesn't matter.
		navigator.serviceWorker
			?.register('/service-worker.js', { type: dev ? 'module' : 'classic' })
			.catch(() => {});
		return () => query.removeEventListener('change', change);
	});

	const save = () => savePlayers(localStorage, $state.snapshot(players));

	function pick(i: number) {
		unlock();
		sounds.friend();
		done = null;
		playing = i;
	}

	function changeHat(i: number) {
		unlock();
		sounds.pop();
		nextHat(players[i]);
		save();
	}

	function nextLevel() {
		sounds.pop();
		done = null;
		round++;
	}

	function home() {
		sounds.pop();
		done = null;
		playing = null;
	}

	/** Runs the game on the canvas while it's on screen. */
	function run(player: Player) {
		return (canvas: HTMLCanvasElement) => {
			// Untracked: the game changes the player as it goes (stars, level), which
			// mustn't restart it. A new level restarts it through `round`.
			const game = untrack(
				() =>
					new Game(canvas, player, {
						save,
						levelDone: (hat) => (done = { hat })
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
	{#if playing === null}
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
		{#if done}
			<div class="done">
				<p class="cheer">You did it!</p>
				<div class="row">
					<button class="block big" onclick={home} aria-label="Home">
						<svg viewBox="0 0 24 24" aria-hidden="true"
							><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" fill="currentColor" /></svg
						>
					</button>
					<button class="block big go" onclick={nextLevel} aria-label="Next level">
						<svg viewBox="0 0 24 24" aria-hidden="true"
							><path d="M7 4l13 8-13 8z" fill="currentColor" /></svg
						>
					</button>
				</div>
			</div>
		{/if}
	{/if}

	{#if portrait}
		<div class="rotate" role="alert" aria-label="Turn your device sideways">
			<svg viewBox="0 0 100 100" aria-hidden="true">
				<rect class="phone" x="32" y="14" width="36" height="72" />
				<path class="arrow" d="M20 70 A34 34 0 0 1 30 26 M24 22 l6 4 -4 6" />
			</svg>
		</div>
	{/if}
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
		position: fixed;
		inset: 0;
		z-index: 10;
		display: grid;
		place-items: center;
		background: var(--sea);
	}
	.rotate svg {
		width: min(60vw, 260px);
		overflow: visible;
	}
	.phone {
		fill: none;
		stroke: var(--gold);
		stroke-width: 5;
		transform-origin: 50px 50px;
		animation: turn 2.4s ease-in-out infinite;
	}
	.arrow {
		fill: none;
		stroke: var(--glow);
		stroke-width: 5;
		stroke-linecap: square;
	}

	@keyframes turn {
		0%,
		25% {
			rotate: 0deg;
		}
		60%,
		100% {
			rotate: -90deg;
		}
	}
</style>
