// Which "add to home screen" help to show, from the browser. Pure, so it's
// unit tested. Safari has no install button a page can press, so iPads and
// iPhones get pictures of the steps; Chrome on Android lets the page offer its
// own install button (`beforeinstallprompt`).

export type Install =
	/** Already on the home screen, or a computer: show nothing. */
	| 'none'
	/** Safari, or Chrome/Firefox/Edge on iOS: Share, then Add to Home Screen. */
	| 'ios'
	/** An app's built-in browser (Facebook, Instagram...): open in Safari first. */
	| 'ios-app'
	/** Android without an install prompt (Firefox, Samsung...): the browser's menu. */
	| 'android';

export type Browser = {
	userAgent: string;
	/** iPads say they're Macs, but Macs have no touch screen. */
	maxTouchPoints: number;
	/** Opened from the home screen. */
	installed: boolean;
};

const IN_APP = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|LinkedInApp|GSA\//;

export function install({ userAgent, maxTouchPoints, installed }: Browser): Install {
	if (installed) return 'none';
	const ios =
		/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
	if (ios) return IN_APP.test(userAgent) ? 'ios-app' : 'ios';
	if (/Android/.test(userAgent)) return 'android';
	return 'none';
}

/** Show the steps by themselves only once, the first time; after that they wait behind the button. */
export const SEEN_KEY = 'squid-install-seen';
