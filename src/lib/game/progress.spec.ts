import { describe, expect, it } from 'vitest';
import {
	finishWave,
	firstCreatures,
	loadPlayers,
	newPlayer,
	nextShape,
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
		expect(loadPlayers(store)[0]).toMatchObject({ level: 3, stars: 9, name: '', hats: [] });
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

	it('unlocks a new hat each wave without changing what they wear', () => {
		const p = newPlayer('#fff');
		p.hat = null;
		expect(finishWave(p, 'easy')).toBe('wizard');
		expect(finishWave(p, 'hard')).toBe('crown');
		// Only easy mode remembers the wave: hard mode starts again each game.
		expect(p).toMatchObject({ level: 2, hats: ['wizard', 'crown'], hat: null });
	});

	it('keeps a name, trimmed to fit', () => {
		const store = memory();
		store.setItem('squid-spells-v1', JSON.stringify([{ name: 7 }, { name: 'Princess Sparkles' }]));
		const [a, b] = loadPlayers(store);
		expect(a.name).toBe('');
		expect(b.name).toBe('Princess Spa');
	});

	it('keeps a chosen colour and outfit, but not a colour off the palette', () => {
		const store = memory();
		const players = loadPlayers(store);
		Object.assign(players[0], { color: '#2ed8a3', neck: 'bowtie', face: 'shades' });
		players[1].color = 'red';
		savePlayers(store, players);
		const [a, b] = loadPlayers(store);
		expect(a).toMatchObject({ color: '#2ed8a3', neck: 'bowtie', face: 'shades' });
		expect(b.color).toBe('#ff7a3d');
	});
});

describe('difficulty', () => {
	it('teaches each shape first on wave 1', () => {
		expect(firstCreatures(1, 'easy')).toEqual(['zigzag', 'square', 'circle']);
		expect(firstCreatures(2, 'easy')).toEqual([]);
	});

	it('keeps easy mode the same every wave', () => {
		expect(planWave(1, 'easy')).toEqual({ speed: 1, gap: 4.6, crowd: 1 });
		expect(planWave(50, 'easy')).toEqual(planWave(1, 'easy'));
	});

	it('makes hard mode faster and busier each wave, to a limit', () => {
		const one = planWave(1, 'hard');
		const five = planWave(5, 'hard');
		expect(one.speed).toBeGreaterThan(1);
		expect(five.speed).toBeGreaterThan(one.speed);
		expect(five.crowd).toBeGreaterThan(one.crowd);
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
