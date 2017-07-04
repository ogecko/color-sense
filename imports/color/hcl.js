import { _ } from 'meteor/underscore';
import * as d3c from "d3-color";

export function isRGBok(rgb) {
	return !(rgb.r<0 || rgb.r>=256 || rgb.g<0 || rgb.g>=256 ||rgb.b<0 || rgb.b>=256)
}

function maxChromaIterate(h, v, lowC, highC) {
	const newC = (highC + lowC) / 2;
	const precision = highC - newC;
	const rgb = d3c.rgb(d3c.hcl(h, newC, v));
	return (precision < 0.01) ?	lowC : (isRGBok(rgb) ?
		maxChromaIterate(h, v, newC, highC) :
		maxChromaIterate(h, v, lowC, newC));
}

export const maxChromaHcl = _.memoize(
	function maxChromaRaw(h, v, precisionV = 1) {
		return (v) ? { h, l: v, c: maxChromaIterate(h, v, 1, 100) } :
		_.chain(_.range(1, 100, precisionV))
			.map(i => ({ h, l: i, c: maxChromaIterate(h, i, 1, 100) }))
			.max(x => x.c)
			.value();
	},
	function maxChromaHash(H, V, precisionV) {
		return ' ' + H + V + precisionV;
	}
);

export function lerpValue(t, start, end) {
	return start * (1 - t) + end * t;
}

export function lerpObject(t, start, end) {
	return _.reduce(
			_.keys(start),
			(memo, key) => (memo[key] = lerpValue(t, start[key], end[key]), memo),
			{}
	);
}
