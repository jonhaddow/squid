-- Friends made across every game, both modes: the second board.
ALTER TABLE scores ADD COLUMN total INTEGER NOT NULL DEFAULT 0;
