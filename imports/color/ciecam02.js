import * as d3c from 'd3-color';
import chromatist from 'chromatist/lib/chromatist.js';

export const ciecam02 = chromatist.ciecam.Converter({
	adapting_luminance: 100,
	background_luminance: 20,
	whitepoint: 'D65',
	surround: 1.0,
	discounting: false,
});

const sRGB = chromatist.rgb.Converter('sRGB');

// convert rgb [0..255] to xyz (an array with 3 entries [0..1])
ciecam02.rgb2jch = (r, g, b) => {
	return ciecam02.forward_model(sRGB.to_XYZ([r / 255, g / 255, b / 255]));
};

// convert j [0..100], c [0..100], h [0..360] to D3 RGB (an object with r,g,b [0.255])
ciecam02.jch2rgb = (J, C, h) => {
	const rgb = sRGB.from_XYZ(ciecam02.reverse_model({ J, C, h }).XYZ);
	return d3c.rgb(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);
};

// change the lightness of an rgb value by dJ (if result is out of gammut then change direction)
ciecam02.rgbDeltaJ = (r, g, b, dJ) => {
	const jch = ciecam02.rgb2jch(r,g,b);
	jch.J = (jch.J+dJ < 100 && jch.J+dJ > 0)? jch.J + dJ : jch.J - dJ;
	return ciecam02.jch2rgb(jch.J, jch.C, jch.h);
};

