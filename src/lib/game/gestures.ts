// Tells which spell shape a finger drew: a circle (shield), a zigzag (zap), a
// swirl (bubbles, hard mode) or a line (bubbles, easy mode). Forgiving on purpose: a 6 year old's wobbly circle counts.
// It works on how much the line turns overall, so size, speed, direction and
// where on the screen it was drawn don't matter.

export type Shape = 'circle' | 'zigzag' | 'swirl' | 'line';
export type Point = { x: number; y: number };

export type Mode = 'easy' | 'hard';

/** The shapes each mode uses: easy swaps the swirl for a straight line. */
export const SHAPES: Record<Mode, Shape[]> = {
	easy: ['zigzag', 'line', 'circle'],
	hard: ['zigzag', 'swirl', 'circle']
};

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

/** Never strays far from the straight line between its ends: a line, any direction. */
function isLine(points: Point[]): boolean {
	const a = points[0];
	const b = points[points.length - 1];
	const ends = Math.hypot(b.x - a.x, b.y - a.y);
	if (ends < 60) return false;
	let furthest = 0;
	for (const p of points) {
		const off = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / ends;
		furthest = Math.max(furthest, off);
	}
	return furthest / ends < 0.18;
}

export function classify(raw: Point[]): Shape | null {
	if (raw.length < 4) return null;
	const xs = raw.map((p) => p.x);
	const ys = raw.map((p) => p.y);
	const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
	if (size < MIN_SIZE) return null;

	const points = resample(raw);
	if (isLine(raw)) return 'line';
	const loops = Math.abs(netTurning(points)) / (2 * Math.PI);
	if (loops >= 1.6) return 'swirl';
	if (loops >= 0.65) return 'circle';

	const min = size * 0.2;
	const back = Math.max(reversals(xs, min), reversals(ys, min));
	if (back >= 2 && loops < 0.6) return 'zigzag';
	return null;
}

/** A real attempt at drawing something (not a tap), for being kind after a few misses. */
export function isAttempt(points: Point[]): boolean {
	return pathLength(points) > 120;
}

/** The shape drawn as points in a unit box (0..1), for the ghost finger and the badges. */
export function guide(shape: Shape, n = 60): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		if (shape === 'circle') {
			const a = -Math.PI / 2 + t * Math.PI * 2;
			out.push({ x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) });
		} else if (shape === 'line') {
			out.push({ x: 0.1 + 0.8 * t, y: 0.5 });
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
