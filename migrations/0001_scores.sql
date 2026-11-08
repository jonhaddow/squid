-- The leaderboard: each device's squid and its best hard-mode game (friends made).
CREATE TABLE scores (
	device TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	color TEXT NOT NULL,
	best INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX scores_best ON scores (best DESC);
