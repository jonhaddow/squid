// Each kid's squid and how far they've got, kept in the browser (localStorage).
// Pure apart from the storage passed in, so it's unit tested.
import { SHAPES, type Mode, type Shape } from './gestures.ts';

export const HATS = ['wizard', 'crown', 'pirate', 'party', 'top', 'flower'] as const;
export type Hat = (typeof HATS)[number];

export type Player = {
	/** Body colour of their squid. */
	color: string;
	/** The wave they're on in easy mode, from 1. Hard mode starts at 1 each game. */
	level: number;
	stars: number;
	hats: Hat[];
	hat: Hat | null;
	/** Shapes they've cast once: the ghost finger stops showing these. */
	learned: Shape[];
	/** Auto difficulty: below 1 creatures swim slower, above 1 faster. */
	ease: number;
};

export const COLORS = ['#b45cff', '#ff7a3d'];
const KEY = 'squid-spells-v1';

export function newPlayer(color: string): Player {
	return { color, level: 1, stars: 0, hats: [], hat: null, learned: [], ease: 1 };
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function loadPlayers(store: Store): Player[] {
	const fresh = COLORS.map(newPlayer);
	try {
		const saved = JSON.parse(store.getItem(KEY) ?? 'null') as Partial<Player>[] | null;
		if (!Array.isArray(saved)) return fresh;
		return fresh.map((p, i) => ({ ...p, ...saved[i], color: p.color }));
	} catch {
		return fresh;
	}
}

export function savePlayers(store: Store, players: Player[]) {
	try {
		store.setItem(KEY, JSON.stringify(players));
	} catch {
		// Private mode or full storage: play on without saving.
	}
}

/** After each wave: the next hat (worn straight away), and easy mode remembers the wave. */
export function finishWave(player: Player, mode: Mode): Hat | null {
	const hat = HATS.find((h) => !player.hats.includes(h)) ?? null;
	if (hat) {
		player.hats.push(hat);
		player.hat = hat;
	}
	if (mode === 'easy') player.level++;
	return hat;
}

/** Tapping the hat button: the next unlocked hat, then none. */
export function nextHat(player: Player): Hat | null {
	const i = player.hat ? player.hats.indexOf(player.hat) : -1;
	player.hat = player.hats[i + 1] ?? null;
	return player.hat;
}

// Auto difficulty: a miss (a fizzled spell, or a creature bumping the squid)
// slows things down a lot; each friend made speeds them up a little.
export const missed = (ease: number) => Math.max(0.5, +(ease - 0.1).toFixed(2));
export const befriended = (ease: number) => Math.min(1.4, +(ease + 0.03).toFixed(2));

// Both modes are endless: creatures keep coming in waves of WAVE friends.
// Each wave is a bit faster and busier, up to TOP_WAVE, then stays there.
export const WAVE = 10;
export const TOP_WAVE = 7;

export type Plan = {
	/** Speed relative to wave 1. */
	speed: number;
	/** Seconds between arrivals. */
	gap: number;
	/** Most creatures on screen at once. */
	crowd: number;
};

/** Hard mode doesn't adjust to misses: it's this much faster than easy, always. */
export const HARD_EASE = 1.3;

export function planWave(wave: number, mode: Mode): Plan {
	const w = Math.min(wave, TOP_WAVE);
	return {
		speed: 1 + (w - 1) * 0.12,
		gap: Math.max(1.5, 5 - w * 0.4),
		crowd: Math.min(4, 1 + Math.floor(w / 2) + (mode === 'hard' ? 1 : 0))
	};
}

/** A fresh start meets one of each kind first, so each can be taught; then they're random. */
export const firstCreatures = (wave: number, mode: Mode): Shape[] =>
	wave === 1 ? [...SHAPES[mode]] : [];
