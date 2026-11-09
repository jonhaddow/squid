// Checking what devices post to the leaderboard.
import { FACES, HATS, NAME_MAX, NECKS, PALETTE } from '../game/progress.ts';
import type { Entry } from '../scores.ts';

/** Squids the start screen shows. */
export const TOP = 20;

/** Checks a posted entry, or null if it's not one the game would send. */
export function parseEntry(body: unknown): Entry | null {
	if (!body || typeof body !== 'object') return null;
	const { device, name, color, hat, neck, face, best, total = 0 } = body as Record<string, unknown>;
	if (typeof device !== 'string' || !/^[\w-]{16,64}$/.test(device)) return null;
	if (typeof name !== 'string' || typeof color !== 'string' || !PALETTE.includes(color))
		return null;
	if (!isCount(best) || !isCount(total)) return null;
	return {
		device,
		name: name.trim().slice(0, NAME_MAX),
		color,
		hat: pick(HATS, hat),
		neck: pick(NECKS, neck),
		face: pick(FACES, face),
		best: best as number,
		total: total as number
	};
}

/** A whole number of friends, from 0 to a lot. Older games send no total. */
const isCount = (n: unknown) =>
	Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 10_000_000;

/** One of `items`, or nothing (an older game sends none). */
function pick<T extends string>(items: readonly T[], value: unknown): T | null {
	return items.includes(value as T) ? (value as T) : null;
}
