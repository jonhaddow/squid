<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { dev, version } from '$app/env';
	import SquidPreview from '#lib/components/SquidPreview.svelte';
	import InstallHint from '#lib/components/InstallHint.svelte';
	import ThingIcon from '#lib/components/ThingIcon.svelte';
	import { unlock, sounds } from '#lib/game/audio.ts';
	import { Game, HEARTS } from '#lib/game/game.ts';
	import type { Mode } from '#lib/game/gestures.ts';
	import type { Thing } from '#lib/game/sprites.ts';
	import {
		FACES,
		HATS,
		loadPlayer,
		NAME_MAX,
		NECKS,
		newPlayer,
		PALETTE,
		savePlayer,
		type Hat,
		type Look
	} from '#lib/game/progress.ts';
	import { syncScores, type Row } from '#lib/scores.ts';

	/** The device's one squid. Fresh until the save loads, and not shown till then. */
	let player = $state(newPlayer());
	let loaded = $state(false);
	/** The squid's been tapped on the start screen: choosing easy or hard. */
	let chosen = $state(false);
	/** In the dressing room, choosing a colour and things to wear. */
	let dressing = $state(false);
	/** The family leaderboard, once it's loaded (it stays empty offline). */
	let board = $state<Row[]>([]);
	let width = $state(800);
	let height = $state(400);
	/** The big squid in the dressing room. */
	/** Each squid on the leaderboard. */
	const squidlet = $derived(Math.round(Math.min(72, height * 0.16)));
	const mirror = $derived(Math.round(Math.min(340, height * 0.8, width * 0.32)));
	let playing = $state(false);
	let mode = $state<Mode>('easy');
	/** Hard mode ran out of hearts. Both modes are endless otherwise. */
	let ended = $state(false);
	/** Bumped to restart the game for a retry. */
	let round = $state(0);
	let portrait = $state(false);
	/** A new version has taken over: reload into it when nobody's mid-game. */
	let updated = $state(false);

	onMount(() => {
		player = loadPlayer(localStorage);
		loaded = true;
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
			// Not while a new worker is still downloading: its cache is half full.
			const reg = await sw.getRegistration();
			if (reg?.installing || reg?.waiting) return;
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

	const home = $derived(!playing && !chosen && !dressing);

	// Never mid-game: only on the start screen (progress is already saved).
	$effect(() => {
		if (updated && home) location.reload();
	});

	// Each time the start screen shows: post the squid's best and fetch the board.
	$effect(() => {
		// After the save loads, so it posts this squid's best, not a fresh one's.
		if (!home || !loaded) return;
		let live = true;
		void syncScores(untrack(() => $state.snapshot(player))).then((rows) => {
			if (live && rows) board = rows;
		});
		return () => (live = false);
	});

	/** The dressing room's rows of things to wear, after the colours. */
	const RAILS = [
		{ kind: 'hat', label: 'Hat', items: HATS, none: 'No hat' },
		{ kind: 'neck', label: 'Neck', items: NECKS, none: 'Nothing round the neck' },
		{ kind: 'face', label: 'Glasses', items: FACES, none: 'No glasses' }
	] as const;

	/** Medals for the top 3 on the leaderboard. */
	const PLACES = ['1st', '2nd', '3rd'];
	const HEART =
		'M12 21C5 15.5 2 12.3 2 8.5A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 10 2.5c0 3.8-3 7-10 12.5z';

	const save = () => savePlayer(localStorage, $state.snapshot(player));

	function pick() {
		unlock();
		sounds.pop();
		chosen = true;
	}

	function play(m: Mode) {
		sounds.friend();
		mode = m;
		ended = false;
		playing = true;
		chosen = false;
	}

	function dress() {
		unlock();
		sounds.pop();
		dressing = true;
	}

	function wear(change: Partial<Look>) {
		sounds.pop();
		Object.assign(player, change);
		save();
	}

	function again() {
		sounds.pop();
		ended = false;
		round++;
	}

	function quit() {
		sounds.pop();
		ended = false;
		playing = false;
	}

	/** Runs the game on the canvas while it's on screen. */
	function run() {
		return (canvas: HTMLCanvasElement) => {
			// Untracked: the game changes the player as it goes (stars, level), which
			// mustn't restart it. A retry restarts it through `round`.
			const game = untrack(
				() =>
					new Game(canvas, player, mode, {
						save,
						gameOver: () => (ended = true)
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

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

{#snippet none()}
	<svg viewBox="0 0 24 24" aria-hidden="true"
		><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3" /><path
			d="M6.5 17.5l11-11"
			stroke="currentColor"
			stroke-width="3"
		/></svg
	>
{/snippet}

<main>
	{#if !playing && dressing}
		<section class="dress">
			<div class="me">
				<div class="mirror" style:--squid={player.color}>
					{#key mirror}
						<SquidPreview look={player} size={mirror} />
					{/key}
				</div>
				<!-- For a grown-up to type: Enter (Go on iPads) puts the keyboard away. -->
				<input
					class="name"
					style:width="{mirror + 8}px"
					aria-label="Name"
					placeholder="Name"
					autocomplete="off"
					spellcheck="false"
					maxlength={NAME_MAX}
					enterkeyhint="done"
					bind:value={player.name}
					oninput={save}
					onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
				/>
			</div>
			<div class="rails">
				<div class="rail" role="group" aria-label="Colour">
					{#each PALETTE as color, n (color)}
						<button
							class="tile swatch"
							class:on={player.color === color}
							style:--c={color}
							aria-label="Colour {n + 1}"
							aria-pressed={player.color === color}
							onclick={() => wear({ color })}
						></button>
					{/each}
				</div>
				{#each RAILS as rail (rail.kind)}
					<div class="rail" role="group" aria-label={rail.label}>
						<button
							class="tile"
							class:on={!player[rail.kind]}
							aria-label={rail.none}
							aria-pressed={!player[rail.kind]}
							onclick={() => wear({ [rail.kind]: null })}>{@render none()}</button
						>
						{#each rail.items as item (item)}
							<!-- Hats are won, one a level: the rest show as shadows to play for. -->
							{@const locked = rail.kind === 'hat' && !player.hats.includes(item as Hat)}
							<button
								class="tile"
								class:on={player[rail.kind] === item}
								class:locked
								disabled={locked}
								aria-label={locked ? 'Hat to win' : item}
								aria-pressed={player[rail.kind] === item}
								onclick={() => wear({ [rail.kind]: item })}
							>
								<ThingIcon thing={{ kind: rail.kind, item } as Thing} />
							</button>
						{/each}
					</div>
				{/each}
			</div>
			<button class="back" onclick={() => (dressing = false)} aria-label="Done">
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3" /></svg
				>
			</button>
		</section>
	{:else if !playing && chosen}
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
			<button class="back" onclick={() => (chosen = false)} aria-label="Back">
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3" /></svg
				>
			</button>
		</section>
	{:else if !playing}
		<section class="start">
			<h1>Squid Spells</h1>
			{#if loaded}
				<div class="squids">
					<div class="slot">
						<button class="pick" onclick={pick} aria-label="Play" style:--squid={player.color}>
							<SquidPreview look={player} />
							<span class="stars" aria-label="{player.stars} stars">
								<svg viewBox="0 0 24 24" aria-hidden="true"
									><path
										d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"
									/></svg
								>
								{player.stars}
							</span>
						</button>
						<button class="block wardrobe" onclick={dress} aria-label="Dress up">
							<!-- A T-shirt. -->
							<svg viewBox="0 0 24 24" aria-hidden="true"
								><path
									d="M8.5 3L2 6.5l2.5 5 2.5-1.2V21h10V10.3l2.5 1.2 2.5-5L15.5 3a3.5 3.5 0 0 1-7 0z"
									fill="currentColor"
								/></svg
							>
						</button>
						{#if player.name}<p class="label">{player.name}</p>{/if}
					</div>
					{#if board.length}
						<!-- The family leaderboard: best hard-mode game, a row per device. -->
						<ol class="board" aria-label="High scores" style:--s="{squidlet}px">
							{#each board as row, i (i)}
								<li class:me={row.me} style:--squid={row.color}>
									<span class="place place-{i + 1}">{PLACES[i] ?? ''}</span>
									<SquidPreview look={row} size={squidlet} />
									<span class="who">{row.name || '?'}</span>
									<span class="score">{row.best}</span>
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			{/if}
			<InstallHint />
		</section>
	{:else}
		{#key round}
			<canvas class="game" {@attach run()}></canvas>
		{/key}
		<button class="block corner" onclick={quit} aria-label="Home">
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" fill="currentColor" /></svg
			>
		</button>
		{#if ended}
			<div class="done">
				<p class="cheer">Oh no!</p>
				<div class="row">
					<button class="block big" onclick={quit} aria-label="Home">
						<svg viewBox="0 0 24 24" aria-hidden="true"
							><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z" fill="currentColor" /></svg
						>
					</button>
					<button class="block big go" onclick={again} aria-label="Try again">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M19 12a7 7 0 1 1-2.1-5M19 3v5h-5"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
							/>
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
					<SquidPreview look={player} size={96} />
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
		align-items: center;
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

	.wardrobe {
		position: absolute;
		top: -14px;
		right: -18px;
		width: 52px;
		height: 52px;
		padding: 0;
	}

	.dress {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4vw;
		/* Clear of the back button on the left. */
		padding: env(safe-area-inset-top) env(safe-area-inset-right) 0
			max(72px, env(safe-area-inset-left));
		--tile: min(13vh, 5.6vw, 72px);
	}
	.me {
		display: grid;
		justify-items: center;
		gap: 2vh;
	}
	.name {
		box-sizing: border-box;
		padding: 6px 10px;
		font: inherit;
		font-size: 28px;
		text-align: center;
		color: #fff;
		background: rgba(255, 255, 255, 0.08);
		border: 4px solid var(--ink);
		border-radius: 0;
		/* The page turns selection off, which can stop iOS typing in a field. */
		-webkit-user-select: text;
		user-select: text;
	}
	.name::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}
	.name:focus {
		outline: none;
		border-color: var(--gold);
	}
	.label {
		margin: 2vh 0 0;
		text-align: center;
		font-size: clamp(24px, 8vh, 44px);
		color: var(--gold);
		text-shadow: 0 4px 0 var(--violet);
	}

	.board {
		margin: 0;
		padding: 10px 14px;
		list-style: none;
		display: grid;
		gap: 0;
		min-width: min(40vw, 320px);
		background: rgba(255, 255, 255, 0.06);
		border: 4px solid var(--ink);
		font-size: clamp(18px, 6vh, 28px);
	}
	.board li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 2px 8px;
		border: 3px solid transparent;
	}
	.board .me {
		border-color: var(--gold);
		background: rgba(255, 224, 102, 0.15);
	}
	.place {
		flex: none;
		width: 2.2em;
		font-size: 0.8em;
		text-align: center;
	}
	.place-1 {
		color: var(--gold);
	}
	.place-2 {
		color: #d8e2f0;
	}
	.place-3 {
		color: #ff9f5a;
	}
	/* The preview leaves room for a tall hat: let rows overlap that space. */
	.board :global(canvas) {
		flex: none;
		margin: calc(var(--s) * -0.16) calc(var(--s) * -0.1);
	}
	.who {
		flex: 1;
	}
	.score {
		color: var(--gold);
	}
	.mirror {
		background: rgba(255, 255, 255, 0.06);
		border: 4px solid color-mix(in srgb, var(--squid) 70%, white);
		box-shadow:
			0 0 0 4px var(--ink),
			0 0 30px color-mix(in srgb, var(--squid) 60%, transparent);
	}
	.mirror :global(canvas) {
		display: block;
	}
	.rails {
		display: grid;
		gap: 2.5vh;
	}
	.rail {
		display: flex;
		gap: min(1.2vw, 10px);
	}
	.tile {
		width: var(--tile);
		height: var(--tile);
		padding: 0;
		display: grid;
		place-items: center;
		background: rgba(255, 255, 255, 0.08);
		border: 4px solid var(--ink);
		border-radius: 0;
		color: rgba(255, 255, 255, 0.5);
		transition: transform 80ms;
	}
	.tile > svg {
		width: 55%;
	}
	.tile:active {
		transform: scale(0.92);
	}
	.tile.on {
		border-color: var(--gold);
		background: rgba(255, 224, 102, 0.18);
		box-shadow: 0 0 16px rgba(255, 224, 102, 0.6);
	}
	.swatch {
		background: var(--c);
	}
	.swatch.on {
		background: var(--c);
		border-color: #fff;
		box-shadow:
			0 0 0 4px var(--ink),
			0 0 18px var(--c);
	}
	/* Hats not won yet: a dark shadow of the hat. */
	.locked {
		cursor: default;
	}
	.locked :global(canvas) {
		filter: brightness(0);
		opacity: 0.35;
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
