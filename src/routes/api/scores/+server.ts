// The leaderboard's only route: save this device's squid, return the top squids.
import { env } from 'cloudflare:workers';
import { error, json } from '@sveltejs/kit';
import { parseEntry, TOP } from '#lib/server/scores.ts';
import type { Row } from '#lib/scores.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

export const POST: RequestHandler = async ({ request }) => {
	const entry = parseEntry(await request.json().catch(() => null));
	if (!entry) error(400);
	const top = env.DB.prepare(
		'SELECT name, color, hat, neck, face, best, device = ?1 AS me FROM scores ORDER BY best DESC, updated_at LIMIT ?2'
	).bind(entry.device, TOP);
	// A squid joins the board once it's made a friend in hard mode.
	if (entry.best > 0)
		await env.DB.prepare(
			`INSERT INTO scores (device, name, color, hat, neck, face, best, updated_at)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
			ON CONFLICT (device) DO UPDATE SET name = ?2, color = ?3, hat = ?4, neck = ?5, face = ?6,
				best = max(best, ?7), updated_at = iif(?7 > best, ?8, updated_at)`
		)
			.bind(
				entry.device,
				entry.name,
				entry.color,
				entry.hat,
				entry.neck,
				entry.face,
				entry.best,
				Date.now()
			)
			.run();
	const { results } = await top.all<Omit<Row, 'me'> & { me: number }>();
	return json(results.map((r) => ({ ...r, me: !!r.me })));
};
