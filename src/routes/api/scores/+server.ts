// The leaderboard's only route: save this device's squid, return the top squids
// on both boards (best game, all games).
import { env } from 'cloudflare:workers';
import { error, json } from '@sveltejs/kit';
import { parseEntry, TOP } from '#lib/server/scores.ts';
import type { Boards, Row } from '#lib/scores.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

const ROWS = 'SELECT name, color, hat, neck, face, best, total, device = ?1 AS me FROM scores';

export const POST: RequestHandler = async ({ request }) => {
	const entry = parseEntry(await request.json().catch(() => null));
	if (!entry) error(400);
	const best = env.DB.prepare(
		`${ROWS} WHERE best > 0 ORDER BY best DESC, updated_at LIMIT ?2`
	).bind(entry.device, TOP);
	const total = env.DB.prepare(`${ROWS} ORDER BY total DESC, updated_at LIMIT ?2`).bind(
		entry.device,
		TOP
	);
	// A squid joins the boards once it's made a friend.
	if (entry.best > 0 || entry.total > 0)
		await env.DB.prepare(
			`INSERT INTO scores (device, name, color, hat, neck, face, best, total, updated_at)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
			ON CONFLICT (device) DO UPDATE SET name = ?2, color = ?3, hat = ?4, neck = ?5, face = ?6,
				best = max(best, ?7), total = max(total, ?8), updated_at = iif(?7 > best, ?9, updated_at)`
		)
			.bind(
				entry.device,
				entry.name,
				entry.color,
				entry.hat,
				entry.neck,
				entry.face,
				entry.best,
				entry.total,
				Date.now()
			)
			.run();
	const [b, t] = await env.DB.batch<Omit<Row, 'me'> & { me: number }>([best, total]);
	const rows = (r: typeof b) => r.results.map((row) => ({ ...row, me: !!row.me }));
	return json({ best: rows(b), total: rows(t) } satisfies Boards);
};
