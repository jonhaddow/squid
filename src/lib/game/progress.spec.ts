import { describe, expect, it } from 'vitest';
import {
	befriended,
	finishWave,
	firstCreatures,
	loadPlayers,
	missed,
	newPlayer,
	nextShape,
	nextHat,
	planWave,
	TOP_WAVE,
	savePlayers
} from './progress.ts';

function memory() {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v)
	};
}

describe('players', () => {
	it('fills in new fields for older saves', () => {
		const store = memory();
		store.setItem('squid-spells-v1', JSON.stringify([{ level: 3, stars: 9 }]));
		expect(loadPlayers(store)[0]).toMatchObject({ level: 3, stars: 9, ease: 1, hats: [] });
	});

	it('starts with two fresh squids and saves them', () => {
		const store = memory();
		const players = loadPlayers(store);
		expect(players).toHaveLength(2);
		players[1].stars = 7;
		savePlayers(store, players);
		expect(loadPlayers(store)[1].stars).toBe(7);
	});

	it('survives junk in storage', () => {
		const store = memory();
		store.setItem('squid-spells-v1', '{oops');
		expect(loadPlayers(store)[0].level).toBe(1);
	});

	it('gives a new hat each wave, then cycles through them', () => {
		const p = newPlayer('#fff');
		expect(finishWave(p, 'easy')).toBe('wizard');
		expect(finishWave(p, 'hard')).toBe('crown');
		// Only easy mode remembers the wave: hard mode starts again each game.
		expect(p).toMatchObject({ level: 2, hat: 'crown' });
		expect(nextHat(p)).toBeNull();
		expect(nextHat(p)).toBe('wizard');
		expect(nextHat(p)).toBe('crown');
	});
});

describe('difficulty', () => {
	it('eases off on misses and stays in bounds', () => {
		let ease = 1;
		for (let i = 0; i < 20; i++) ease = missed(ease);
		expect(ease).toBe(0.5);
		for (let i = 0; i < 100; i++) ease = befriended(ease);
		expect(ease).toBe(1.4);
	});

	it('teaches each shape first on wave 1, then gets faster and busier, to a limit', () => {
		expect(firstCreatures(1, 'easy')).toEqual(['zigzag', 'square', 'circle']);
		expect(firstCreatures(2, 'easy')).toEqual([]);
		const one = planWave(1, 'easy');
		expect(one).toMatchObject({ speed: 1, crowd: 1 });
		const five = planWave(5, 'easy');
		expect(five.speed).toBeGreaterThan(one.speed);
		expect(five.crowd).toBeGreaterThan(one.crowd);
		expect(planWave(TOP_WAVE + 1, 'easy').speed).toBe(planWave(TOP_WAVE, 'easy').speed);
		expect(planWave(100, 'hard')).toEqual(planWave(TOP_WAVE, 'hard'));
	});

	it('uses the swirl only in hard mode', () => {
		expect(firstCreatures(1, 'hard')).toEqual(['zigzag', 'swirl', 'circle']);
		const easy = Array.from({ length: 50 }, () => nextShape([], 'easy'));
		const hard = Array.from({ length: 50 }, () => nextShape([], 'hard'));
		expect(easy).not.toContain('swirl');
		expect(hard).not.toContain('square');
	});
});
