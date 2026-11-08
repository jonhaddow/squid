// The device's squid and how far it's got, kept in the browser (localStorage).
// Pure apart from the storage passed in, so it's unit tested.
import { SHAPES, type Mode, type Shape } from './gestures.ts';

export const HATS = ['wizard', 'crown', 'pirate', 'party', 'top', 'flower'] as const;
export type Hat = (typeof HATS)[number];
/** Dress-up bits that aren't won: any squid can wear them from the start. */
export const NECKS = ['pearls', 'bowtie', 'scarf', 'medal'] as const;
export type Neck = (typeof NECKS)[number];
export const FACES = ['glasses', 'shades', 'hearts', 'monocle'] as const;
export type Face = (typeof FACES)[number];

export type Player = {
	/** The squid's name, typed in the dressing room ('' for none yet). */
	name: string;
	/** Body colour of their squid. */
	color: string;
	/** The wave they're on in easy mode, from 1 (saved as `level` from before waves). Hard mode starts at 1 each game. */
	level: number;
	/** Most friends made in one hard-mode game: the leaderboard score. */
	best: number;
	hats: Hat[];
	hat: Hat | null;
	neck: Neck | null;
	face: Face | null;
	/** Shapes they've cast once: the ghost finger stops showing these. */
	learned: Shape[];
};

/** The colours to choose from in the dressing room. */
export const PALETTE = [
	'#b45cff',
	'#ff7a3d',
	'#ff5fa2',
	'#3d8bff',
	'#2ed8a3',
	'#ffc93c',
	'#ff4d4d',
	'#8a8fa8'
];
/** How a squid looks: what the drawing needs. */
export type Look = Pick<Player, 'color' | 'hat' | 'neck' | 'face'>;

const KEY = 'squid-spells-v1';
/** Long enough for any kid's name, short enough to fit under the squid. */
export const NAME_MAX = 12;

export function newPlayer(): Player {
	return {
		name: '',
		color: PALETTE[0],
		level: 1,
		best: 0,
		hats: [],
		hat: null,
		neck: null,
		face: null,
		learned: []
	};
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** One squid per device. Saved as a list, as when there were two: the first is kept. */
export function loadPlayer(store: Store): Player {
	const fresh = newPlayer();
	try {
		const saved = JSON.parse(store.getItem(KEY) ?? 'null') as Partial<Player>[] | null;
		if (!Array.isArray(saved)) return fresh;
		const player = { ...fresh, ...saved[0] };
		// Only colours from the palette: the drawing code needs a #rrggbb.
		if (!PALETTE.includes(player.color)) player.color = fresh.color;
		player.name = typeof player.name === 'string' ? player.name.slice(0, NAME_MAX) : '';
		return player;
	} catch {
		return fresh;
	}
}

export function savePlayer(store: Store, player: Player) {
	try {
		store.setItem(KEY, JSON.stringify([player]));
	} catch {
		// Private mode or full storage: play on without saving.
	}
}

/** After each wave: the next hat to choose in the dressing room (what they're wearing stays), and easy mode remembers the wave. */
export function finishWave(player: Player, mode: Mode): Hat | null {
	const hat = HATS.find((h) => !player.hats.includes(h)) ?? null;
	if (hat) player.hats.push(hat);
	if (mode === 'easy') player.level++;
	return hat;
}

// Both modes are endless: creatures keep coming in waves of WAVE friends.
// Easy mode stays as it starts: one speed, one creature at a time. In hard
// mode each wave is faster, with no limit, and busier up to TOP_WAVE.
export const WAVE = 10;
export const TOP_WAVE = 7;

export type Plan = {
	/** Speed relative to easy mode. */
	speed: number;
	/** Seconds between arrivals. */
	gap: number;
	/** Most creatures on screen at once. */
	crowd: number;
};

/** Hard mode's creatures start this much faster than easy mode's. */
export const HARD_SPEED = 1.3;

export function planWave(wave: number, mode: Mode): Plan {
	if (mode === 'easy') return { speed: 1, gap: 4.6, crowd: 1 };
	const w = Math.min(wave, TOP_WAVE);
	return {
		speed: HARD_SPEED * (1 + (wave - 1) * 0.12),
		gap: Math.max(1.5, 5 - w * 0.4),
		crowd: Math.min(4, 2 + Math.floor(w / 2))
	};
}

/** A fresh start meets one of each kind first, so each can be taught; then they're random. */
export const firstCreatures = (wave: number, mode: Mode): Shape[] =>
	wave === 1 ? [...SHAPES[mode]] : [];

export function nextShape(queue: Shape[], mode: Mode, random = Math.random): Shape {
	const shapes = SHAPES[mode];
	return queue.shift() ?? shapes[Math.floor(random() * shapes.length)];
}

/** Every BOSS_EVERY waves (3, 6, 9...) ends with the kraken, after the wave's friends. */
const BOSS_EVERY = 3;
/** Spells it takes to befriend the kraken. */
export const BOSS_HITS = 3;

export const isBossWave = (wave: number) => wave % BOSS_EVERY === 0;

/** The kraken's shapes, one after another: random, but never the same twice in a row. */
export function bossShapes(mode: Mode, random = Math.random): Shape[] {
	const shapes = SHAPES[mode];
	const out: Shape[] = [];
	while (out.length < BOSS_HITS) {
		const shape = shapes[Math.floor(random() * shapes.length)];
		if (shape !== out[out.length - 1]) out.push(shape);
	}
	return out;
}
