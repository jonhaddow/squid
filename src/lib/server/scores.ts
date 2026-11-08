// Checking what devices post to the leaderboard.
import { NAME_MAX, PALETTE } from '../game/progress.ts';
import type { Entry } from '../scores.ts';

/** Squids the start screen shows. */
export const TOP = 5;

/** Checks a posted entry, or null if it's not one the game would send. */
export function parseEntry(body: unknown): Entry | null {
	if (!body || typeof body !== 'object') return null;
	const { device, name, color, best } = body as Record<string, unknown>;
	if (typeof device !== 'string' || !/^[\w-]{16,64}$/.test(device)) return null;
	if (typeof name !== 'string' || typeof color !== 'string' || !PALETTE.includes(color))
		return null;
	if (!Number.isInteger(best) || (best as number) < 0 || (best as number) > 100_000) return null;
	return { device, name: name.trim().slice(0, NAME_MAX), color, best: best as number };
}
