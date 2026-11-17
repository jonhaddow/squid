// Every sound is made on the fly with Web Audio: no files to download, and it
// all works offline. Browsers only allow sound after a tap, so unlock() runs
// on the first one.

let ctx: AudioContext | null = null;

export function unlock() {
	ctx ??= new AudioContext();
	if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
	freq: number,
	{
		at = 0,
		length = 0.15,
		type = 'sine' as OscillatorType,
		volume = 0.2,
		slide = 0
	}: { at?: number; length?: number; type?: OscillatorType; volume?: number; slide?: number } = {}
) {
	if (!ctx) return;
	const start = ctx.currentTime + at;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);
	if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), start + length);
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
	osc.connect(gain).connect(ctx.destination);
	osc.start(start);
	osc.stop(start + length + 0.05);
}

function noise(length: number, volume = 0.15) {
	if (!ctx) return;
	const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	gain.gain.value = volume;
	source.buffer = buffer;
	source.connect(gain).connect(ctx.destination);
	source.start();
}

export const sounds = {
	pop: () => tone(500 + Math.random() * 400, { length: 0.08, slide: 300, volume: 0.12 }),
	zap() {
		noise(0.25, 0.2);
		tone(900, { type: 'sawtooth', length: 0.25, slide: -700, volume: 0.1 });
	},
	bubbles() {
		for (let i = 0; i < 6; i++)
			tone(300 + Math.random() * 500, { at: i * 0.05, length: 0.08, slide: 400, volume: 0.15 });
	},
	shield() {
		for (const [i, f] of [523, 659, 784].entries())
			tone(f, { at: i * 0.04, length: 0.5, type: 'triangle', volume: 0.12 });
	},
	twinkle() {
		for (const [i, f] of [1047, 1319, 1568, 2093].entries())
			tone(f, { at: i * 0.05, length: 0.25, type: 'sine', volume: 0.1 });
	},
	rainbow() {
		for (const [i, f] of [392, 523, 659, 784, 1047].entries())
			tone(f, { at: i * 0.06, length: 0.3, type: 'sine', slide: 40, volume: 0.1 });
	},
	/** The kraken arriving: a low, wobbly rumble, more silly than scary. */
	kraken() {
		for (const [i, f] of [110, 98, 123].entries())
			tone(f, { at: i * 0.25, length: 0.35, type: 'triangle', slide: -20, volume: 0.3 });
	},
	fizzle: () => tone(400, { length: 0.35, slide: -300, type: 'square', volume: 0.06 }),
	bump: () => tone(140, { length: 0.3, slide: -60, type: 'triangle', volume: 0.3 }),
	friend() {
		for (const [i, f] of [660, 880, 1320].entries())
			tone(f, { at: i * 0.07, length: 0.15, type: 'triangle', volume: 0.14 });
	},
	fanfare() {
		const tune = [523, 659, 784, 1047, 784, 1047];
		for (const [i, f] of tune.entries())
			tone(f, {
				at: i * 0.14,
				length: i === tune.length - 1 ? 0.7 : 0.16,
				type: 'square',
				volume: 0.08
			});
	}
};

/** Reads words out, for kids who can't read yet. */
export function say(text: string) {
	if (!('speechSynthesis' in window)) return;
	speechSynthesis.cancel();
	const words = new SpeechSynthesisUtterance(text);
	words.pitch = 1.4;
	words.rate = 0.95;
	speechSynthesis.speak(words);
}
