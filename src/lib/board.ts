// The shared leaderboard and profile live in the games launcher
// (games.app.haddow.me, its own repo). The launcher hands this game the
// player's id as #profile=<id> in its links; it's kept here, because on iOS
// each home-screen app has its own storage and cookies.

const LAUNCHER = 'https://games.app.haddow.me';
const GAME = 'squid';
const PROFILE = 'games-profile';

export type Standing = {
	player: { name: string; colour: string } | null;
	me: { rank: number; value: number } | null;
};

export const boardUrl = `${LAUNCHER}/boards/${GAME}`;

/** The launcher's profile page, coming back to this page after. */
export const pickNameUrl = () =>
	`${LAUNCHER}/profile?back=${encodeURIComponent(location.origin + location.pathname)}`;

/** Keeps an id handed over in the link, and tidies it out of the address bar. */
function profileId() {
	const handed = /^#profile=([\w-]+)$/.exec(location.hash)?.[1];
	if (handed) {
		localStorage.setItem(PROFILE, handed);
		history.replaceState(history.state, '', location.pathname + location.search);
	}
	return localStorage.getItem(PROFILE);
}

/**
 * Sends this device's best Challenge game, in friends (the launcher keeps the
 * better of it and what it has), or just asks, with no best yet. Null if the
 * launcher can't be reached. Squid's own board (/api/scores) is separate.
 */
export async function report(best: number): Promise<Standing | null> {
	const id = profileId();
	try {
		const res = await fetch(`${LAUNCHER}/api/scores/${GAME}`, {
			method: best > 0 ? 'POST' : 'GET',
			headers: {
				...(id && { 'x-games-profile': id }),
				...(best > 0 && { 'content-type': 'application/json' })
			},
			...(best > 0 && { body: JSON.stringify({ value: best }) })
		});
		if (!res.ok) return null;
		const { player, me } = (await res.json()) as Standing;
		return { player, me };
	} catch {
		return null;
	}
}
