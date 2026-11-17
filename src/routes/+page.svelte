<script lang="ts">
	// Squid Spells has moved: off to its new home, taking this device's save.
	import { onMount } from 'svelte';
	import { handoffLink, NEW_HOME } from '#lib/handoff.ts';

	let link = $state(NEW_HOME);

	onMount(() => {
		try {
			link = handoffLink(localStorage);
		} catch {
			// No storage: nothing to bring.
		}
		location.replace(link);
	});
</script>

<main>
	<h1>Squid Spells</h1>
	<a href={link}>Play</a>
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		display: grid;
		place-content: center;
		gap: 4vh;
		text-align: center;
		background: var(--sea);
	}
	h1 {
		margin: 0;
		font-size: clamp(36px, 11vh, 80px);
		font-weight: 400;
		color: var(--gold);
	}
	a {
		font-size: 32px;
		color: #fff;
	}
</style>
