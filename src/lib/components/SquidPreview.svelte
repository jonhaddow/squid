<script lang="ts">
	// A squid on its own, wiggling: the picker on the start screen.
	import { drawSquid } from '#lib/game/sprites.ts';
	import type { Look } from '#lib/game/progress.ts';

	let { look, size = 160 }: { look: Look; size?: number } = $props();

	function animate(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d')!;
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = size * ratio;
		canvas.height = size * ratio;
		const start = performance.now() + Math.random() * 5000;
		// Reads `look` each frame, so a new colour or hat shows straight away.
		let frame = requestAnimationFrame(function loop(now) {
			const t = (now - start) / 1000;
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			ctx.clearRect(0, 0, size, size);
			// Low enough that the tallest hat (the wizard's) fits on top.
			ctx.translate(size * 0.45, size * 0.65 + Math.sin(t * 2) * size * 0.02);
			drawSquid(ctx, size * 0.5, look, t);
			frame = requestAnimationFrame(loop);
		});
		return () => cancelAnimationFrame(frame);
	}
</script>

<canvas {@attach animate} style:width="{size}px" style:height="{size}px" aria-hidden="true"
></canvas>
