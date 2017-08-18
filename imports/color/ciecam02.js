import * as d3c from 'd3-color';
import chromatist from 'chromatist/lib/chromatist.js';

export const CIECAM02 = chromatist.ciecam.Converter({
	adapting_luminance: 100,
	background_luminance: 20,
	whitepoint: 'D65',
	discounting: false
});

const sRGB = chromatist.rgb.Converter('sRGB');

// convert rgb [0..255] to xyz (an array with 3 entries [0..1])
CIECAM02.rgb2jch = (r, g, b) => {
	return CIECAM02.forward_model(sRGB.to_XYZ([r / 255, g / 255, b / 255]));
};

// convert j [0..100], c [0..100], h [0..360] to D3 RGB (an object with r,g,b [0.255])
CIECAM02.jch2rgb = (J, C, h) => {
	const rgb = sRGB.from_XYZ(CIECAM02.reverse_model({ J, C, h }).XYZ);
	return d3c.rgb(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);
};

// change the lightness of an rgb value by dJ (if result is out of gammut then change direction)
CIECAM02.rgbDeltaJ = (r, g, b, dJ) => {
	const jch = CIECAM02.rgb2jch(r,g,b);
	jch.J = (jch.J+dJ < 100 && jch.J+dJ > 0)? jch.J + dJ : jch.J - dJ;
	return CIECAM02.jch2rgb(jch.J, jch.C, jch.h);
};

