<script lang="ts">
	// One hat, necklace or pair of glasses, still: on the dress-up buttons.
	import { drawThing, type Thing } from '#lib/game/sprites.ts';

	let { thing }: { thing: Thing } = $props();

	function draw(canvas: HTMLCanvasElement) {
		const size = canvas.clientWidth || 64;
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = size * ratio;
		canvas.height = size * ratio;
		const ctx = canvas.getContext('2d')!;
		ctx.setTransform(ratio, 0, 0, ratio, (size * ratio) / 2, (size * ratio) / 2);
		// Hats are tall; necklaces and glasses are wide and thin, so they go bigger.
		drawThing(ctx, size * (thing.kind === 'hat' ? 1.3 : 1.7), thing);
	}
</script>

<canvas {@attach draw} aria-hidden="true"></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
	}
</style>
