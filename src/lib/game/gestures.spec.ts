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
		expect(classify(draw(guide('triangle')))).toBe('triangle');
		expect(classify(draw(guide('arch')))).toBe('arch');
	});

	it('accepts wobbly arches, any way up or round, a bit short or long', () => {
		const half = (from: number, turns: number): Point[] =>
			Array.from({ length: 40 }, (_, i) => {
				const a = from + (i / 39) * turns * 2 * Math.PI;
				return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) };
			});
		for (let seed = 1; seed < 50; seed++) {
			expect(classify(draw(half(Math.PI, 0.5), 200, 6, seed))).toBe('arch'); // a rainbow
			expect(classify(draw(half(0, -0.5), 200, 6, seed))).toBe('arch'); // the other way
			expect(classify(draw(half(0, 0.5), 160, 5, seed))).toBe('arch'); // a bowl
			expect(classify(draw(half(Math.PI / 2, 0.5), 160, 5, seed))).toBe('arch'); // a C
			expect(classify(draw(half(Math.PI, 0.4), 200, 4, seed))).toBe('arch');
			expect(classify(draw(half(Math.PI * 0.95, 0.55), 200, 4, seed))).toBe('arch');
		}
	});

	it("doesn't take a V, an L, a line or a nearly closed circle for an arch", () => {
		const v: Point[] = [
			{ x: 0, y: 1 },
			{ x: 0.5, y: 0 },
			{ x: 1, y: 1 }
		];
		const l: Point[] = [
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 }
		];
		const line: Point[] = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0.3 }
		];
		for (let seed = 1; seed < 50; seed++) {
			for (const shape of [v, l, line])
				expect(classify(draw(shape, 200, 4, seed))).not.toBe('arch');
			for (const turns of [0.7, 0.75, 0.85])
				expect(classify(draw(arc(turns), 200, 5, seed))).not.toBe('arch');
		}
	});

	it('accepts wobbly triangles, any way round, from any corner or mid-side', () => {
		const tri: Point[] = [
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0.9 },
			{ x: 0, y: 0.9 },
			{ x: 0.5, y: 0 }
		];
		for (let seed = 1; seed < 50; seed++) {
			expect(classify(draw(tri, 200, 5, seed))).toBe('triangle');
			expect(classify(draw([...tri].reverse(), 160, 4, seed))).toBe('triangle');
		}
		// Upside down, started halfway along the top.
		const down: Point[] = [
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0 },
			{ x: 0.5, y: 0.9 },
			{ x: 0, y: 0 },
			{ x: 0.5, y: 0 }
		];
		expect(classify(draw(down, 200, 3))).toBe('triangle');
	});

	it('accepts triangles of any angles: tall, flat, right-angled and lopsided', () => {
		const shapes: Point[][] = [
			[
				{ x: 0.5, y: 0 },
				{ x: 0.6, y: 1 },
				{ x: 0.4, y: 1 }
			], // tall and thin
			[
				{ x: 0.5, y: 0.6 },
				{ x: 1, y: 1 },
				{ x: 0, y: 1 }
			], // flat
			[
				{ x: 0.5, y: 0.75 },
				{ x: 1, y: 1 },
				{ x: 0, y: 1 }
			], // very flat
			[
				{ x: 0.2, y: 0.6 },
				{ x: 1, y: 1 },
				{ x: 0, y: 1 }
			], // obtuse
			[
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 0, y: 1 }
			], // right-angled
			[
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 0.3, y: 1 }
			] // leaning
		];
		// Drawn the way a finger does, lots of points along each side.
		const finger = (corners: Point[]): Point[] =>
			[...corners, corners[0]].flatMap((p, i, all) =>
				i === all.length - 1
					? [p]
					: Array.from({ length: 15 }, (_, j) => ({
							x: p.x + ((all[i + 1].x - p.x) * j) / 15,
							y: p.y + ((all[i + 1].y - p.y) * j) / 15
						}))
			);
		for (const shape of shapes)
			for (let start = 0; start < 3; start++) {
				const corners = [...shape.slice(start), ...shape.slice(0, start)];
				for (let seed = 1; seed < 20; seed++) {
					expect(classify(draw(finger(corners), 200, 4, seed))).toBe('triangle');
					expect(classify(draw(finger([...corners].reverse()), 200, 4, seed))).toBe('triangle');
				}
			}
	});

	it('keeps triangles drawn round past the start as they were, and squares and diamonds as circles', () => {
		const square = [0, 1, 2, 3, 0, 1, 2].map(
			(i) =>
				[
					{ x: 0, y: 0 },
					{ x: 1, y: 0 },
					{ x: 1, y: 1 },
					{ x: 0, y: 1 }
				][i]
		);
		square.push({ x: 0.5, y: 1 });
		const tri = [
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0.9 },
			{ x: 0, y: 0.9 },
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0.9 },
			{ x: 0.2, y: 0.9 }
		];
		const diamond = [
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0.5 },
			{ x: 0.5, y: 1 },
			{ x: 0, y: 0.5 },
			{ x: 0.5, y: 0 }
		];
		for (let seed = 1; seed < 30; seed++) {
			expect(classify(draw(square, 200, 4, seed))).toBe('circle');
			expect(classify(draw(tri, 200, 4, seed))).toBe('triangle');
			expect(classify(draw(diamond, 200, 4, seed))).toBe('circle');
		}
	});

	it('never mistakes circles, swirls or squares for the new shapes', () => {
		const box: Point[] = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 0, y: 0 },
			{ x: 0.3, y: 0 }
		];
		for (let seed = 1; seed < 100; seed++) {
			expect(classify(draw(arc(1.2), 200, 8, seed))).toBe('circle');
			expect(classify(draw(arc(2.2, 120, true), 200, 6, seed))).toBe('swirl');
			expect(classify(draw(box, 200, 5, seed))).toBe('circle');
		}
	});

	it('counts squares and rectangles, wobbly or with rounded corners, as circles', () => {
		const box = (w: number, h: number): Point[] => [
			{ x: 0, y: 0 },
			{ x: w, y: 0 },
			{ x: w, y: h },
			{ x: 0, y: h },
			{ x: 0, y: 0 }
		];
		expect(classify(draw(box(1, 1), 200, 5))).toBe('circle');
		expect(classify(draw(box(1, 0.6), 220, 4))).toBe('circle');
		expect(classify(draw([...box(1, 1)].reverse(), 150))).toBe('circle');
		// Started halfway along a side.
		const mid: Point[] = [
			{ x: 0.5, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 0, y: 0 },
			{ x: 0.5, y: 0 }
		];
		expect(classify(draw(mid, 180, 3))).toBe('circle');
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
		expect(classify(draw(round, 200))).toBe('circle');
	});

	it('accepts wobbly circles, either way round, overshooting or a bit short', () => {
		expect(classify(draw(arc(1), 200, 12))).toBe('circle');
		expect(classify(draw(arc(-1), 150, 8))).toBe('circle');
		expect(classify(draw(arc(1.3)))).toBe('circle');
		expect(classify(draw(arc(0.8)))).toBe('circle');
		expect(classify(draw(arc(0.7)))).toBe('circle');
		expect(classify(draw(arc(0.75)))).toBe('circle');
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
		const long: Point[] = [0, 1, 0, 1, 0, 1, 0, 1].map((y, i) => ({ x: i / 7, y }));
		for (const shape of [down, across, n, long])
			expect(classify(draw(shape, 180, 5))).toBe('zigzag');
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
