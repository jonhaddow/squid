import { describe, expect, it } from 'vitest';
import { parseEntry } from './scores.ts';

const device = '3f2a9c1e-8b7d-4e6f-a5c4-1d2e3f4a5b6c';

describe('parseEntry', () => {
	it('takes what the game sends, with the name trimmed to fit', () => {
		expect(
			parseEntry({
				device,
				name: ' Princess Sparkles ',
				color: '#ff7a3d',
				hat: 'crown',
				neck: 'scarf',
				face: 'shades',
				best: 23,
				total: 140
			})
		).toEqual({
			device,
			name: 'Princess Spa',
			color: '#ff7a3d',
			hat: 'crown',
			neck: 'scarf',
			face: 'shades',
			best: 23,
			total: 140
		});
	});

	it("drops things to wear it doesn't know, as from an older game", () => {
		expect(
			parseEntry({ device, name: 'Ada', color: '#ff7a3d', hat: 'helmet', best: 1 })
		).toMatchObject({ hat: null, neck: null, face: null, total: 0 });
	});

	it('turns away anything else', () => {
		const ok = { device, name: 'Ada', color: '#ff7a3d', best: 3 };
		for (const bad of [
			null,
			'hi',
			{ ...ok, device: 'short' },
			{ ...ok, device: `${device}'; drop` },
			{ ...ok, name: 7 },
			{ ...ok, color: 'red' },
			{ ...ok, best: -1 },
			{ ...ok, best: 2.5 },
			{ ...ok, best: '9' },
			{ ...ok, best: 1e9 },
			{ ...ok, total: -1 },
			{ ...ok, total: '9' }
		])
			expect(parseEntry(bad)).toBeNull();
	});
});
