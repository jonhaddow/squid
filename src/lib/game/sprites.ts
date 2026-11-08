// Everything is drawn with canvas paths: no images to load, crisp at any size.
// Each sprite is drawn centred on (0, 0) at a size `s`; callers translate.
import { guide, type Shape } from './gestures.ts';
import type { Face, Hat, Look, Neck } from './progress.ts';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** Mixes a #rrggbb colour with white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
	const n = parseInt(hex.slice(1), 16);
	const mix = (c: number) =>
		Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
			.toString(16)
			.padStart(2, '0');
	return `#${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.fillStyle = fill;
	ctx.fill();
}

/** Big friendly eyes: `mood` 1 is happy, 0 grumpy (slanted brows), -1 sulky (droopy lids). */
function eyes(ctx: Ctx, s: number, gap: number, y: number, r: number, mood: number, look = 0.3) {
	for (const side of [-1, 1]) {
		const x = side * gap;
		circle(ctx, x, y, r, '#fff');
		circle(ctx, x + r * look, y + r * 0.1, r * 0.55, '#1a1033');
		circle(ctx, x + r * look + r * 0.2, y - r * 0.2, r * 0.18, '#fff');
		ctx.strokeStyle = '#1a1033';
		ctx.lineWidth = s * 0.035;
		ctx.lineCap = 'round';
		if (mood === 0) {
			ctx.beginPath();
			ctx.moveTo(x - side * r * 1.1, y - r * 1.5);
			ctx.lineTo(x + side * r * 0.9, y - r * 0.9);
			ctx.stroke();
		} else if (mood === -1) {
			ctx.beginPath();
			ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95);
			ctx.closePath();
			ctx.fillStyle = '#1a1033';
			ctx.globalAlpha *= 0.55;
			ctx.fill();
			ctx.globalAlpha /= 0.55;
		}
	}
}

function mouth(ctx: Ctx, s: number, y: number, happy: boolean) {
	ctx.beginPath();
	if (happy) ctx.arc(0, y - s * 0.04, s * 0.08, 0.15 * Math.PI, 0.85 * Math.PI);
	else ctx.arc(0, y + s * 0.06, s * 0.06, 1.2 * Math.PI, 1.8 * Math.PI);
	ctx.strokeStyle = '#1a1033';
	ctx.lineWidth = s * 0.035;
	ctx.stroke();
}

function cheeks(ctx: Ctx, gap: number, y: number, r: number) {
	ctx.globalAlpha *= 0.5;
	circle(ctx, -gap, y, r, '#ff6b9a');
	circle(ctx, gap, y, r, '#ff6b9a');
	ctx.globalAlpha /= 0.5;
}

/** A squid at time t (seconds), which sets its wiggle and blinks. */
export function drawSquid(ctx: Ctx, s: number, look: Look, t: number) {
	const { color, hat, neck, face } = look;
	const dark = shade(color, -0.35);
	// Tentacles, waving.
	ctx.lineCap = 'round';
	for (let i = 0; i < 6; i++) {
		const x0 = (i - 2.5) * s * 0.09;
		ctx.beginPath();
		ctx.moveTo(x0, s * 0.05);
		for (let k = 1; k <= 6; k++) {
			const f = k / 6;
			const wave = Math.sin(t * 4 + i * 1.3 + f * 3) * s * 0.06 * f;
			ctx.lineTo(x0 * (1 + f * 0.6) + wave, s * 0.05 + f * s * 0.55);
		}
		ctx.strokeStyle = i % 2 ? color : shade(color, -0.12);
		ctx.lineWidth = s * 0.075 * 1;
		ctx.stroke();
	}
	// Fins.
	ctx.fillStyle = dark;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(side * s * 0.12, -s * 0.62);
		ctx.lineTo(side * s * 0.38, -s * 0.46 + Math.sin(t * 5) * s * 0.03);
		ctx.lineTo(side * s * 0.22, -s * 0.3);
		ctx.fill();
	}
	// Mantle: a rounded bullet shape.
	ctx.beginPath();
	ctx.moveTo(0, -s * 0.8);
	ctx.bezierCurveTo(s * 0.3, -s * 0.7, s * 0.36, -s * 0.1, s * 0.3, s * 0.12);
	ctx.quadraticCurveTo(0, s * 0.24, -s * 0.3, s * 0.12);
	ctx.bezierCurveTo(-s * 0.36, -s * 0.1, -s * 0.3, -s * 0.7, 0, -s * 0.8);
	const body = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
	body.addColorStop(0, shade(color, -0.15));
	body.addColorStop(0.5, shade(color, 0.12));
	body.addColorStop(1, shade(color, -0.1));
	ctx.fillStyle = body;
	ctx.fill();
	// Spots.
	ctx.globalAlpha *= 0.35;
	for (const [x, y, r] of [
		[-0.1, -0.5, 0.05],
		[0.12, -0.42, 0.04],
		[-0.02, -0.32, 0.03]
	])
		circle(ctx, x * s, y * s, r * s, '#fff');
	ctx.globalAlpha /= 0.35;

	const blink = Math.sin(t * 1.3) > 0.985;
	if (blink) {
		ctx.strokeStyle = '#1a1033';
		ctx.lineWidth = s * 0.035;
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.moveTo(side * s * 0.13 - s * 0.08, -s * 0.06);
			ctx.lineTo(side * s * 0.13 + s * 0.08, -s * 0.06);
			ctx.stroke();
		}
	} else eyes(ctx, s, s * 0.13, -s * 0.06, s * 0.1, 1);
	cheeks(ctx, s * 0.21, s * 0.06, s * 0.04);
	mouth(ctx, s, s * 0.08, true);
	if (face) drawFace(ctx, s, face);
	if (neck) drawNeck(ctx, s, neck);

	// The wand.
	const tip = wandTip(s);
	ctx.strokeStyle = '#6b3f1d';
	ctx.lineWidth = s * 0.04;
	ctx.beginPath();
	ctx.moveTo(s * 0.32, s * 0.22);
	ctx.lineTo(tip.x, tip.y);
	ctx.stroke();
	ctx.strokeStyle = color;
	ctx.lineWidth = s * 0.07;
	ctx.beginPath();
	ctx.moveTo(s * 0.2, s * 0.1);
	ctx.quadraticCurveTo(s * 0.32, s * 0.32, s * 0.4, s * 0.15);
	ctx.stroke();
	ctx.save();
	ctx.translate(tip.x, tip.y);
	ctx.rotate(t * 2);
	ctx.shadowColor = '#ffe066';
	ctx.shadowBlur = s * 0.15;
	star(ctx, s * 0.08, '#ffe066');
	ctx.restore();
	if (hat) {
		ctx.save();
		ctx.translate(0, -s * 0.74);
		drawHat(ctx, s, hat);
		ctx.restore();
	}
}

/** Where the squid's wand tip is, relative to the squid at size s. */
export const wandTip = (s: number) => ({ x: s * 0.62, y: -s * 0.12 });

export function star(ctx: Ctx, r: number, fill: string) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rr = i % 2 ? r * 0.45 : r;
		ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
	}
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
}

export function heart(ctx: Ctx, r: number, fill: string) {
	ctx.beginPath();
	ctx.moveTo(0, r * 0.9);
	ctx.bezierCurveTo(-r * 1.6, -r * 0.1, -r * 0.6, -r * 1.2, 0, -r * 0.4);
	ctx.bezierCurveTo(r * 0.6, -r * 1.2, r * 1.6, -r * 0.1, 0, r * 0.9);
	ctx.fillStyle = fill;
	ctx.fill();
}

export function drawHat(ctx: Ctx, s: number, hat: Hat) {
	ctx.lineJoin = 'round';
	if (hat === 'wizard') {
		ctx.beginPath();
		ctx.moveTo(-s * 0.2, 0);
		ctx.quadraticCurveTo(-s * 0.02, -s * 0.3, s * 0.12, -s * 0.5);
		ctx.quadraticCurveTo(s * 0.08, -s * 0.2, s * 0.2, 0);
		ctx.fillStyle = '#3346c4';
		ctx.fill();
		ctx.save();
		ctx.translate(-s * 0.02, -s * 0.16);
		star(ctx, s * 0.05, '#ffe066');
		ctx.restore();
		ctx.beginPath();
		ctx.ellipse(0, 0, s * 0.3, s * 0.06, 0, 0, TAU);
		ctx.fillStyle = '#2a379c';
		ctx.fill();
	} else if (hat === 'crown') {
		ctx.beginPath();
		ctx.moveTo(-s * 0.18, s * 0.02);
		for (const [x, y] of [
			[-0.2, -0.2],
			[-0.1, -0.08],
			[0, -0.24],
			[0.1, -0.08],
			[0.2, -0.2],
			[0.18, 0.02]
		])
			ctx.lineTo(x * s, y * s);
		ctx.closePath();
		ctx.fillStyle = '#ffc93c';
		ctx.fill();
		circle(ctx, 0, -s * 0.06, s * 0.03, '#ff4d6d');
	} else if (hat === 'pirate') {
		ctx.beginPath();
		ctx.moveTo(-s * 0.32, 0);
		ctx.quadraticCurveTo(0, -s * 0.4, s * 0.32, 0);
		ctx.quadraticCurveTo(0, -s * 0.08, -s * 0.32, 0);
		ctx.fillStyle = '#1d1d26';
		ctx.fill();
		circle(ctx, 0, -s * 0.13, s * 0.04, '#fff');
	} else if (hat === 'party') {
		ctx.beginPath();
		ctx.moveTo(-s * 0.15, 0);
		ctx.lineTo(0, -s * 0.38);
		ctx.lineTo(s * 0.15, 0);
		ctx.closePath();
		ctx.fillStyle = '#ff5fa2';
		ctx.fill();
		ctx.save();
		ctx.clip();
		ctx.strokeStyle = '#ffe066';
		ctx.lineWidth = s * 0.04;
		for (let i = 0; i < 4; i++) {
			ctx.beginPath();
			ctx.moveTo(-s * 0.2, -i * s * 0.1);
			ctx.lineTo(s * 0.2, -i * s * 0.1 - s * 0.08);
			ctx.stroke();
		}
		ctx.restore();
		circle(ctx, 0, -s * 0.39, s * 0.05, '#7cf0ff');
	} else if (hat === 'top') {
		ctx.fillStyle = '#1d1d26';
		ctx.fillRect(-s * 0.14, -s * 0.32, s * 0.28, s * 0.32);
		ctx.fillRect(-s * 0.24, -s * 0.03, s * 0.48, s * 0.05);
		ctx.fillStyle = '#e63946';
		ctx.fillRect(-s * 0.14, -s * 0.1, s * 0.28, s * 0.05);
	} else {
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * TAU;
			circle(ctx, Math.cos(a) * s * 0.07, -s * 0.06 + Math.sin(a) * s * 0.07, s * 0.06, '#ffd1e8');
		}
		circle(ctx, 0, -s * 0.06, s * 0.05, '#ffc93c');
	}
}

/** A point on the curve along the bottom of the squid's mantle, u from 0 to 1. */
function collar(s: number, u: number) {
	const v = 1 - u;
	return { x: (u - v) * s * 0.27, y: (v * v + u * u) * s * 0.1 + 2 * u * v * s * 0.26 };
}

function collarPath(ctx: Ctx, s: number) {
	ctx.beginPath();
	ctx.moveTo(-s * 0.27, s * 0.1);
	ctx.quadraticCurveTo(0, s * 0.26, s * 0.27, s * 0.1);
}

/** Round the bottom of the squid's mantle, drawn on a squid centred at (0, 0). */
export function drawNeck(ctx: Ctx, s: number, neck: Neck) {
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	if (neck === 'pearls') {
		for (let i = 0; i <= 8; i++) {
			const { x, y } = collar(s, i / 8);
			circle(ctx, x, y, s * 0.032, '#fff4f8');
			circle(ctx, x - s * 0.01, y - s * 0.01, s * 0.01, '#fff');
		}
	} else if (neck === 'bowtie') {
		ctx.fillStyle = '#e63946';
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.moveTo(0, s * 0.18);
			ctx.lineTo(side * s * 0.13, s * 0.11);
			ctx.lineTo(side * s * 0.13, s * 0.25);
			ctx.closePath();
			ctx.fill();
		}
		circle(ctx, 0, s * 0.18, s * 0.035, '#b5202d');
	} else if (neck === 'scarf') {
		collarPath(ctx, s);
		ctx.strokeStyle = '#2ed8a3';
		ctx.lineWidth = s * 0.08;
		ctx.stroke();
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = s * 0.02;
		ctx.setLineDash([s * 0.04, s * 0.06]);
		ctx.stroke();
		ctx.setLineDash([]);
		// The end hanging down, over the tentacles.
		ctx.beginPath();
		ctx.moveTo(-s * 0.16, s * 0.15);
		ctx.lineTo(-s * 0.22, s * 0.42);
		ctx.lineTo(-s * 0.12, s * 0.42);
		ctx.lineTo(-s * 0.08, s * 0.17);
		ctx.closePath();
		ctx.fillStyle = '#2ed8a3';
		ctx.fill();
		ctx.fillStyle = '#fff';
		ctx.fillRect(-s * 0.21, s * 0.33, s * 0.095, s * 0.025);
	} else {
		ctx.strokeStyle = '#3d8bff';
		ctx.lineWidth = s * 0.04;
		ctx.beginPath();
		ctx.moveTo(-s * 0.2, s * 0.13);
		ctx.lineTo(0, s * 0.24);
		ctx.lineTo(s * 0.2, s * 0.13);
		ctx.stroke();
		circle(ctx, 0, s * 0.28, s * 0.07, '#ffc93c');
		ctx.save();
		ctx.translate(0, s * 0.28);
		star(ctx, s * 0.045, '#c98a00');
		ctx.restore();
	}
}

/** Over the squid's eyes, on a squid centred at (0, 0). */
export function drawFace(ctx: Ctx, s: number, face: Face) {
	const gap = s * 0.13;
	const y = -s * 0.06;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.strokeStyle = '#1a1033';
	ctx.lineWidth = s * 0.03;
	if (face === 'monocle') {
		ctx.beginPath();
		ctx.arc(gap, y, s * 0.13, 0, TAU);
		ctx.strokeStyle = '#ffc93c';
		ctx.stroke();
		ctx.lineWidth = s * 0.012;
		ctx.beginPath();
		ctx.moveTo(gap + s * 0.09, y + s * 0.09);
		ctx.quadraticCurveTo(s * 0.26, s * 0.12, s * 0.2, s * 0.2);
		ctx.stroke();
		return;
	}
	// The bridge and the arms.
	ctx.beginPath();
	ctx.moveTo(-gap + s * 0.12, y - s * 0.01);
	ctx.quadraticCurveTo(0, y - s * 0.05, gap - s * 0.12, y - s * 0.01);
	ctx.moveTo(-gap - s * 0.12, y - s * 0.02);
	ctx.lineTo(-s * 0.3, y - s * 0.05);
	ctx.moveTo(gap + s * 0.12, y - s * 0.02);
	ctx.lineTo(s * 0.3, y - s * 0.05);
	if (face === 'hearts') ctx.strokeStyle = '#ff5fa2';
	ctx.stroke();
	for (const side of [-1, 1]) {
		const x = side * gap;
		if (face === 'glasses') {
			ctx.beginPath();
			ctx.arc(x, y, s * 0.12, 0, TAU);
			ctx.globalAlpha *= 0.2;
			ctx.fillStyle = '#bff3ff';
			ctx.fill();
			ctx.globalAlpha /= 0.2;
			ctx.stroke();
		} else if (face === 'shades') {
			ctx.beginPath();
			ctx.ellipse(x, y, s * 0.13, s * 0.1, 0, 0, TAU);
			ctx.fillStyle = '#1a1033';
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(x - s * 0.07, y - s * 0.03);
			ctx.lineTo(x - s * 0.02, y - s * 0.06);
			ctx.strokeStyle = 'rgba(255,255,255,0.6)';
			ctx.stroke();
			ctx.strokeStyle = '#1a1033';
		} else {
			ctx.save();
			ctx.translate(x, y);
			ctx.globalAlpha *= 0.75;
			heart(ctx, s * 0.12, '#ff5fa2');
			ctx.restore();
		}
	}
}

export type Thing =
	{ kind: 'hat'; item: Hat } | { kind: 'neck'; item: Neck } | { kind: 'face'; item: Face };

/** One dress-up item on its own, roughly centred on (0, 0): for the buttons. */
export function drawThing(ctx: Ctx, s: number, thing: Thing) {
	ctx.save();
	if (thing.kind === 'hat') {
		ctx.translate(0, s * 0.22);
		drawHat(ctx, s, thing.item);
	} else if (thing.kind === 'neck') {
		ctx.translate(0, thing.item === 'scarf' ? -s * 0.26 : -s * 0.2);
		drawNeck(ctx, s, thing.item);
	} else {
		ctx.translate(0, s * 0.06);
		drawFace(ctx, s, thing.item);
	}
	ctx.restore();
}

export type Creature = 'crab' | 'jelly' | 'puffer';
export const CREATURE: Record<Shape, Creature> = {
	zigzag: 'crab',
	swirl: 'jelly',
	square: 'jelly',
	circle: 'puffer'
};

export function drawCreature(ctx: Ctx, kind: Creature, s: number, t: number, happy: boolean) {
	if (kind === 'crab') drawCrab(ctx, s, t, happy);
	else if (kind === 'jelly') drawJelly(ctx, s, t, happy);
	else drawPuffer(ctx, s, t, happy);
}

function drawCrab(ctx: Ctx, s: number, t: number, happy: boolean) {
	const red = '#ff5a3c';
	const dark = '#c53a22';
	ctx.strokeStyle = dark;
	ctx.lineWidth = s * 0.05;
	ctx.lineCap = 'round';
	// Legs, scuttling.
	for (const side of [-1, 1])
		for (let i = 0; i < 3; i++) {
			const step = Math.sin(t * 10 + i) * s * 0.04;
			ctx.beginPath();
			ctx.moveTo(side * s * 0.2, s * 0.08 + i * s * 0.05);
			ctx.lineTo(side * s * 0.42, s * 0.2 + i * s * 0.06 + step);
			ctx.stroke();
		}
	// Claws up, snapping.
	for (const side of [-1, 1]) {
		const snap = happy ? 0.2 : Math.abs(Math.sin(t * 6)) * 0.5;
		ctx.beginPath();
		ctx.moveTo(side * s * 0.25, -s * 0.02);
		ctx.lineTo(side * s * 0.38, -s * 0.22);
		ctx.stroke();
		ctx.save();
		ctx.translate(side * s * 0.4, -s * 0.3);
		ctx.beginPath();
		ctx.arc(
			0,
			0,
			s * 0.12,
			side > 0 ? -Math.PI / 2 + snap : Math.PI / 2 + snap,
			side > 0 ? Math.PI * 1.1 : Math.PI * 2.1
		);
		ctx.lineTo(0, 0);
		ctx.fillStyle = red;
		ctx.fill();
		ctx.restore();
	}
	ctx.beginPath();
	ctx.ellipse(0, s * 0.08, s * 0.3, s * 0.2, 0, 0, TAU);
	ctx.fillStyle = red;
	ctx.fill();
	// Eyes on stalks.
	ctx.strokeStyle = dark;
	for (const side of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo(side * s * 0.09, -s * 0.05);
		ctx.lineTo(side * s * 0.11, -s * 0.16);
		ctx.stroke();
	}
	ctx.save();
	ctx.translate(0, -s * 0.18);
	eyes(ctx, s, s * 0.11, 0, s * 0.075, happy ? 1 : 0, -0.4);
	ctx.restore();
	if (happy) cheeks(ctx, s * 0.18, s * 0.08, s * 0.04);
	mouth(ctx, s, s * 0.1, happy);
}

function drawJelly(ctx: Ctx, s: number, t: number, happy: boolean) {
	const pulse = 1 + Math.sin(t * 3) * 0.06;
	ctx.lineCap = 'round';
	ctx.strokeStyle = 'rgba(255,170,230,0.75)';
	ctx.lineWidth = s * 0.04;
	for (let i = 0; i < 5; i++) {
		const x0 = (i - 2) * s * 0.09;
		ctx.beginPath();
		ctx.moveTo(x0, s * 0.05);
		for (let k = 1; k <= 8; k++) {
			const f = k / 8;
			ctx.lineTo(x0 + Math.sin(t * 3 + i + f * 5) * s * 0.06, s * 0.05 + f * s * 0.5);
		}
		ctx.stroke();
	}
	ctx.save();
	ctx.scale(pulse, 2 - pulse);
	ctx.beginPath();
	ctx.moveTo(-s * 0.32, s * 0.06);
	ctx.bezierCurveTo(-s * 0.36, -s * 0.48, s * 0.36, -s * 0.48, s * 0.32, s * 0.06);
	for (let i = 4; i >= 0; i--) {
		const x = -s * 0.32 + (i / 4) * s * 0.64;
		ctx.quadraticCurveTo(x + s * 0.08, s * 0.14, x, s * 0.06);
	}
	const bell = ctx.createRadialGradient(0, -s * 0.15, s * 0.02, 0, -s * 0.1, s * 0.4);
	bell.addColorStop(0, 'rgba(255,220,245,0.95)');
	bell.addColorStop(1, 'rgba(240,110,200,0.85)');
	ctx.fillStyle = bell;
	ctx.fill();
	ctx.restore();
	eyes(ctx, s, s * 0.11, -s * 0.1, s * 0.075, happy ? 1 : -1, -0.4);
	if (happy) cheeks(ctx, s * 0.2, -s * 0.0, s * 0.04);
	mouth(ctx, s, -s * 0.01, happy);
}

function drawPuffer(ctx: Ctx, s: number, t: number, happy: boolean) {
	const r = s * 0.3 * (1 + Math.sin(t * 4) * 0.04);
	ctx.fillStyle = '#e8a91c';
	for (let i = 0; i < 14; i++) {
		const a = (i / 14) * TAU;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a - 0.15) * r, Math.sin(a - 0.15) * r);
		ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
		ctx.lineTo(Math.cos(a + 0.15) * r, Math.sin(a + 0.15) * r);
		ctx.fill();
	}
	// Tail fin on the right: it swims left.
	ctx.beginPath();
	ctx.moveTo(r * 0.9, 0);
	ctx.lineTo(r * 1.5, -r * 0.4 + Math.sin(t * 8) * r * 0.1);
	ctx.lineTo(r * 1.5, r * 0.4 + Math.sin(t * 8) * r * 0.1);
	ctx.fill();
	const body = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
	body.addColorStop(0, '#fff2a8');
	body.addColorStop(1, '#ffc93c');
	circle(ctx, 0, 0, r, '#ffc93c');
	ctx.fillStyle = body;
	ctx.fill();
	eyes(ctx, s, s * 0.11, -s * 0.05, s * 0.075, happy ? 1 : 0, -0.4);
	if (happy) cheeks(ctx, s * 0.19, s * 0.06, s * 0.04);
	mouth(ctx, s, s * 0.1, happy);
}

/** The shape a creature needs, drawn in a bubble above it. */
export function drawBadge(ctx: Ctx, shape: Shape, r: number, glow: number) {
	ctx.beginPath();
	ctx.arc(0, 0, r, 0, TAU);
	ctx.fillStyle = 'rgba(255,255,255,0.9)';
	ctx.shadowColor = '#ffe066';
	ctx.shadowBlur = r * glow;
	ctx.fill();
	ctx.shadowBlur = 0;
	ctx.lineWidth = r * 0.12;
	ctx.strokeStyle = '#ffc93c';
	ctx.stroke();
	tracePath(ctx, guide(shape), r * 1.2, '#7a3cff', r * 0.16);
}

/** Draws unit-box points centred on (0, 0) at the given size. */
export function tracePath(
	ctx: Ctx,
	points: { x: number; y: number }[],
	size: number,
	color: string,
	width: number
) {
	ctx.beginPath();
	for (const p of points) ctx.lineTo((p.x - 0.5) * size, (p.y - 0.5) * size);
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();
}

/** A pointing finger, for showing how to draw a shape. */
export function drawFinger(ctx: Ctx, s: number) {
	ctx.save();
	ctx.rotate(-0.4);
	ctx.fillStyle = '#ffe0c7';
	ctx.strokeStyle = '#1a1033';
	ctx.lineWidth = s * 0.06;
	ctx.beginPath();
	ctx.roundRect(-s * 0.12, 0, s * 0.24, s * 0.7, s * 0.12);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(-s * 0.3, s * 0.4, s * 0.6, s * 0.6, s * 0.2);
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

/** The sea floor and back rocks, drawn once per screen size into its own canvas. */
export function paintSea(width: number, height: number, ratio: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = width * ratio;
	canvas.height = height * ratio;
	const ctx = canvas.getContext('2d')!;
	ctx.scale(ratio, ratio);
	const water = ctx.createLinearGradient(0, 0, 0, height);
	water.addColorStop(0, '#1466a8');
	water.addColorStop(0.55, '#0b3570');
	water.addColorStop(1, '#071a3d');
	ctx.fillStyle = water;
	ctx.fillRect(0, 0, width, height);

	// Sunbeams from the surface.
	ctx.globalAlpha = 0.07;
	ctx.fillStyle = '#bff3ff';
	for (let i = 0; i < 6; i++) {
		const x = width * (0.1 + i * 0.17);
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x + width * 0.06, 0);
		ctx.lineTo(x - width * 0.05, height);
		ctx.lineTo(x - width * 0.14, height);
		ctx.fill();
	}
	ctx.globalAlpha = 1;

	// A blocky sea floor: columns of square blocks.
	let seed = 7;
	const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	const block = Math.max(18, Math.round(height / 16));
	const sand = ['#e3c27a', '#d6b26a', '#ecd08e', '#c9a35c'];
	const stone = ['#6b7a8f', '#5d6b7f', '#7b8aa0'];
	let h = 2;
	for (let x = 0; x < width; x += block) {
		h = Math.max(1, Math.min(4, h + Math.round(rand() * 2 - 1)));
		for (let j = 0; j < h; j++) {
			const y = height - (j + 1) * block;
			const pal = j === h - 1 && rand() > 0.6 ? stone : sand;
			ctx.fillStyle = pal[Math.floor(rand() * pal.length)];
			ctx.fillRect(x, y, block, block);
			ctx.fillStyle = 'rgba(0,0,0,0.08)';
			ctx.fillRect(x + block * 0.5, y + block * 0.5, block * 0.25, block * 0.25);
			ctx.fillStyle = 'rgba(255,255,255,0.12)';
			ctx.fillRect(x, y, block, block * 0.12);
		}
	}
	return canvas;
}

/** Blocky kelp, swaying, in front of the sea floor. */
export function drawKelp(ctx: Ctx, width: number, height: number, t: number) {
	const block = Math.max(14, Math.round(height / 22));
	for (const [fx, tall] of [
		[0.05, 7],
		[0.32, 5],
		[0.58, 8],
		[0.83, 6],
		[0.95, 4]
	]) {
		for (let j = 0; j < tall; j++) {
			const sway = Math.round(Math.sin(t * 1.2 + fx * 9 + j * 0.4) * j * 0.25) * (block / 2);
			ctx.fillStyle = j % 2 ? '#2fa36b' : '#3bbf7d';
			ctx.fillRect(width * fx + sway, height - block * 2 - j * block, block, block);
		}
	}
}
