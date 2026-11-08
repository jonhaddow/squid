import { describe, expect, it } from 'vitest';
import { classify, guide, isAttempt, type Point } from './gestures.ts';

/** Scales a unit-box path to the screen, with optional wobble. */
function draw(points: Point[], size = 200, wobble = 0, seed = 1): Point[] {
	let s = seed;
	const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
	return points.map((p) => ({
		x: 300 + p.x * size + rand() * wobble,
		y: 100 + p.y * size + rand() * wobble
	}));
}

function arc(turns: number, n = 80, spiral = false): Point[] {
	return Array.from({ length: n }, (_, i) => {
		const t = i / (n - 1);
		const a = t * turns * 2 * Math.PI;
		const r = spiral ? 0.1 + 0.4 * t : 0.5;
		return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) };
	});
}

describe('classify', () => {
	it('knows the guide shapes', () => {
		expect(classify(draw(guide('circle')))).toBe('circle');
		expect(classify(draw(guide('swirl')))).toBe('swirl');
		expect(classify(draw(guide('zigzag')))).toBe('zigzag');
		expect(classify(draw(guide('square')))).toBe('square');
	});

	it('accepts squares and rectangles, wobbly or with rounded corners, from any corner', () => {
		const box = (w: number, h: number): Point[] => [
			{ x: 0, y: 0 },
			{ x: w, y: 0 },
			{ x: w, y: h },
			{ x: 0, y: h },
			{ x: 0, y: 0 }
		];
		expect(classify(draw(box(1, 1), 200, 5))).toBe('square');
		expect(classify(draw(box(1, 0.6), 220, 4))).toBe('square');
		expect(classify(draw([...box(1, 1)].reverse(), 150))).toBe('square');
		// Started halfway along a side.
		const mid: Point[] = [
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 0, y: 0 },
			{ x: 0.5, y: 0 }
		];
		expect(classify(draw(mid, 180, 3))).toBe('square');
		// Rounded corners: each corner cut by an eighth of a side.
		const round: Point[] = [
			{ x: 0.12, y: 0 },
			{ x: 0.88, y: 0 },
			{ x: 1, y: 0.12 },
			{ x: 1, y: 0.88 },
			{ x: 0.88, y: 1 },
			{ x: 0.12, y: 1 },
			{ x: 0, y: 0.88 },
			{ x: 0, y: 0.12 },
			{ x: 0.12, y: 0 }
		];
		expect(classify(draw(round, 200))).toBe('square');
	});

	it('never mistakes a wobbly circle for a square', () => {
		for (let seed = 1; seed < 100; seed++)
			expect(classify(draw(arc(1), 200, 5, seed))).toBe('circle');
	});

	it('accepts wobbly circles, either way round, overshooting or a bit short', () => {
		expect(classify(draw(arc(1), 200, 12))).toBe('circle');
		expect(classify(draw(arc(-1), 150, 8))).toBe('circle');
		expect(classify(draw(arc(1.3)))).toBe('circle');
		expect(classify(draw(arc(0.8)))).toBe('circle');
	});

	it('tells a swirl from a circle', () => {
		expect(classify(draw(arc(2, 120, true), 200, 6))).toBe('swirl');
		expect(classify(draw(arc(-2.5, 120, true)))).toBe('swirl');
	});

	it('accepts zigzags drawn sideways, up and down, or as an N', () => {
		const down: Point[] = [0, 1, 0, 1, 0].map((y, i) => ({ x: i / 4, y }));
		const across: Point[] = [0, 1, 0, 1].map((x, i) => ({ x, y: i / 3 }));
		const n: Point[] = [
			{ x: 0, y: 1 },
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 1, y: 0 }
		];
		for (const shape of [down, across, n]) expect(classify(draw(shape, 180, 5))).toBe('zigzag');
		// Wide and flat, ending higher than it started: still not a line.
		const flat: Point[] = [
			{ x: 0, y: 0.27 },
			{ x: 0.33, y: 0 },
			{ x: 0.67, y: 0.27 },
			{ x: 1, y: 0 }
		];
		expect(classify(draw(flat, 300))).toBe('zigzag');
	});

	it('ignores taps, short strokes and squiggles', () => {
		expect(classify([{ x: 10, y: 10 }])).toBeNull();
		expect(classify(draw(arc(1), 20))).toBeNull();
		const short: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0.2, y: 0 }
		];
		expect(classify(draw(short))).toBeNull();
		const v: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0.5, y: 1 },
			{ x: 1, y: 0 }
		];
		expect(classify(draw(v))).toBeNull();
	});
});

describe('isAttempt', () => {
	it('is a stroke, not a tap', () => {
		expect(isAttempt(draw(arc(1), 100))).toBe(true);
		expect(isAttempt(draw(arc(1), 10))).toBe(false);
	});
});
