import { describe, expect, it } from 'vitest';
import {
	befriended,
	finishLevel,
	loadPlayers,
	missed,
	newPlayer,
	nextHat,
	planLevel,
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
	it('fills in hard mode for saves from before it existed', () => {
		const store = memory();
		store.setItem('squid-spells-v1', JSON.stringify([{ level: 3, stars: 9 }]));
		expect(loadPlayers(store)[0]).toMatchObject({ level: 3, hardLevel: 1, stars: 9 });
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

	it('gives a new hat each level, then cycles through them', () => {
		const p = newPlayer('#fff');
		expect(finishLevel(p, 'easy')).toBe('wizard');
		expect(finishLevel(p, 'hard')).toBe('crown');
		expect(p).toMatchObject({ level: 2, hardLevel: 2, hat: 'crown' });
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

	it('teaches each shape first on level 1, then gets busier', () => {
		const one = planLevel(1, 1, 'easy', () => 0);
		expect(one.creatures.slice(0, 3)).toEqual(['zigzag', 'line', 'circle']);
		expect(one.crowd).toBe(1);
		const five = planLevel(5, 1, 'easy');
		expect(five.creatures.length).toBeGreaterThan(one.creatures.length);
		expect(five.crossing).toBeLessThan(one.crossing);
		expect(planLevel(1, 0.5, 'easy').crossing).toBeGreaterThan(one.crossing);
	});

	it('uses the swirl only in hard mode', () => {
		const easy = planLevel(4, 1, 'easy').creatures;
		const hard = planLevel(1, 1, 'hard').creatures;
		expect(easy).not.toContain('swirl');
		expect(hard.slice(0, 3)).toEqual(['zigzag', 'swirl', 'circle']);
		expect(hard).not.toContain('line');
	});
});
