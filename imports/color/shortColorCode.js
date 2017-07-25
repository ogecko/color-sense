import * as d3c from 'd3-color';
import numeral from 'numeral';

function nToHex(d, padding = 2) {
	let hex = Number(d).toString(16);

	while (hex.length < padding) {
		hex = `0${hex}`;
	}
	return hex;
}

export function shortColorCode(r, g, b) {
	const c0 = d3c.hcl(d3c.rgb(r, g, b));
	const v = numeral(c0.l / 10).format('0');
	const c = numeral(c0.c / 10).format('0');
	const h = String.fromCharCode(65 + c0.h / 360 * 24);
	return '' + v + h + c;
}


export function hexColorCode(r, g, b) {
	return '#' + nToHex(r) + nToHex(g) + nToHex(b);
}



