<script lang="ts">
	// A squid on its own, wiggling: the picker on the start screen.
	import { drawSquid } from '#lib/game/sprites.ts';
	import type { Hat } from '#lib/game/progress.ts';

	let { color, hat, size = 160 }: { color: string; hat: Hat | null; size?: number } = $props();

	function animate(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d')!;
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = size * ratio;
		canvas.height = size * ratio;
		const start = performance.now() + Math.random() * 5000;
		let frame = requestAnimationFrame(function loop(now) {
			const t = (now - start) / 1000;
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			ctx.clearRect(0, 0, size, size);
			ctx.translate(size * 0.45, size * 0.55 + Math.sin(t * 2) * size * 0.03);
			drawSquid(ctx, size * 0.62, { color, hat, t });
			frame = requestAnimationFrame(loop);
		});
		return () => cancelAnimationFrame(frame);
	}
</script>

{#key `${color}${hat}`}
	<canvas {@attach animate} style:width="{size}px" style:height="{size}px" aria-hidden="true"
	></canvas>
{/key}
