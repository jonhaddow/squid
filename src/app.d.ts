import type { Game } from '#lib/game/game.ts';

declare global {
	interface Window {
		/** The running game, for the end-to-end tests. */
		__squid?: Game;
	}
}

export {};
