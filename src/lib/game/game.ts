// The game: grumpy sea creatures swim towards your squid, each showing the
// shape it needs. Draw that shape anywhere and the squid's spell makes it a
// friend. In easy mode nothing hurts: a creature that reaches the squid just
// bumps it and backs off, and every wave is the same pace. Hard mode is faster,
// has 3 hearts and a game over, and speeds up and gets busier each wave (to a
// limit). Both are endless: every WAVE friends wins a hat. A creature the child
// hasn't cast yet stops, and a finger draws its shape until the child copies it.
// Every 5th wave ends with the kraken: the other creatures swim off, and it
// needs 3 spells, a random shape each, to become a friend.
import { sounds, say, unlock } from './audio.ts';
import { classify, guide, isAttempt, type Mode, type Point, type Shape } from './gestures.ts';
import {
	BOSS_HITS,
	bossShapes,
	finishWave,
	isBossWave,
	firstCreatures,
	nextShape,
	planWave,
	type Plan,
	TOP_WAVE,
	WAVE,
	type Player
} from './progress.ts';
import * as art from './sprites.ts';

type Mob = {
	shape: Shape;
	x: number;
	y: number;
	phase: number;
	/** `leave`: swimming off for the kraken. */
	state: 'swim' | 'back' | 'happy' | 'leave';
	/** Seconds in this state. */
	t: number;
	/** A spell is already on its way. */
	targeted: boolean;
	/** The kraken: bigger, slower, and needs BOSS_HITS spells. */
	boss: boolean;
	hits: number;
};

type Spell = { shape: Shape; mob: Mob; t: number };

type Bit = {
	kind: 'bubble' | 'spark' | 'heart' | 'star' | 'confetti';
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	color: string;
};

export type Events = {
	/** Progress changed: save it. */
	save(): void;
	/** Hard mode: out of hearts. */
	gameOver(): void;
};

export const HEARTS = 3;

const SPELL_TIME = 0.45;
const FONT = '"Luckiest Guy", system-ui, sans-serif';
const CONFETTI = ['#ffe066', '#ff5fa2', '#7cf0ff', '#b45cff', '#5dff9d'];
/** The triangle spell, drawn once. */
const TRIANGLE = guide('triangle');

/** Still grumpy and showing its shape. */
const isOpen = (m: Mob) => m.state === 'swim' || m.state === 'back';

export class Game {
	private ctx: CanvasRenderingContext2D;
	private w = 0;
	private h = 0;
	private sea: HTMLCanvasElement | null = null;
	private t = 0;
	private last = 0;
	private frame = 0;

	private mobs: Mob[] = [];
	private spells: Spell[] = [];
	private bits: Bit[] = [];
	private trail: Point[] = [];
	private drawing = false;

	private wave: number;
	/** Shapes to send first, then they're random. */
	private queue: Shape[];
	private friends = 0;
	private spawnIn = 1;
	private pace: Plan;
	/** Misses in a row: after 3, any real attempt counts and the finger shows again. */
	private misses = 0;
	private spin = 0;
	private flash = 0;
	private over = false;
	/** Seconds of confetti left after a wave. */
	private party = 0;
	private hearts = HEARTS;
	/** The kraken's shapes still to come, after the one it's showing. */
	private krakenShapes: Shape[] = [];
	/** The kraken's part of the wave: no other creatures. */
	private fighting = false;
	/** Seconds the lost heart flashes in the corner. */
	private hurt = 0;

	paused = false;

	constructor(
		private canvas: HTMLCanvasElement,
		private player: Player,
		private mode: Mode,
		private events: Events
	) {
		this.ctx = canvas.getContext('2d')!;
		this.wave = mode === 'hard' ? 1 : player.level;
		this.queue = firstCreatures(this.wave, mode);
		this.pace = planWave(this.wave, mode);
		this.resize();
	}

	start() {
		this.last = performance.now();
		const loop = (now: number) => {
			const dt = Math.min(0.05, (now - this.last) / 1000);
			this.last = now;
			if (!this.paused) {
				this.update(dt);
				this.draw();
			}
			this.frame = requestAnimationFrame(loop);
		};
		this.frame = requestAnimationFrame(loop);
	}

	stop() {
		cancelAnimationFrame(this.frame);
	}

	resize() {
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const rect = this.canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		this.w = rect.width;
		this.h = rect.height;
		this.canvas.width = Math.round(this.w * ratio);
		this.canvas.height = Math.round(this.h * ratio);
		this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		this.sea = art.paintSea(this.w, this.h, ratio);
	}

	/** For the end-to-end tests. */
	get state() {
		return {
			friends: this.friends,
			wave: this.wave,
			speed: this.pace.speed,
			creatures: this.mobs.filter(isOpen).map((m) => m.shape),
			kraken: this.fighting ? (this.mobs.find((m) => m.boss)?.hits ?? 0) : null,
			teaching: this.teaching()?.shape ?? null,
			hearts: this.mode === 'hard' ? this.hearts : null,
			over: this.over
		};
	}

	// Layout, from the screen size.
	private get squid() {
		const s = this.h * 0.34;
		return { x: this.w * 0.14, y: this.h * 0.52 + Math.sin(this.t * 1.5) * this.h * 0.02, s };
	}
	private get mobSize() {
		return this.h * 0.22;
	}
	private get speed() {
		return (this.w * 0.86 * this.pace.speed) / 16;
	}
	private sizeOf(mob: Mob) {
		return mob.boss ? this.mobSize * 2.4 : this.mobSize;
	}

	/** A creature whose shape the child hasn't cast yet waits, and the finger shows how. */
	private teaching(): Mob | undefined {
		const waiting = this.mobs.find(
			(m) => m.state === 'swim' && !m.targeted && !this.player.learned.includes(m.shape)
		);
		if (waiting) return waiting;
		if (this.misses >= 3)
			return this.mobs.filter((m) => isOpen(m) && !m.targeted).sort((a, b) => a.x - b.x)[0];
	}

	// Input.

	down(p: Point) {
		unlock();
		this.drawing = true;
		this.trail = [p];
	}

	move(p: Point) {
		if (!this.drawing) return;
		const last = this.trail[this.trail.length - 1];
		if (Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
		this.trail.push(p);
		if (Math.random() < 0.5) this.burst(p, 'spark', 1, '#ffe066');
	}

	up() {
		if (!this.drawing) return;
		this.drawing = false;
		const trail = this.trail;
		this.trail = [];
		if (this.over) return;
		const shape = classify(trail);
		if (!shape && !isAttempt(trail)) {
			// A tap: just bubbles.
			this.burst(trail[0], 'bubble', 6, '#bff3ff');
			sounds.pop();
			return;
		}
		this.cast(shape, trail);
	}

	private cast(shape: Shape | null, trail: Point[]) {
		const open = this.mobs.filter((m) => isOpen(m) && !m.targeted).sort((a, b) => a.x - b.x);
		let target = open.find((m) => m.shape === shape);
		// Be kind after a few misses: any real attempt counts.
		if (!target && this.misses >= 3) target = open[0];
		if (!target) {
			const mid = trail[Math.floor(trail.length / 2)];
			this.burst(mid, 'spark', 10, '#8b93b8');
			sounds.fizzle();
			if (open.length) this.miss();
			return;
		}
		target.targeted = true;
		this.spells.push({ shape: target.shape, mob: target, t: 0 });
		if (!this.player.learned.includes(target.shape)) this.player.learned.push(target.shape);
		this.misses = 0;
		if (target.shape === 'zigzag') {
			sounds.zap();
			this.flash = 1;
		} else if (target.shape === 'swirl' || target.shape === 'square') sounds.bubbles();
		else if (target.shape === 'star') sounds.twinkle();
		else sounds.shield();
	}

	private miss() {
		if (this.mode === 'hard') return;
		this.misses++;
	}

	// Update.

	private update(dt: number) {
		this.t += dt;
		this.spin = Math.max(0, this.spin - dt * 1.5);
		this.hurt = Math.max(0, this.hurt - dt);
		this.flash = Math.max(0, this.flash - dt * 4);
		const { x: sx, s } = this.squid;
		const m = this.mobSize;

		// New arrivals.
		this.spawnIn -= dt;
		const swimming = this.mobs.filter(isOpen).length;
		const teaching = this.teaching() !== undefined;
		if (
			!this.over &&
			!this.fighting &&
			this.spawnIn <= 0 &&
			swimming < this.pace.crowd &&
			!teaching
		) {
			this.mobs.push({
				shape: nextShape(this.queue, this.mode),
				x: this.w + m,
				y: this.h * (0.22 + Math.random() * 0.48),
				phase: Math.random() * 10,
				state: 'swim',
				t: 0,
				targeted: false,
				boss: false,
				hits: 0
			});
			this.spawnIn = this.pace.gap;
		}

		for (const mob of this.mobs) {
			mob.t += dt;
			const size = this.sizeOf(mob);
			if ((this.over && mob.state !== 'happy') || mob.state === 'leave') {
				// Game over, or the kraken's coming: everyone swims home.
				mob.x += this.w * 0.5 * dt;
			} else if (mob.state === 'swim') {
				const learning = !this.player.learned.includes(mob.shape) && !mob.targeted;
				const stopAt = this.w * 0.62;
				// The kraken swims in quickly, then creeps.
				const pace = !mob.boss ? 1 : mob.x > this.w * 0.75 ? 3 : 0.3;
				if (!(learning && mob.x <= stopAt)) mob.x -= this.speed * pace * dt;
				// A creature already hit by a spell can't bump.
				if (!mob.targeted && mob.x - size * 0.3 < sx + s * 0.3) {
					// Bump! The squid spins and the creature backs off.
					sounds.bump();
					this.spin = 1;
					mob.state = 'back';
					mob.t = 0;
					this.burst({ x: sx + s * 0.3, y: mob.y }, 'bubble', 8, '#bff3ff');
					if (this.mode === 'hard') this.loseHeart();
					else this.miss();
				}
			} else if (mob.state === 'back') {
				// The kraken's too big to be pushed far.
				mob.x += this.w * (mob.boss ? 0.25 : 0.7) * dt * Math.max(0, 1 - mob.t);
				if (mob.t > 1) {
					mob.state = 'swim';
					mob.t = 0;
				}
			} else {
				mob.y -= this.h * 0.35 * dt;
				mob.x += Math.sin(mob.t * 3) * 40 * dt;
				if (Math.random() < 0.15) this.burst({ x: mob.x, y: mob.y }, 'heart', 1, '#ff5fa2');
			}
		}
		this.mobs = this.mobs.filter(
			(b) => b.y > -this.sizeOf(b) * 2 && !(b.state === 'leave' && b.x > this.w + m * 2)
		);

		for (const spell of this.spells) {
			spell.t += dt;
			if (spell.t >= SPELL_TIME) this.befriend(spell.mob, spell.shape);
		}
		this.spells = this.spells.filter((sp) => sp.t < SPELL_TIME);

		for (const bit of this.bits) {
			bit.life += dt;
			bit.x += bit.vx * dt;
			bit.y += bit.vy * dt;
			if (bit.kind === 'bubble') bit.vy -= 60 * dt;
			if (bit.kind === 'confetti') bit.vy += 200 * dt;
		}
		this.bits = this.bits.filter((b) => b.life < b.max);

		// Background bubbles.
		if (Math.random() < dt * 2)
			this.bits.push({
				kind: 'bubble',
				x: Math.random() * this.w,
				y: this.h,
				vx: 0,
				vy: -40,
				life: 0,
				max: 8,
				size: 3 + Math.random() * 5,
				color: 'rgba(191,243,255,0.5)'
			});

		this.party = Math.max(0, this.party - dt);
		if (this.party && Math.random() < 0.5)
			this.burst({ x: Math.random() * this.w, y: -10 }, 'confetti', 2, '');
	}

	private befriend(mob: Mob, shape: Shape) {
		this.player.stars++;
		if (mob.boss && ++mob.hits < BOSS_HITS) {
			this.hitKraken(mob);
			this.events.save();
			return;
		}
		mob.state = 'happy';
		mob.t = 0;
		this.burst({ x: mob.x, y: mob.y }, 'heart', mob.boss ? 30 : 8, '#ff5fa2');
		this.burst(
			{ x: mob.x, y: mob.y },
			!mob.boss && art.CREATURE[shape] === 'jelly' ? 'bubble' : 'spark',
			14,
			'#ffe066'
		);
		this.flyStar(mob);
		sounds.friend();
		if (mob.boss) {
			this.fighting = false;
			this.nextWave();
		} else if (!this.fighting) {
			// A creature already hit when the kraken came still turns friendly, but the wave's done.
			this.friends++;
			if (this.friends % WAVE === 0) {
				if (isBossWave(this.wave)) this.startKraken();
				else this.nextWave();
			}
		}
		this.events.save();
	}

	private flyStar(from: Point) {
		this.bits.push({
			kind: 'star',
			x: from.x,
			y: from.y,
			vx: (40 - from.x) / 0.8,
			vy: (36 - from.y) / 0.8,
			life: 0,
			max: 0.8,
			size: 18,
			color: '#ffe066'
		});
	}

	/** The other creatures swim off and the kraken arrives with its 3 shapes. */
	private startKraken() {
		this.fighting = true;
		for (const mob of this.mobs) if (isOpen(mob) && !mob.targeted) mob.state = 'leave';
		const [first, ...rest] = bossShapes(this.mode);
		this.krakenShapes = rest;
		this.mobs.push({
			shape: first,
			x: this.w + this.mobSize * 2,
			y: this.h * 0.52,
			phase: 0,
			state: 'swim',
			t: 0,
			targeted: false,
			boss: true,
			hits: 0
		});
		sounds.kraken();
		say('The kraken!');
	}

	/** A spell lands but it isn't a friend yet: it sulks, backs off and shows its next shape. */
	private hitKraken(mob: Mob) {
		mob.shape = this.krakenShapes.shift() ?? mob.shape;
		mob.targeted = false;
		mob.state = 'back';
		mob.t = 0;
		this.burst({ x: mob.x, y: mob.y }, 'spark', 24, '#ffe066');
		this.flyStar(mob);
		sounds.bump();
		sounds.friend();
	}

	private loseHeart() {
		this.hearts--;
		this.hurt = 1;
		if (this.hearts > 0) return;
		this.over = true;
		sounds.fizzle();
		say('Oh no! Try again!');
		this.events.gameOver();
	}

	/** A wave of friends: a hat, a party, and on to the next (in hard mode, a bit harder) wave. */
	private nextWave() {
		const hat = finishWave(this.player, this.mode);
		this.wave++;
		this.pace = planWave(this.wave, this.mode);
		this.party = 2.5;
		sounds.fanfare();
		say(
			hat ? 'A new hat!' : this.mode === 'hard' && this.wave <= TOP_WAVE ? 'Faster!' : 'Well done!'
		);
		this.burst({ x: this.w / 2, y: this.h * 0.4 }, 'confetti', 80, '');
	}

	private burst(p: Point, kind: Bit['kind'], n: number, color: string) {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const v = kind === 'confetti' ? 100 + Math.random() * 300 : 30 + Math.random() * 120;
			this.bits.push({
				kind,
				x: p.x,
				y: p.y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v - (kind === 'heart' ? 60 : 0),
				life: 0,
				max: kind === 'confetti' ? 3 : 0.6 + Math.random() * 0.6,
				size: kind === 'heart' ? 10 : 3 + Math.random() * 5,
				color: color || CONFETTI[Math.floor(Math.random() * CONFETTI.length)]
			});
		}
	}

	// Drawing.

	private draw() {
		const { ctx, w, h } = this;
		if (this.sea) ctx.drawImage(this.sea, 0, 0, w, h);
		art.drawKelp(ctx, w, h, this.t);

		const m = this.mobSize;
		for (const mob of this.mobs) {
			const bob = Math.sin(this.t * 2 + mob.phase) * m * 0.06;
			ctx.save();
			ctx.translate(mob.x, mob.y + bob);
			if (mob.boss) {
				const mood = mob.state === 'happy' ? 1 : mob.state === 'back' ? -1 : 0;
				// A wobble when a spell lands.
				if (mob.state === 'back') ctx.rotate(Math.sin(mob.t * 20) * 0.08 * (1 - mob.t));
				art.drawKraken(ctx, this.sizeOf(mob), this.t, mood);
			} else
				art.drawCreature(
					ctx,
					art.CREATURE[mob.shape],
					m,
					this.t + mob.phase,
					mob.state === 'happy'
				);
			if (!mob.boss && mob.state === 'happy' && art.CREATURE[mob.shape] === 'jelly') {
				ctx.beginPath();
				ctx.arc(0, 0, m * 0.55, 0, Math.PI * 2);
				ctx.strokeStyle = 'rgba(191,243,255,0.8)';
				ctx.lineWidth = 3;
				ctx.stroke();
			}
			if (isOpen(mob)) {
				const pulse = mob === this.teaching() ? 1 + Math.sin(this.t * 6) * 0.12 : 1;
				ctx.translate(0, mob.boss ? -m * 1.45 : -m * 0.75);
				ctx.scale(pulse, pulse);
				art.drawBadge(ctx, mob.shape, m * (mob.boss ? 0.34 : 0.26), mob.targeted ? 0 : 1.2);
			}
			ctx.restore();
		}

		const squid = this.squid;
		for (const spell of this.spells) this.drawSpell(spell, squid);

		ctx.save();
		ctx.translate(squid.x, squid.y);
		if (this.spin) ctx.rotate(this.spin * Math.PI * 4);
		if (this.party) ctx.rotate(Math.sin(this.t * 6) * 0.15);
		art.drawSquid(ctx, squid.s, this.player, this.t);
		ctx.restore();

		this.drawBits();
		this.drawTrail();
		const teach = this.teaching();
		if (teach && !this.drawing) this.drawGhost(teach.shape);
		this.drawHud();

		if (this.flash) {
			ctx.fillStyle = `rgba(255,255,230,${this.flash * 0.35})`;
			ctx.fillRect(0, 0, w, h);
		}
	}

	private drawSpell(spell: Spell, squid: { x: number; y: number; s: number }) {
		const { ctx } = this;
		const tip = art.wandTip(squid.s);
		const from = { x: squid.x + tip.x, y: squid.y + tip.y };
		const to = { x: spell.mob.x, y: spell.mob.y };
		const f = spell.t / SPELL_TIME;
		const at = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
		if (spell.shape === 'zigzag') {
			ctx.save();
			ctx.strokeStyle = '#fffbd1';
			ctx.shadowColor = '#7cf0ff';
			ctx.shadowBlur = 20;
			ctx.lineWidth = 5;
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			for (let i = 1; i <= 8; i++) {
				const k = i / 8;
				const jitter = i === 8 ? 0 : (Math.random() - 0.5) * 50;
				ctx.lineTo(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + jitter);
			}
			ctx.stroke();
			ctx.restore();
		} else if (spell.shape === 'star') {
			// A shooting star with a trail of little ones.
			for (let i = 3; i >= 0; i--) {
				const k = Math.max(0, f - i * 0.08);
				ctx.save();
				ctx.translate(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
				ctx.rotate(this.t * 8);
				ctx.globalAlpha = 1 - i * 0.22;
				art.star(ctx, 22 - i * 4, '#ffe066');
				ctx.restore();
			}
		} else if (spell.shape === 'triangle') {
			// A spinning fin.
			ctx.save();
			ctx.translate(at.x, at.y);
			ctx.rotate(f * Math.PI * 4);
			art.tracePath(ctx, TRIANGLE, 40 + f * 30, '#7cf0ff', 6);
			ctx.restore();
		} else if (spell.shape === 'swirl' || spell.shape === 'square') {
			for (let i = 0; i < 6; i++) {
				const k = Math.max(0, f - i * 0.06);
				const x = from.x + (to.x - from.x) * k;
				const y = from.y + (to.y - from.y) * k + Math.sin(k * 12 + i) * 20;
				ctx.beginPath();
				ctx.arc(x, y, 8 + i * 2, 0, Math.PI * 2);
				ctx.strokeStyle = 'rgba(191,243,255,0.9)';
				ctx.lineWidth = 3;
				ctx.stroke();
			}
		} else {
			ctx.save();
			ctx.beginPath();
			ctx.arc(at.x, at.y, 20 + f * 40, 0, Math.PI * 2);
			ctx.strokeStyle = '#ffe066';
			ctx.shadowColor = '#ffe066';
			ctx.shadowBlur = 25;
			ctx.lineWidth = 7;
			ctx.stroke();
			ctx.restore();
		}
	}

	private drawBits() {
		const { ctx } = this;
		for (const b of this.bits) {
			const fade = 1 - b.life / b.max;
			ctx.save();
			ctx.globalAlpha = Math.max(0, fade);
			ctx.translate(b.x, b.y);
			if (b.kind === 'bubble') {
				ctx.beginPath();
				ctx.arc(0, 0, b.size, 0, Math.PI * 2);
				ctx.strokeStyle = b.color;
				ctx.lineWidth = 1.5;
				ctx.stroke();
			} else if (b.kind === 'heart') {
				art.heart(ctx, b.size, b.color);
			} else if (b.kind === 'star') {
				ctx.globalAlpha = 1;
				art.star(ctx, b.size, b.color);
			} else if (b.kind === 'confetti') {
				ctx.rotate(b.life * 8);
				ctx.fillStyle = b.color;
				ctx.fillRect(-4, -2, 8, 4);
			} else {
				ctx.fillStyle = b.color;
				ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
			}
			ctx.restore();
		}
	}

	private drawTrail() {
		const { ctx, trail } = this;
		if (trail.length < 2) return;
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.shadowColor = '#ffe066';
		ctx.shadowBlur = 18;
		ctx.strokeStyle = '#fff3b0';
		ctx.lineWidth = 9;
		ctx.beginPath();
		for (const p of trail) ctx.lineTo(p.x, p.y);
		ctx.stroke();
		ctx.restore();
	}

	/** A finger drawing the shape over and over, leaving a dotted line. */
	private drawGhost(shape: Shape) {
		const { ctx } = this;
		const size = this.h * 0.36;
		const cx = this.w * 0.42;
		const cy = this.h * 0.5;
		const points = guide(shape);
		const loop = 2.4;
		const f = Math.min(1, (this.t % loop) / (loop * 0.8));
		const shown = points.slice(0, Math.max(2, Math.ceil(f * points.length)));
		ctx.save();
		ctx.translate(cx, cy);
		ctx.globalAlpha = 0.35;
		ctx.setLineDash([2, 14]);
		art.tracePath(ctx, points, size, '#fff', 8);
		ctx.setLineDash([]);
		ctx.globalAlpha = 0.9;
		art.tracePath(ctx, shown, size, '#fff3b0', 10);
		const tip = shown[shown.length - 1];
		ctx.translate((tip.x - 0.5) * size, (tip.y - 0.5) * size);
		art.drawFinger(ctx, this.h * 0.12);
		ctx.restore();
	}

	private drawHud() {
		const { ctx, w } = this;
		ctx.save();
		ctx.translate(40, 36);
		ctx.shadowColor = 'rgba(0,0,0,0.4)';
		ctx.shadowBlur = 6;
		art.star(ctx, 20, '#ffe066');
		ctx.fillStyle = '#fff';
		ctx.font = `30px ${FONT}`;
		ctx.textBaseline = 'middle';
		ctx.fillText(String(this.player.stars), 30, 3);
		ctx.restore();

		if (this.mode === 'hard')
			for (let i = 0; i < HEARTS; i++) {
				const full = i < this.hearts;
				// The heart just lost shakes.
				const shake = !full && i === this.hearts && this.hurt ? Math.sin(this.t * 60) * 4 : 0;
				ctx.save();
				ctx.translate(this.w - 106 - (HEARTS - 1 - i) * 40 + shake, 38);
				ctx.globalAlpha = full ? 1 : 0.3;
				art.heart(ctx, 15, full ? '#ff4d6d' : '#fff');
				ctx.restore();
			}

		const kraken = this.fighting ? this.mobs.find((m) => m.boss) : undefined;
		if (kraken) {
			// One big dot per spell the kraken needs.
			for (let i = 0; i < BOSS_HITS; i++) {
				ctx.beginPath();
				ctx.arc(w / 2 + (i - 1) * 40, 32, 14, 0, Math.PI * 2);
				ctx.fillStyle = i < kraken.hits ? '#c77dff' : 'rgba(255,255,255,0.2)';
				ctx.fill();
			}
			return;
		}

		// One dot per creature in the wave, filled in as they become friends.
		const r = 9;
		const gap = r * 2.6;
		const left = w / 2 - ((WAVE - 1) * gap) / 2;
		const done = this.friends % WAVE;
		for (let i = 0; i < WAVE; i++) {
			ctx.beginPath();
			ctx.arc(left + i * gap, 30, r, 0, Math.PI * 2);
			ctx.fillStyle = i < done ? '#ffe066' : 'rgba(255,255,255,0.2)';
			ctx.fill();
		}
	}
}
