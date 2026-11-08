import { describe, expect, it } from 'vitest';
import {
	bossShapes,
	finishWave,
	isBossWave,
	firstCreatures,
	loadPlayer,
	newPlayer,
	nextShape,
	planWave,
	TOP_WAVE,
	savePlayer
} from './progress.ts';

function memory() {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v)
	};
}

describe('player', () => {
	it('fills in new fields for older saves', () => {
		const store = memory();
		store.setItem('squid-spells-v1', JSON.stringify([{ level: 3 }]));
		expect(loadPlayer(store)).toMatchObject({ level: 3, best: 0, name: '', hats: [] });
	});

	it('keeps the first squid of an old two-squid save', () => {
		const store = memory();
		store.setItem('squid-spells-v1', JSON.stringify([{ best: 4 }, { best: 7 }]));
		expect(loadPlayer(store).best).toBe(4);
	});

	it('starts with a fresh squid and saves it', () => {
		const store = memory();
		const player = loadPlayer(store);
		expect(player.best).toBe(0);
		player.best = 12;
		savePlayer(store, player);
		expect(loadPlayer(store).best).toBe(12);
	});

	it('survives junk in storage', () => {
		const store = memory();
		store.setItem('squid-spells-v1', '{oops');
		expect(loadPlayer(store).level).toBe(1);
	});

	it('unlocks a new hat each wave without changing what they wear', () => {
		const p = newPlayer();
		p.hat = null;
		expect(finishWave(p, 'easy')).toBe('wizard');
		expect(finishWave(p, 'hard')).toBe('crown');
		// Only easy mode remembers the wave: hard mode starts again each game.
		expect(p).toMatchObject({ level: 2, hats: ['wizard', 'crown'], hat: null });
	});

	it('keeps a name, trimmed to fit', () => {
		const store = memory();
		store.setItem('squid-spells-v1', JSON.stringify([{ name: 'Princess Sparkles' }]));
		expect(loadPlayer(store).name).toBe('Princess Spa');
		store.setItem('squid-spells-v1', JSON.stringify([{ name: 7 }]));
		expect(loadPlayer(store).name).toBe('');
	});

	it('keeps a chosen colour and outfit, but not a colour off the palette', () => {
		const store = memory();
		const player = loadPlayer(store);
		Object.assign(player, { color: '#2ed8a3', neck: 'bowtie', face: 'shades' });
		savePlayer(store, player);
		expect(loadPlayer(store)).toMatchObject({ color: '#2ed8a3', neck: 'bowtie', face: 'shades' });
		store.setItem('squid-spells-v1', JSON.stringify([{ color: 'red' }]));
		expect(loadPlayer(store).color).toBe('#b45cff');
	});
});

describe('difficulty', () => {
	it('teaches each shape first on wave 1', () => {
		expect(firstCreatures(1, 'easy')).toEqual(['zigzag', 'square', 'circle', 'triangle', 'arch']);
		expect(firstCreatures(2, 'easy')).toEqual([]);
	});

	it('keeps easy mode the same every wave', () => {
		expect(planWave(1, 'easy')).toEqual({ speed: 1, gap: 4.6, crowd: 1 });
		expect(planWave(50, 'easy')).toEqual(planWave(1, 'easy'));
	});

	it('makes hard mode faster every wave, and busier to a limit', () => {
		const one = planWave(1, 'hard');
		const five = planWave(5, 'hard');
		expect(one.speed).toBeGreaterThan(1);
		expect(five.speed).toBeGreaterThan(one.speed);
		expect(five.crowd).toBeGreaterThan(one.crowd);
		const top = planWave(TOP_WAVE, 'hard');
		const later = planWave(TOP_WAVE + 3, 'hard');
		expect(later.speed).toBeGreaterThan(top.speed);
		expect(later).toMatchObject({ gap: top.gap, crowd: top.crowd });
	});

	it('uses the swirl only in hard mode', () => {
		expect(firstCreatures(1, 'hard')).toEqual(['zigzag', 'swirl', 'circle', 'triangle', 'arch']);
		const easy = Array.from({ length: 80 }, () => nextShape([], 'easy'));
		const hard = Array.from({ length: 80 }, () => nextShape([], 'hard'));
		expect(easy).not.toContain('swirl');
		expect(hard).not.toContain('square');
	});
});

describe('the kraken', () => {
	it('comes every 3 waves', () => {
		expect([1, 2, 3, 4, 6, 9, 10].filter(isBossWave)).toEqual([3, 6, 9]);
	});

	it("needs 3 spells of the mode's shapes, never the same twice in a row", () => {
		for (let i = 0; i < 50; i++) {
			const shapes = bossShapes('easy');
			expect(shapes).toHaveLength(3);
			expect(shapes.every((s) => s !== 'swirl')).toBe(true);
			expect(shapes[0]).not.toBe(shapes[1]);
			expect(shapes[1]).not.toBe(shapes[2]);
		}
		const rolls = [0.99, 0.99, 0, 0.5];
		expect(bossShapes('hard', () => rolls.shift()!)).toEqual(['arch', 'zigzag', 'circle']);
	});
});
