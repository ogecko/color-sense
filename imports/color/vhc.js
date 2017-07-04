import THREE from 'three';
import { _ } from 'meteor/underscore';

const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const GAMUT = { r: 255, g: 255, b: 255, a: 0 };

// Predicate to test if a value is within a range
function isBetween(min, x, max) {
	return (x >= min && x < max);
}

export function wrapFromTo(startAngle, endAngle) {
	const delta = endAngle - startAngle;
	const toPos = endAngle;
	let fromPos = startAngle;
	if (delta > Math.PI) fromPos = fromPos + 2 * Math.PI;
	if (delta < -Math.PI) fromPos = fromPos - 2 * Math.PI;
	return { from: fromPos, to: toPos };
}

function clamp(min, x, max) {
	return (x < min) ? min : ((x > max) ? max : x);
}

// linear sRGB (closer to XYZ) to companded sRGB
function XYZ_rgb(x) {
  return 255 * (x <= 0.00304 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  // return Math.round(255 * (x <= 0.00304 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055));
}

// companded sRGB to linear sRGB (closer to XYZ)
function rgb_XYZ(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function rgb_to_vhc(r, g, b) {
	// convert companded sRGB to linear sRGB
	const rl = rgb_XYZ(r);
	const gl = rgb_XYZ(g);
	const bl = rgb_XYZ(b);
	// linear sRGB to XYZ
	const X = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl);
	const Y = (0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl);
	const Z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl);
	// XYZ to CEIxyY 1931 2' observer D65
	const t = X + Y + Z;
	const CIEx = (t === 0) ? 0.3127261 : X / t;
	const CIEy = (t === 0) ? 0.3290336 : Y / t;
	const LY = Math.log(clamp(0.00428, Y, 1));
	const CIExc = CIEx-0.3127261;
	const CIEyc = CIEy-0.3290336;

	// calculate V off a polynomial relationship to log(CIEY)
	const Y1=LY, Y2=Y1*LY, Y3=Y2*LY;
	const V = 10 + 3.9434493*Y1 + 0.6466359*Y2 + 0.0474212*Y3;

	// calculate the angle and magnitude in CIExy space from D65 white point
	const V1=V, V2=V1*V, V3=V2*V;
	const a = 27.35 + Math.atan2(CIEyc, CIExc) / (2 * Math.PI) * 360;
	const m = Math.sqrt(CIEyc * CIEyc + CIExc * CIExc);

	// calculate the adj factor to convert m to C
	let	dc = 1;
	if (isBetween(0, a, +Infinity)) {
		dc = 19.7860 + 11.9722 * V  
					 - 9.9783 * Math.sin((a - 4)/360 * 2 * Math.PI)
					 - 5.9032 * V * Math.sin((a - 4)/360 * 2 * Math.PI);
	}
	if (isBetween(-Infinity, a, 0) && V > 5) {
		dc = 120.8947 + 40.0426 * Math.sin((a + 77)/175 * 2 * Math.PI); 
	}
	if (isBetween(-Infinity, a, 0) && V <= 5) {
		dc = 21.5411 + 32.4027 * V1 - 8.8733 * V2 + 1.0197 * V3;
	}
	const C = m * dc;

	// calculate the adj factor to convert a to H
	let da = 0;
	if (isBetween(90, a, +Infinity)) {
		da = 36.110498 + 1.684948*V - 0.256468*a - 0.310822*C;
	}
	if (isBetween(0, a, 90) && V > 2) {
		da = -25.331745 - 2.069740*V + 0.528595*a + 0.569925*C;
	}
	if (isBetween(0, a, 90) && V <= 2) {
		da = 1.20687 - 9.62571*V + 0.27111*a + 1.26860*C;
	}
	if (isBetween(-90, a, -0) && V > 2) {
		da = -18.8029 - 0.3880*a;
	}
	if (isBetween(-90, a, -0) && V <= 2) {
		da = 12.4585 - 7.8984*V + 7.3567 * V * Math.sin((a + 100) / 173 * 2 * Math.PI);
	}
	if (isBetween(-Infinity, a, -90)) {
		da = 44.316046 + 1.937043*V + 0.468531*a - 0.277419*C;
	}
	const H = isBetween(0, C, 0.1) ? 0 : a + da;

	return {
		V: clamp(0, V, 10),
		H: (H < 0) ? H + 360 : H,
		C: clamp(0, C, 32),
	};
}

export function vhc_to_rgb(V, H, C) {
	if ((V >= 10) & (C === 0)) return WHITE;
	if ((V <= 0) & (C === 0)) return BLACK;

	// Any Chroma over 32 is out of Gamut and not modelled well
	if (C > 32) return GAMUT;

	// Calculate polynomials and constant
	const V1=V, V2=V1*V, V3=V2*V, V4=V3*V, V5=V4*V;
	const C1=C, C2=C1*C, C3=C2*C, C4=C3*C;
	const PI2=Math.PI*2;

	// Calculate the mean grey point based on V=Value
	const X0   =  +0             +1.132e-02*V1  -2.142e-03*V2  +2.219e-03*V3  -1.947e-04*V4  +7.788e-06*V5; 
	const Y0   =  +0             +1.191e-02*V1  -2.253e-03*V2  +2.335e-03*V3  -2.048e-04*V4  +8.194e-06*V5;
	const Z0   =  +0             +1.14554*X0;

	// Calculate the standard deviation based on V=Value
	const Xsd  =  +1.937e-03     +4.019e-03*V1  -1.124e-04*V2  +6.183e-05*V3;
	const Zsd  =  +3.477e-03     +1.149e-02*V1  -2.906e-04*V2  +1.746e-04*V3;

	// Calculate the standardised value based on C=Chroma and H=HueAngle
	const Xstd =  +0             +4.486e-02*C1  -2.027e-03*C2  +1.519e-04*C3
						 		 +3.398e-01*C1*Math.cos((H+16)/360*PI2);
	const Zstd =  +0             -0.0262650*C1  +0.0051223*C2
						  		 -0.3507343*C1*Math.sin((H+13)/360*PI2)       +0.1023213*C*Math.sin((H-31)/180*PI2);

	// Calculate the estimated XYZ values based on D65 illumination
	const X = X0 + Xstd*Xsd;
	const Z = Z0 + Zstd*Zsd;
	const Y = Y0;

	// Convert to sRGB 
	const r = XYZ_rgb( 3.24071 * X -1.53726 * Y -0.498571 * Z);
	const g = XYZ_rgb(-0.969258 * X +1.87599 * Y +0.0415557 * Z);
	const b = XYZ_rgb( 0.0556352 * X -0.203996 * Y +1.05707 * Z);

	// // Convert to sRGB (from D3 and Bruce Lindbloom)
	// r = XYZ_rgb( 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z)
	// g = XYZ_rgb(-0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z)
	// b = XYZ_rgb( 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z)


	// Clamp any values that are outside of the sRGB gamut
	((r<0)|(r>255)|(g<0)|(g>255)|(b<0)|(b>255)) ? a = 0 : a = 1;

	return { r, g, b, a };
}

function sq(x) {
	return x * x;
}

function dsp(x) {
	return parseFloat(Math.round(x * 100) / 100).toFixed(2);
}

export function dsp3(obj) {
	return _.reduce(obj, (memo, x, k) => (memo[k]=dsp(x),memo), {});
}

export function dspVHC(V, H, C) {
	const vhc = { V, H, C };
	const rgb = vhc_to_rgb(V, H, C);
	const vhc2 = rgb_to_vhc(rgb.r, rgb.g, rgb.b);
	const cost = sq(vhc.V-vhc2.V)+sq(vhc.C-vhc2.C)+sq(vhc.H-vhc2.H);
	if (cost>1000&&V>0.1&&C>0.1) console.log(dsp3(vhc), dsp3(vhc2), dsp(cost));
}

export function VHC(V, H, C) {
	const rgb = vhc_to_rgb(V, H, C);
	return (rgb.a==0) ? undefined : new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
}


function maxChromaIterate(H, V, lowC, highC) {
	const newC = (highC + lowC) / 2;
	const precision = highC - newC;
	const rgb = vhc_to_rgb(V, H, newC);
	return (precision < 0.01) ?	lowC : ((rgb.a === 0) ?
		maxChromaIterate(H, V, lowC, newC) :
		maxChromaIterate(H, V, newC, highC));
}

export const maxChroma = _.memoize(
	function maxChromaRaw(H, V, precisionV = 1) {
		return (V) ? { H, V, C: maxChromaIterate(H, V, 1, 32) } :
		_.chain(_.range(1, 10, precisionV))
			.map(i => ({ H, V: i, C: maxChromaIterate(H, i, 1, 32) }))
			.max(x => x.C)
			.value();
	},
	function maxChromaHash(H, V, precisionV) {
		return ' ' + H + V + precisionV;
	}
);



export function maxValue(H) {
	const Z = (H + 360 * 10 - 105) % 360;
	return (Z < 165) ? 9.45 - Z * 0.036364 : -1.626885 + Z * 0.030769;
}

