import { describe, expect, it } from 'vitest';
import { install } from './install.ts';

const IPAD =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const IPHONE_INSTAGRAM = `${IPHONE} Instagram 350.0.0`;
const ANDROID =
	'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const on = (userAgent: string, maxTouchPoints = 5, installed = false) =>
	install({ userAgent, maxTouchPoints, installed });

describe('install', () => {
	it('shows the Share steps on iPads (which say they are Macs), iPhones and Chrome on iOS', () => {
		expect(on(IPAD)).toBe('ios');
		expect(on(IPHONE)).toBe('ios');
		expect(on(IPHONE_CHROME)).toBe('ios');
	});

	it('sends app browsers to Safari first', () => {
		expect(on(IPHONE_INSTAGRAM)).toBe('ios-app');
	});

	it('uses the menu steps on Android', () => {
		expect(on(ANDROID)).toBe('android');
	});

	it('shows nothing once installed, or on a computer', () => {
		expect(on(IPAD, 5, true)).toBe('none');
		expect(on(IPAD, 0)).toBe('none');
		expect(on(WINDOWS, 0)).toBe('none');
	});
});
