// Each kid's squid and how far they've got, kept in the browser (localStorage).
// Pure apart from the storage passed in, so it's unit tested.
import { SHAPES, type Shape } from './gestures.ts';

export const HATS = ['wizard', 'crown', 'pirate', 'party', 'top', 'flower'] as const;
export type Hat = (typeof HATS)[number];

export type Player = {
	/** Body colour of their squid. */
	color: string;
	/** The level they're on, from 1. */
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

/** After a level: the next hat (worn straight away) and on to the next level. */
export function finishLevel(player: Player): Hat | null {
	const hat = HATS.find((h) => !player.hats.includes(h)) ?? null;
	if (hat) {
		player.hats.push(hat);
		player.hat = hat;
	}
	player.level++;
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

export type Plan = {
	/** The shape each creature needs, in the order they arrive. */
	creatures: Shape[];
	/** Seconds a creature takes to swim across the screen. */
	crossing: number;
	/** Seconds between arrivals. */
	gap: number;
	/** Most creatures on screen at once. */
	crowd: number;
};

export function planLevel(level: number, ease: number, random = Math.random): Plan {
	const creatures: Shape[] = [];
	// Level 1 starts with one of each, one at a time, so each can be taught.
	if (level === 1) creatures.push(...SHAPES);
	const count = 4 + level * 2;
	while (creatures.length < count) creatures.push(SHAPES[Math.floor(random() * SHAPES.length)]);
	const speed = (1 + (level - 1) * 0.12) * ease;
	return {
		creatures,
		crossing: 16 / speed,
		gap: Math.max(1.5, 5 - level * 0.4) / ease,
		crowd: Math.min(4, 1 + Math.floor(level / 2))
	};
}
