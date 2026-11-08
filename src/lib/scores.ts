// The family leaderboard: each device's squid and its best hard-mode game.
// The page posts its squid to /api/scores and gets the top squids back.
import type { Player } from './game/progress.ts';

/** What a device sends: its squid's name, colour and best game. */
export type Entry = { device: string; name: string; color: string; best: number };
/** A row of the board. `me` marks this device's squid. */
export type Row = { name: string; color: string; best: number; me: boolean };

const DEVICE = 'squid-device';

/** A random id for this device, kept with its saves: it's the squid's row on the board. */
function deviceId(store: Pick<Storage, 'getItem' | 'setItem'>) {
	let id = store.getItem(DEVICE);
	if (!id) {
		id = crypto.randomUUID();
		store.setItem(DEVICE, id);
	}
	return id;
}

/** Sends the squid's best and returns the board, or null offline. */
export async function syncScores(player: Player): Promise<Row[] | null> {
	try {
		const entry: Entry = {
			device: deviceId(localStorage),
			name: player.name,
			color: player.color,
			best: player.best
		};
		const res = await fetch('/api/scores', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(entry)
		});
		return res.ok ? ((await res.json()) as Row[]) : null;
	} catch {
		return null;
	}
}
