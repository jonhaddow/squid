// Squid Spells has moved into the games app, at games.app.haddow.me/squid.
// This site's storage (the save, and the device id its board row was kept
// under) can't be read from there, so it goes along in the link. The games
// app takes it in (its src/lib/squid/handoff.ts) and links the board scores.

export const NEW_HOME = 'https://games.app.haddow.me/squid';

/** The link to the new home, carrying this device's squid storage, if any. */
export function handoffLink(store: Pick<Storage, 'length' | 'key' | 'getItem'>) {
	const items: Record<string, string> = {};
	for (let i = 0; i < store.length; i++) {
		const key = store.key(i);
		const value = key?.startsWith('squid-') ? store.getItem(key) : null;
		if (key && value !== null) items[key] = value;
	}
	if (!Object.keys(items).length) return NEW_HOME;
	const bytes = new TextEncoder().encode(JSON.stringify(items));
	const b64 = btoa(String.fromCharCode(...bytes));
	return `${NEW_HOME}#import=${b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
