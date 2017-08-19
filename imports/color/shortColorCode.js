import numeral from 'numeral';
import { ciecam02 } from '/imports/color/ciecam02.js';

function nToHex(d, padding = 2) {
	let hex = Number(d).toString(16);

	while (hex.length < padding) {
		hex = `0${hex}`;
	}
	return hex;
}

export function shortColorCode(r, g, b) {
	const c0 = ciecam02.rgb2jch(r, g, b);
	const v = numeral(c0.J / 10).format('0');
	const c = numeral(c0.C / 10).format('0');
	const h = String.fromCharCode(65 + c0.h / 360 * 24);
	return '' + v + h + c;
}


export function hexColorCode(r, g, b) {
	return '#' + nToHex(r) + nToHex(g) + nToHex(b);
}

