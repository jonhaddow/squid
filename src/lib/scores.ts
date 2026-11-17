// The family leaderboards: each device's squid, by its best hard-mode game and
// by friends made in all its games. The page posts its squid to /api/scores and
// gets the top squids back.
import type { Look, Player } from './game/progress.ts';

/** What a device sends: its squid's name, look and scores. */
export type Entry = Look & { device: string; name: string; best: number; total: number };
/** A row of the board, with the squid to draw. `me` marks this device's squid. */
export type Row = Look & { name: string; best: number; total: number; me: boolean };
/** Both boards: by best game and by all games. */
export type Boards = { best: Row[]; total: Row[] };

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

/** Sends the squid's scores and returns the boards, or null offline. */
export async function syncScores(player: Player): Promise<Boards | null> {
	try {
		const entry: Entry = {
			device: deviceId(localStorage),
			name: player.name,
			color: player.color,
			hat: player.hat,
			neck: player.neck,
			face: player.face,
			best: player.best,
			total: player.total
		};
		const res = await fetch('/api/scores', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(entry)
		});
		return res.ok ? ((await res.json()) as Boards) : null;
	} catch {
		return null;
	}
}
