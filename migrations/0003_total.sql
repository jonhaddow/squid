-- Friends made across every game, both modes: the second board.
ALTER TABLE scores ADD COLUMN total INTEGER NOT NULL DEFAULT 0;
CREATE INDEX scores_total ON scores (total DESC);
