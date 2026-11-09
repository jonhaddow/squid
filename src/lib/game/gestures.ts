// Tells which spell shape a finger drew: a circle (shield), a zigzag (zap), a
// swirl (bubbles), a triangle (fins) or a half circle, an arch (a rainbow, for
// the sea turtle).
// Forgiving on purpose: a 6 year old's wobbly circle counts.
// It works on how much the line turns overall, so size, speed, direction and
// where on the screen it was drawn don't matter.

export type Shape = 'circle' | 'zigzag' | 'swirl' | 'triangle' | 'arch';
export type Point = { x: number; y: number };

export type Mode = 'easy' | 'hard';

/** The shapes both modes use, in teaching order. */
export const SHAPES: Shape[] = ['zigzag', 'swirl', 'circle', 'triangle', 'arch'];

/** Strokes smaller than this (CSS px across) are taps, not shapes. */
const MIN_SIZE = 40;
const SAMPLES = 48;

export function pathLength(points: Point[]): number {
	let length = 0;
	for (let i = 1; i < points.length; i++)
		length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
	return length;
}

/** Evenly spaced points along the stroke, so fast and slow drawing look the same. */
export function resample(points: Point[], n = SAMPLES): Point[] {
	const step = pathLength(points) / (n - 1);
	if (step === 0) return [];
	const out: Point[] = [points[0]];
	let carried = 0;
	let prev = points[0];
	for (let i = 1; i < points.length; i++) {
		const next = points[i];
		let segment = Math.hypot(next.x - prev.x, next.y - prev.y);
		while (carried + segment >= step && out.length < n) {
			const t = (step - carried) / segment;
			prev = { x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t };
			out.push(prev);
			segment = Math.hypot(next.x - prev.x, next.y - prev.y);
			carried = 0;
		}
		carried += segment;
		prev = next;
	}
	while (out.length < n) out.push(points[points.length - 1]);
	return out;
}

/** Total turning in radians: positive one way round, negative the other. ±2π is one loop. */
function netTurning(points: Point[]): number {
	let total = 0;
	for (let i = 2; i < points.length; i++) {
		const a = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x);
		const b = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
		let d = b - a;
		while (d > Math.PI) d -= 2 * Math.PI;
		while (d <= -Math.PI) d += 2 * Math.PI;
		total += d;
	}
	return total;
}

/**
 * Turns round the stroke's middle (±1 is once round). Unlike `netTurning` it
 * can't lose a turn at a sharp corner, where a wobble decides which way a
 * near U-turn counts, so thin and flat triangles still read as one loop.
 */
function winding(points: Point[]): number {
	let cx = 0;
	let cy = 0;
	for (const p of points) {
		cx += p.x / points.length;
		cy += p.y / points.length;
	}
	let total = 0;
	let prev = Math.atan2(points[0].y - cy, points[0].x - cx);
	for (let i = 1; i < points.length; i++) {
		const a = Math.atan2(points[i].y - cy, points[i].x - cx);
		let d = a - prev;
		while (d > Math.PI) d -= 2 * Math.PI;
		while (d <= -Math.PI) d += 2 * Math.PI;
		total += d;
		prev = a;
	}
	return total / (2 * Math.PI);
}

/** How often the stroke changes direction along one axis by more than `min`. */
function reversals(values: number[], min: number): number {
	let count = 0;
	let direction = 0;
	let hi = values[0];
	let lo = values[0];
	let extreme = values[0];
	for (const v of values) {
		if (direction === 0) {
			hi = Math.max(hi, v);
			lo = Math.min(lo, v);
			if (hi - lo > min) {
				direction = v === hi ? 1 : -1;
				extreme = v;
			}
		} else if (direction > 0 ? v > extreme : v < extreme) {
			extreme = v;
		} else if (Math.abs(v - extreme) > min) {
			count++;
			direction = -direction;
			extreme = v;
		}
	}
	return count;
}

/**
 * Corners and straight sides, to tell a triangle from smooth
 * curves. Looks at how much the line turns over a few samples at each point: a
 * circle or swirl turns a steady amount everywhere, a triangle turns almost
 * nowhere apart from its corners (one more if the drawing starts mid-side).
 */
function angles(points: Point[]): { corners: number; straight: number } {
	const k = 3;
	let corners = 0;
	let straight = 0;
	let inCorner = false;
	for (let i = k; i < points.length - k; i++) {
		const a = Math.atan2(points[i].y - points[i - k].y, points[i].x - points[i - k].x);
		const b = Math.atan2(points[i + k].y - points[i].y, points[i + k].x - points[i].x);
		let d = Math.abs(b - a);
		if (d > Math.PI) d = 2 * Math.PI - d;
		if (d < Math.PI / 12) straight++;
		const sharp = d > (Math.PI * 35) / 180;
		if (sharp && !inCorner) corners++;
		inCorner = sharp;
	}
	return { corners, straight: straight / (points.length - 2 * k) };
}

/**
 * How much of its bounding box a loop's outline fills, with the box turned to
 * fit best: about 0.9 for a square (even drawn as a diamond), 0.8 a circle,
 * under 0.5 a triangle. Keeps squares, which count as circles, from reading as
 * triangles.
 */
function fill(points: Point[]): number {
	// The outline's area, so drawing round twice or leaving a gap doesn't change it.
	const outline = hull(points);
	let area = 0;
	for (let i = 0; i < outline.length; i++) {
		const a = outline[i];
		const b = outline[(i + 1) % outline.length];
		area += a.x * b.y - b.x * a.y;
	}
	area = Math.abs(area) / 2;
	let best = 0;
	for (let step = 0; step < 6; step++) {
		const cos = Math.cos((step * Math.PI) / 12);
		const sin = Math.sin((step * Math.PI) / 12);
		let [minU, maxU, minV, maxV] = [Infinity, -Infinity, Infinity, -Infinity];
		for (const p of outline) {
			const u = p.x * cos + p.y * sin;
			const v = p.y * cos - p.x * sin;
			minU = Math.min(minU, u);
			maxU = Math.max(maxU, u);
			minV = Math.min(minV, v);
			maxV = Math.max(maxV, v);
		}
		best = Math.max(best, area / ((maxU - minU) * (maxV - minV) || 1));
	}
	return best;
}

/** The convex hull: the shape a rubber band round the points would make. */
function hull(points: Point[]): Point[] {
	const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
	const cross = (o: Point, a: Point, b: Point) =>
		(a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const half = (list: Point[]) => {
		const out: Point[] = [];
		for (const p of list) {
			while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
			out.push(p);
		}
		out.pop();
		return out;
	};
	return [...half(sorted), ...half(sorted.reverse())];
}

export function classify(raw: Point[]): Shape | null {
	if (raw.length < 4) return null;
	const xs = raw.map((p) => p.x);
	const ys = raw.map((p) => p.y);
	const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
	if (size < MIN_SIZE) return null;

	const points = resample(raw);
	const loops = Math.abs(netTurning(points)) / (2 * Math.PI);
	const { corners, straight } = angles(points);
	const min = size * 0.2;
	const back = Math.max(reversals(xs, min), reversals(ys, min));
	// Half a loop, its ends far apart, a round middle (a V is too thin) and no
	// back and forth (a zigzag): an arch, any way up. Measured on a few
	// points, as a wobbly line adds turns either way.
	const first = points[0];
	const last = points[points.length - 1];
	const gap = Math.hypot(last.x - first.x, last.y - first.y) / size;
	const half = Math.abs(netTurning(resample(raw, 12))) / (2 * Math.PI);
	const full = fill(points);
	if (half >= 0.25 && half < 0.6 && gap > 0.65 && full >= 0.62 && back < 2) return 'arch';
	// Once round, thin, with corners and straight sides: a triangle, any shape
	// (tall, flat, lopsided). Counted round its middle, as sharp corners can
	// lose a turn in `loops`; still a swirl if `loops` says so. Fill up to 0.68,
	// as wobble fattens thin ones (squares are about 0.9, circles 0.8).
	const round = Math.abs(winding(points));
	if (round >= 0.75 && loops < 1.6 && corners >= 2 && straight >= 0.25 && full < 0.68)
		return 'triangle';
	if (loops >= 1.6) return 'swirl';
	// Otherwise one loop is a circle (a square counts too).
	if (loops >= 0.65) return 'circle';

	if (back >= 2 && loops < 0.6) return 'zigzag';
	return null;
}

/** A real attempt at drawing something (not a tap), for being kind after a few misses. */
export function isAttempt(points: Point[]): boolean {
	return pathLength(points) > 120;
}

/** The triangle's corners in a unit box, top point first. */
export const TRIANGLE: Point[] = [
	{ x: 0.5, y: 0.08 },
	{ x: 0.95, y: 0.88 },
	{ x: 0.05, y: 0.88 }
];

/** The shape drawn as points in a unit box (0..1), for the ghost finger and the badges. */
export function guide(shape: Shape, n = 60): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		if (shape === 'circle') {
			const a = -Math.PI / 2 + t * Math.PI * 2;
			out.push({ x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) });
		} else if (shape === 'triangle') {
			// Clockwise from the top point.
			const side = Math.min(2, Math.floor(t * 3));
			const f = t * 3 - side;
			const a = TRIANGLE[side];
			const b = TRIANGLE[(side + 1) % 3];
			out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
		} else if (shape === 'arch') {
			// A rainbow, left to right over the top.
			const a = Math.PI + t * Math.PI;
			out.push({ x: 0.5 + 0.45 * Math.cos(a), y: 0.72 + 0.45 * Math.sin(a) });
		} else if (shape === 'swirl') {
			const a = t * Math.PI * 4.4;
			const r = 0.08 + 0.42 * t;
			out.push({ x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) });
		} else {
			// Four strokes: down, up, down, up.
			const leg = t * 4;
			const k = Math.min(3, Math.floor(leg));
			const f = leg - k;
			const y = k % 2 === 0 ? f : 1 - f;
			out.push({ x: t, y: 0.1 + 0.8 * y });
		}
	}
	return out;
}
