uniform float u_numEdges;
uniform float u_maskDark;
uniform float u_maskLight;
uniform float u_showColors;
uniform float u_showEdges;
uniform float u_maxContrast;
uniform vec2 u_resolution;
uniform sampler2D u_tex0;
varying vec2 v_uv;

vec3 D65 = vec3(95.047, 100.000, 108.883);

// compand a linear RGB component c into a nonlinear space
float fwd_sRGB(float c) {
	return (float(c > 0.0031308) * 1.055 * pow(c, (1.0 / 2.4)) - 0.055 
		  + float(c <= 0.0031308) * (12.92 * c));  
}

// inverse compand a non-linear RGB component c into a linear space
float rev_sRGB(float c) {
	return (float(c > 0.04045) * pow(((c + 0.055) / 1.055), 2.4) 
		  + float(c <= 0.04045) * (c / 12.92));  
}

// convert xyz to sRGB linear then compand to sRGB
vec4 fwd_xyz2rgb(vec4 color) {
	vec3 xyz = vec3(color.x, color.y, color.z) / 100.0;
	mat3 M = mat3(3.2406, -1.5372, -0.4986,   -0.9689, 1.8758, 0.0415,  0.0557, -0.2040, 1.0570);
	vec3 rgb = xyz * M;
	return vec4(fwd_sRGB(rgb.r), fwd_sRGB(rgb.g), fwd_sRGB(rgb.b), color.a);
}

// convert sRGB to linear sRGB then to xyz
vec4 rev_rgb2xyz(vec4 color) {
	//Observer. = 2.0°, Illuminant = D65
	vec3 rgb = vec3(rev_sRGB(color.r), rev_sRGB(color.g), rev_sRGB(color.b)) * 100.0;							
	mat3 M = mat3(0.4124, 0.3576, 0.1805,    0.2126, 0.7152, 0.0722,    0.0193, 0.1192, 0.9505);
	return vec4(rgb * M, color.a);
}

// convert xyz component to lab component
float fwd_lab(float c) {
	return (float(c > 0.008856) * pow(c, (1.0 / 3.0))
		  + float(c <= 0.008856) * ((7.787 * c) + (16.0 / 116.0)));
} 

// convert lab component to xyz component
float rev_lab(float c) {
	float c3 = pow(c, 3.0);
	return (float(c3 > 0.008856) * c3
		  + float(c3 <= 0.008856) * (c - 16.0 / 116.0) / 7.787);
} 

// convert xyz to lab
vec4 fwd_xyz2lab(vec4 color) {
	vec3 xyz_c = vec3(color.x, color.y, color.z) / D65;
	vec3 xyz_f = vec3(fwd_lab(xyz_c.x), fwd_lab(xyz_c.y), fwd_lab(xyz_c.z));
	float L = (116.0 * xyz_f.y) - 16.0;
	float a = 500.0 * (xyz_f.x - xyz_f.y);
	float b = 200.0 * (xyz_f.y - xyz_f.z);
	return vec4(L, a, b, color.a);
}
 
// convert lab to xyz
vec4 rev_lab2xyz(vec4 color) {
	float var_Y = (color.r + 16.0) / 116.0;
	vec3 xyz_f = vec3((color.g / 500.0 + var_Y), var_Y, (var_Y - color.b / 200.0));
	vec3 xyz_c = vec3(rev_lab(xyz_f.x), rev_lab(xyz_f.y), rev_lab(xyz_f.z));
	return vec4(xyz_c * D65, color.a);
}

// convert lab to lch
vec4 fwd_lab2lch(vec4 color) {
	float var_H = degrees(atan(color.b, color.g)); //in GLSL this is atan2
	float H = var_H + float(var_H < 0.0) * 360.0;
	float C = sqrt(pow(color.g, 2.0) + pow(color.b, 2.0));
	return vec4(color.r, C, H, color.a);
}

// convert lch to lab
vec4 rev_lch2lab(vec4 color) {
	float a = cos(radians(color.b)) * color.g;
	float b = sin(radians(color.b)) * color.g;
	return vec4(color.r, a, b, color.a);
}

// convert rgb to lch 
vec4 rgb_to_lch(vec4 color) {
	vec4 xyz = rev_rgb2xyz(color);
	vec4 lab = fwd_xyz2lab(xyz);
	vec4 lch = fwd_lab2lch(lab);
	return lch;
}


// convert lch to rgb 
vec4 lch_to_rgb(vec4 color) {
	vec4 lab = rev_lch2lab(color);
	vec4 xyz = rev_lab2xyz(lab);
	vec4 rgb = fwd_xyz2rgb(xyz);
	return rgb;
}

// Diagonal Hatch 15 pixels apart
// Returns a float from 0.0 to 1.0 indicating hatch level
float hatch() {
	return mod(gl_FragCoord.x-gl_FragCoord.y, 15.0)/15.0;	
}

void main( void ) {
	vec4 lch = rgb_to_lch(texture2D(u_tex0, v_uv));
	if (u_numEdges > 9.0) {					// u_numEdges 0 = no edges, 10 = 1 edge, 20 = 2 edges, 30 = 3 edges, etc.
		float dx = 1000.0 / (u_numEdges);		// dx is width of grey bands 100 for 1 edge, 50 for 2 edges, 33 for 3 edges, 25 for 4 edges, etc
		float lx = max(lch.x, dx * u_maskDark / 10.0);				// clamp out n dark bands eg 0 = show all, 10 = no blacks, 20=no blacks or darks
		float ly = min(lx, 100.0 - dx * u_maskLight / 10.0);		// clamp out n light bands eg 0 = show all, 10 = no whites, 20=no whites or lights
		float bv = (ly + dx / 2.0) / dx;		// calculate where lightness falls into the bands
		float b = floor(bv);					// band number 0,1,2,..n where n=#edges eg 2 edges n = 0:black,1:midtone,2:white
		float c = fract(bv) * 100.0;			// how far into band 0 to 100%
		lch.x = b * dx;																				// quantise the lightness
		lch.x = lch.x - step(c, u_showEdges)*hatch()*dx + step(100.0 - u_showEdges, c)*hatch()*dx;	// optionally add shoft edges
		float lowest = 0.0 + u_maskDark/10.0*dx*u_maxContrast/100.0;
		float highest = 100.0 - u_maskLight/10.0*dx*u_maxContrast/100.0;
		lch.x = (lch.x - lowest)/(highest-lowest)*100.0;											// optionally max the contrast	
	}

	// float hx = 360.0 / 3.0;
	// lch.z = floor(lch.z/hx)*hx;

	lch.y = lch.y * (1.0 + u_maxContrast/50.0);														// optionally amp the chroma
	lch.y = lch.y * u_showColors / 100.0;
	gl_FragColor = lch_to_rgb(lch);
}