import numeral from 'numeral';
import { ciecam02 } from '/imports/color/ciecam02.js';
import { srgb_to_xyz, xyz_to_JuMuHu, JuMuHu_to_label } from 'color-cam16/dist/index.js';

function nToHex(d, padding = 2) {
	let hex = Number(d).toString(16);

	while (hex.length < padding) {
		hex = `0${hex}`;
	}
	return hex;
}

export function shortColorCode(r, g, b) {
	const xyz = srgb_to_xyz([r/255,g/255,b/255]);
	const JuMuHu = xyz_to_JuMuHu(xyz);
	const label = JuMuHu_to_label(JuMuHu);
	return label

	const c0 = ciecam02.rgb2jch(r, g, b);
	const v = numeral(c0.J / 10).format('0');
	const c = numeral(c0.C / 10).format('0');
	const h = String.fromCharCode(65 + c0.h / 360 * 24);
	return '' + v + h + c;
}


export function hexColorCode(r, g, b) {
	return '#' + nToHex(r) + nToHex(g) + nToHex(b);
}

