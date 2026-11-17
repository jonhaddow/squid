import { expect, it } from 'vitest';
import { handoffLink, NEW_HOME } from './handoff.ts';

function store(items: Record<string, string>) {
	const keys = Object.keys(items);
	return {
		length: keys.length,
		key: (i: number) => keys[i] ?? null,
		getItem: (k: string) => items[k] ?? null
	};
}

it('carries the squid storage in the link', () => {
	const link = handoffLink(
		store({ 'squid-device': 'abc', 'squid-spells-v1': '[{"best":3}]', other: 'x' })
	);
	const b64 = link.split('#import=')[1].replace(/-/g, '+').replace(/_/g, '/');
	const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
	expect(JSON.parse(json)).toEqual({ 'squid-device': 'abc', 'squid-spells-v1': '[{"best":3}]' });
});

it('goes plainly to the new home without a save', () => {
	expect(handoffLink(store({}))).toBe(NEW_HOME);
});
