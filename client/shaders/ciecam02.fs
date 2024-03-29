varying vec2 v_uv;
uniform float u_time;
uniform float u_numEdges;	// no longer used (see u_numLevels and u_nodes)
uniform float u_opacity;
uniform float u_edgeRadius;
uniform float u_edgeDb;
uniform float u_showColors;
uniform float u_qHue;
uniform float u_qChroma;
uniform float u_showEdges;
uniform float u_maxContrast;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform sampler2D u_tex0;
uniform int u_numLevels;
uniform float u_nodes[100];		// list of node data for value levelling, array of values, each from 0 to 100.
								//     odd indexes are targets, even indexes are ranges. eg 
								//     [0]=min, [1]=tgt1, [2]=max
								//     [2]=min, [3]=tgt2, [4]=max

// refer to https://github.com/jrus/chromatist for Javascript implementation
float pi = 3.14159;
vec3 D75 = vec3(94.972, 100.0, 122.638);
vec3 D65 = vec3(95.047, 100.0, 108.883);
vec3 D55 = vec3(95.682, 100.0,  92.149);
vec3 D50 = vec3(96.422, 100.0,  82.521);

// linear transform matrix for lms = xyz * MCAT02
mat3 MCAT02 = mat3(0.7328,0.4296,-0.1624,         -0.7036,1.6975,0.0061,         0.0030,0.0136,0.9834);
mat3 MCAT02INV = mat3(1.096124,-0.278869,0.182745, 0.454369,0.473533,0.072098,  -0.009628,-0.005698,1.015326);

// linear transform matrix for rgb = xyz * MsRGB
mat3 MsRGB = mat3(3.2406,-1.5372,-0.4986,         -0.9689,1.8758,0.0415,         0.0557,-0.2040,1.0570);
mat3 MsRGBINV = mat3(0.4124,0.3576,0.1805,         0.2126,0.7152,0.0722,         0.0193,0.1192,0.9505);

// linear tranform matrix for lms_p = lms_c * MHPE = lms_c * (MH * MCAT02INV) 
mat3 MHPE = mat3(0.740979,0.218025,0.04101,        0.285353,0.624202,0.090445,  -0.0096276,-0.005698,1.015326);
mat3 MHPEINV = mat3(1.55915,-0.544723,-0.014445,  -0.71433,1.85031,-0.13598,     0.010776,0.0052188,0.984006);

// linear tranform matrix for p2ab = lms_p * MP2AB 
mat3 MP2AB = mat3(2.0000,1.0000,0.05000,           1.0000,-1.0909,0.090909,     0.111111,0.111111,-0.222222);
mat3 MP2ABINV = mat3(0.32787,0.32145,0.20527,      0.32787,-0.63507,-0.18603,   0.327869,-0.15681,-4.490378);


///////////////////////// sRGB /////////////////////////////////////////
// fwd XYZ [0..100] -> RGB [0..1] 
// rev RGB [0..1] -> // XYZ [0..100] normalised to Y=100

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
	vec3 rgb = xyz * MsRGB;
	return vec4(fwd_sRGB(rgb.r), fwd_sRGB(rgb.g), fwd_sRGB(rgb.b), color.a);
}

// convert sRGB to linear sRGB then to xyz
vec4 rev_rgb2xyz(vec4 color) {
	//Observer. = 2.0°, Illuminant = D65
	vec3 rgb = vec3(rev_sRGB(color.r), rev_sRGB(color.g), rev_sRGB(color.b)) * 100.0;							
	return vec4(rgb * MsRGBINV, color.a);
}

///////////////////////// Lab/lch /////////////////////////////////////////
// fwd XYZ [0..100] -> L[0..100] AB[-128..+128] -> L[0..100] C[0..100] H[0..360]
// rev L[0..100] C[0..100] H[0..360] -> L[0..100] AB[-128..+128] -> XYZ [0..100]

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
vec4 fwd_rgb2lch(vec4 color) {
	vec4 xyz = rev_rgb2xyz(color);
	vec4 lab = fwd_xyz2lab(xyz);
	vec4 lch = fwd_lab2lch(lab);
	return lch;
}

// convert lch to rgb 
vec4 rev_lch2rgb(vec4 color) {
	vec4 lab = rev_lch2lab(color);
	vec4 xyz = rev_lab2xyz(lab);
	vec4 rgb = fwd_xyz2rgb(xyz);
	return rgb;
}

///////////////////////// CIECAM02 /////////////////////////////////////////
// fwd XYZ [0..100] -> J[0..100] C[0..100] H[0..360]
// rev J[0..100] C[0..100] H[0..360] -> XYZ [0..100]
// 
// convert lms_p component to lms_a component
float fwd_jch(float c, float FL) {
   float x = pow(FL * abs(c) / 100.0, 0.42);
   return sign(c) * 400.0 * x / (27.13 + x) + 0.1;
}

// convert lms_a component to lms_p component
float rev_jch(float c, float FL) {
   float x = c - 0.1 ;
   return sign(x) * 100.0 / FL * pow(27.13 * abs(x) / (400.0 - abs(x)), 1.0/0.42);
}

// calculate surround parameters F (degree of adaption factor), c (impact of surround), Nc (chromatic induction factor)
// all based on S (surround factor [0=dark .. 1=dim .. 2=average])
vec3 calc_FcN(float S) {
	float F = float(S < 1.0)*(0.8 + 0.1*S)     + float(S >= 1.0)*(0.9 + 0.1*(S - 1.0));
	float c = float(S < 1.0)*(0.525 + 0.065*S) + float(S >= 1.0)*(0.59 + 0.1*(S - 1.0));
	float Nc = float(S < 1.0)*(0.8 + 0.15*S)   + float(S >= 1.0)*(0.95 + 0.05*(S - 1.0));
	return vec3(F, c, Nc);
}

// calculate D degree of adaption components and F_L luminance adaption based on viewing conditions
// xyz_w (adopting white point), La (luminance of adapting field) and F (surround 1.0=average, 0.9=dim, 0.8=dark)
vec4 calc_DF(vec3 xyz_w, float La, vec3 FcN) {
	vec3 lms_w = xyz_w * MCAT02;
	float D = FcN.x * (1.0 - 1.0 / 3.6 * exp(-(La + 42.0) / 92.0));
	float K = 1.0 / (5.0 * La + 1.0);
	return vec4(
		xyz_w.y / lms_w.x * D + 1.0 - D,  	// D_L
		xyz_w.y / lms_w.y * D + 1.0 - D,  	// D_M
		xyz_w.y / lms_w.z * D + 1.0 - D, 	// D_S
		(0.2 * pow(K, 4.0) * 5.0 * La + 0.1 * pow(1.0 - pow(K, 4.0), 2.0) * pow(5.0 * La, 1.0/3.0))		// F_L
	);
}

// calculate A_w, Nbb, z and n factors
// xyz_w (adopting white point), La (luminance of adapting field), Yb (background) amd DF prev calcs
vec4 calc_ANZn(vec3 xyz_w, float La, float Yb, vec4 DF) {
	vec3 lms_wp = ((xyz_w * MCAT02) * vec3(DF)) * MHPE;
	vec3 lms_wa = vec3(fwd_jch(lms_wp.x, DF.w), fwd_jch(lms_wp.y, DF.w), fwd_jch(lms_wp.z, DF.w));
	float n = Yb / xyz_w.y;
	float Nbb = 0.725 * pow(1.0 / n, 0.2);
	float z = 1.48 + sqrt(n);
	float Aw = (lms_wa.x*2.0 + lms_wa.y + lms_wa.z*0.05 - 0.305) * Nbb;
	return vec4(Aw, Nbb, z, n);
}

// convert color xyz to ciecam jch given viewing conditions xyz_w, La, Yb and S
vec4 fwd_xyz2jch(vec4 color, vec3 xyz_w, float La, float Yb, float S) {
	vec3 FcN = calc_FcN(S);
    vec4 DF = calc_DF(xyz_w, La, FcN); 
    vec4 ANZn = calc_ANZn(xyz_w, La, Yb, DF); 

	vec3 xyz = vec3(color);
	vec3 lms_p = ((xyz * MCAT02) * vec3(DF)) * MHPE;
	vec3 lms_a = vec3(fwd_jch(lms_p.x, DF.w), fwd_jch(lms_p.y, DF.w), fwd_jch(lms_p.z, DF.w));
	vec3 Aab = lms_a * MP2AB; Aab.x = (Aab.x - 0.305) * ANZn.y;
	float J = 100.0 * pow(Aab.x / ANZn.x, FcN.y * ANZn.z); 
	float h_rad = atan(Aab.z, Aab.y); 			//in GLSL this is atan2
	float h = degrees(h_rad) + float(degrees(h_rad) < 0.0) * 360.0;
	float e_t = 1.0 / 4.0 * (cos(h_rad + 2.0) + 3.8);
	float t = (50000.0 / 13.0 * FcN.z * ANZn.y * e_t * sqrt(Aab.y*Aab.y + Aab.z*Aab.z) 
			  / (lms_a.x + lms_a.y + 21.0 / 20.0 * lms_a.z));
	float C = pow(t, 0.9) * sqrt(J / 100.0) * pow(1.64 - pow(0.29, ANZn.w), 0.73);
	return vec4(J, C, h, color.a);
}
 
// convert color jch to xyz given viewing conditions xyz_w, La, Yb and S
vec4 rev_jch2xyz(vec4 color, vec3 xyz_w, float La, float Yb, float S) {
	vec3 FcN = calc_FcN(S);
    vec4 DF = calc_DF(xyz_w, La, FcN); 
    vec4 ANZn = calc_ANZn(xyz_w, La, Yb, DF); 

    float J = color.x; float C = color.y; float h_rad = radians(color.z);
    float A = ANZn.x * pow(J / 100.0, 1.0 / FcN.y / ANZn.z);
	float t = pow(C / (sqrt(J / 100.0) * pow(1.64 - pow(0.29, ANZn.w), 0.73)), 10.0 / 9.0);
	float e_t = 1.0 / 4.0 * (cos(h_rad + 2.0) + 3.8);   
	float p_1 = 50000.0 / 13.0 * FcN.z * ANZn.y * e_t / t;
	float p_2 = A / ANZn.y + 0.305;
	float q_1 = p_2 * 61.0/20.0 * 460.0/1403.0;
	float q_2 = 61.0/20.0 * 220.0/1403.0;
	float q_3 = 21.0/20.0 * 6300.0/1403.0 - 27.0/1403.0;
	float sin_h = sin(h_rad);
	float cos_h = cos(h_rad);
	vec3 Aab = vec3(A / ANZn.y + 0.305, 0.0, 0.0);
	if (t != 0.0) {
		if (abs(sin_h) >= abs(cos_h)) {
			Aab.z = q_1 / (p_1 / sin_h + q_2 * cos_h / sin_h + q_3); 
			Aab.y = Aab.z * cos_h / sin_h; 
		} else {
			Aab.y = q_1 / (p_1 / cos_h + q_2 + q_3 * sin_h / cos_h); 
			Aab.z = Aab.y * sin_h / cos_h; 
		}
	}
	vec3 lms_a = Aab * MP2ABINV;
	vec3 lms_p = vec3(rev_jch(lms_a.x, DF.w), rev_jch(lms_a.y, DF.w), rev_jch(lms_a.z, DF.w));
	vec3 xyz = ((lms_p * MHPEINV) * MCAT02INV) / vec3(DF);
	return vec4(xyz, color.a);
}


// convert color rgb to ciecam02 jch given viewing conditions xyz_w, La, Yb and S
vec4 fwd_rgb2jch(vec4 color, vec3 xyz_w, float La, float Yb, float S) {
	vec4 xyz = rev_rgb2xyz(color);
	vec4 jch = fwd_xyz2jch(xyz, xyz_w, La, Yb, S);
	return jch;
}

// convert color ciecam02 jch to rgb given viewing conditions xyz_w, La, Yb and S
vec4 rev_jch2rgb(vec4 color, vec3 xyz_w, float La, float Yb, float S) {
	vec4 xyz = rev_jch2xyz(color, xyz_w, La, Yb, S);
	vec4 rgb = fwd_xyz2rgb(xyz);
	return rgb;
}

// Diagonal Hatch 15 pixels apart
// Returns a float from 0.0 to 1.0 indicating hatch level
float hatch() {
	return mod(gl_FragCoord.x-gl_FragCoord.y, 15.0)/15.0;	
}

bool in_gamut(float c) {
	// return ((c>= -0.0) && (c<=1.0)); // this crops the sRGB whites and blacks for J=100 and J=0
	return (c<=1.0215);		// ensure valid sRGB colors for J=[0..100], C=0 and ALL hues, given viewing conditions D65, La=100, Yb=20
}

bool in_gamut_sRGB(vec4 rgb) {
	return (in_gamut(rgb.x) && in_gamut(rgb.y) && in_gamut(rgb.z));
}

// linear transform xsrc towards xtgt based on t, only whenever xsrc is between xmin and xmax
float flatten(float xsrc, float xmin, float xtgt, float xmax,  float t) {
	float a = t * step(xmin, xsrc) * step(xsrc, xmax);
	return mix(xsrc, xtgt, a);
}

vec4 adjust_jch(vec4 jch) {
	// VALUE adustments based on leveling node targets, ranges and opacity
	int limit = u_numLevels * 2;
	float t = (100.0 - u_opacity) / 100.0;
	for (int i = 2; i < 19; i += 2) {
		if (i > limit) break;												// workaround as FOR check cannot use uniforms
		jch.x = flatten(jch.x, u_nodes[i-2], u_nodes[i-1], u_nodes[i], t);
	}

	// TEST plate of J&C for a given hue which changes over time
	// jch.x = v_uv.y * 100.0;   // Value
	// jch.y = v_uv.x * 125.0;	  // Chroma
	// jch.z = u_time * 30.0;    // Hue
	// if (in_gamut_sRGB(rev_jch2rgb(jch, D65, 100.0, 20.0, 1.0))) ; else jch.x=0.0;

	// HUE adjustment (a) optionally quantise the hue
	float hx = 360.0 / 10.0;
	jch.z = mix(jch.z, floor(jch.z/hx)*hx, t*step(50.0, u_qHue));

	// CHROMA adjustment (a) optionally quantise the chroma
	float cx = 125.0 / 10.0;
	jch.y = mix(jch.y, floor(jch.y/cx)*cx+1.0, t*step(50.0, u_qChroma));

	// CHROMA adjustments (b) optionally boost the chroma
	float newy = mix(jch.y, min(jch.y+20.0, 100.0), u_maxContrast/100.0);
	jch.y = mix(jch.y, newy, t);

	// CHROMA adjustments (c) optionally show the colors
	jch.y = jch.y * u_showColors / 100.0;

	return jch;
}

vec4 blur_rgb2jch() {
	// const float r=4.0;
	float r = u_edgeRadius*2.5 + 3.0, rr=r*r;
	float dx = 1.0/u_resolution.x;
	float dy = 1.0/u_resolution.y;
	float w, w0, x, y, xx, yy;

    w0 = 0.3780 / pow(r, 1.975);
    vec2 p;
    vec4 rgb = vec4(0.0,0.0,0.0,0.0);
    for (float i=0.0; i<=30.0; i++) { 
		x = i - r; if (x > r) break;										// workaround as FOR check cannot use uniforms
		xx = x*x;
		p.x = v_uv.x + (x * dx);
    	for (float j=0.0; j<=30.0; j++) { 
			y = j - r; if (y > r) break;									// workaround as FOR check cannot use uniforms
			yy = y*y;
			p.y = v_uv.y + (y * dy);
			if (xx+yy <= rr)
				{
				w = w0 * exp((-xx-yy)/(2.0 * rr));
				rgb += adjust_jch(fwd_rgb2jch(texture2D(u_tex0, p), D65, 100.0, 20.0, 1.0)) * w;
				}
		}
	}
	vec4 jch = rgb;
	return jch;
}

// Sample texture lumen at given uv co-ordinate
float getAve(vec2 uv){
    vec3 rgb = texture2D(u_tex0, uv).rgb;
    vec3 lum = vec3(0.299, 0.587, 0.114);
    return dot(lum, rgb);
}

// Detect edge using differential operator.
vec4 sobel(vec2 fragCoord, vec2 dir){
    vec2 uv = fragCoord/u_resolution.xy;
    vec2 texel = 1./u_resolution.xy;
	float thickness = max(0.5, u_edgeRadius);
    float np = getAve(uv + (vec2(-1,+1) + dir ) * texel * thickness);
    float zp = getAve(uv + (vec2( 0,+1) + dir ) * texel * thickness);
    float pp = getAve(uv + (vec2(+1,+1) + dir ) * texel * thickness);
    
    float nz = getAve(uv + (vec2(-1, 0) + dir ) * texel * thickness);
    // zz = 0
    float pz = getAve(uv + (vec2(+1, 0) + dir ) * texel * thickness);
    
    float nn = getAve(uv + (vec2(-1,-1) + dir ) * texel * thickness);
    float zn = getAve(uv + (vec2( 0,-1) + dir ) * texel * thickness);
    float pn = getAve(uv + (vec2(+1,-1) + dir ) * texel * thickness);
    
	//                               gx												  gy
    // np zp pp				 -46.84	 0.   +46.84	 						-46.84  -162.32  -46.84
    // nz zz pz				-162.32	 0.  +162.32							  0.       0.      0.
    // nn zn pn				 -46.84	 0.   +46.84							+46.84  +162.32  +46.84

    float mq = getAve(uv + (vec2(-2,+2) + dir ) * texel * thickness);
    float nq = getAve(uv + (vec2(-1,+2) + dir ) * texel * thickness);
    float zq = getAve(uv + (vec2( 0,+2) + dir ) * texel * thickness);
    float pq = getAve(uv + (vec2(+1,+2) + dir ) * texel * thickness);
    float qq = getAve(uv + (vec2(+2,+2) + dir ) * texel * thickness);

    float mp = getAve(uv + (vec2(-2,+1) + dir ) * texel * thickness);
    float qp = getAve(uv + (vec2(+2,+1) + dir ) * texel * thickness);

    float mz = getAve(uv + (vec2(-2, 0) + dir ) * texel * thickness);
    float qz = getAve(uv + (vec2(+2, 0) + dir ) * texel * thickness);

    float mn = getAve(uv + (vec2(-2,-1) + dir ) * texel * thickness);
    float qn = getAve(uv + (vec2(+2,-1) + dir ) * texel * thickness);

    float mm = getAve(uv + (vec2(-2,-2) + dir ) * texel * thickness);
    float nm = getAve(uv + (vec2(-1,-2) + dir ) * texel * thickness);
    float zm = getAve(uv + (vec2( 0,-2) + dir ) * texel * thickness);
    float pm = getAve(uv + (vec2(+1,-2) + dir ) * texel * thickness);
    float qm = getAve(uv + (vec2(+2,-2) + dir ) * texel * thickness);

	// mq nq zq pq qq
	// mp np zp pp qp
    // mz nz zz pz qz
    // mn nn zn pn qn
	// mm nm zm pm qm

	float gx=0.0, gy=0.0;
    
    // SOBEL filter - standard operator
    //  gx = (np*-1. + nz*-2. + nn*-1. + pp*1. + pz*2. + pn*1.);
    //  gy = (np*-1. + zp*-2. + pp*-1. + nn*1. + zn*2. + pn*1.);
    // SOBEL filter - most common, better rotational symmetry, https://en.wikipedia.org/wiki/Sobel_operator#Alternative_operators 
    //  gx = (np*-3. + nz*-10. + nn*-3. + pp*3. + pz*10. + pn*3.);
    //  gy = (np*-3. + zp*-10. + pp*-3. + nn*3. + zn*10. + pn*3.);
	// SCHARR filter - optimised 3x3 operator, derivative kernel, p155 https://archiv.ub.uni-heidelberg.de/volltextserver/962/1/Diss.pdf
	//  gx = (np*-46.84 + nz*-162.32 + nn*-46.84 + pp*46.84 + pz*162.32 + pn*46.84);
	//  gy = (np*-46.84 + zp*-162.32 + pp*-46.84 + nn*46.84 + zn*162.32 + pn*46.84);
	// SCHARR filter - optimised 5x5 operator, derivative kernel, p155, https://archiv.ub.uni-heidelberg.de/volltextserver/962/1/Diss.pdf
	//  Table B.11 5x5-opt vectors mutiplied out and divided by 107 to get same magnitude as 3x3-opt
		gx =  (mq*-1.175 + mp*-12.279 + mz*-23.981 + mn*-12.279 + mm*-1.175);
		gx += (nq*-4.720 + np*-49.335 + nz*-96.354 + nn*-49.335 + nm*4.720);
		gx += (pq*4.720 + pp*49.335  + pz*96.354  + pn*49.335  + pm*4.720);
		gx += (qq*1.175 + qp*12.279  + qz*23.981  + qn*12.279  + qm*1.175);

		gy =  (mq*-1.175 + nq*-12.279 + zq*-23.981 + pq*-12.279 + qq*-1.175);
		gy += (mp*-4.720 + np*-49.335 + zp*-96.354 + pp*-49.335 + qp*-4.720);
		gy += (mn*4.720  + nn*49.335  + zn*96.354  + pn*49.335  + qn*4.720);
		gy += (mm*1.175  + nm*12.279  + zm*23.981  + pm*12.279  + qm*1.175);
    
    vec2 G = vec2(gx,gy);
    
    float grad = length(G);
    
    float angle = atan(G.y, G.x);
    
    return vec4(G, grad, angle);
}
// Make edge thinner.
vec2 hysteresisThr(vec2 fragCoord, float mn, float mx){

    vec4 edge = sobel(fragCoord, vec2(0));

    vec2 dir = vec2(cos(edge.w), sin(edge.w));
    dir *= vec2(-1,1); // rotate 90 degrees.
    
    vec4 edgep = sobel(fragCoord, dir);
    vec4 edgen = sobel(fragCoord, -dir);
	// supress this edge  - if this gradient is less than gradient in positive or negative direction
    if(edge.z < edgep.z || edge.z < edgen.z ) edge.z = 0.;
    
    return vec2(
        (edge.z > mn) ? edge.z : 0.,		// weak edge (or strong edge)
        (edge.z > mx) ? edge.z : 0.			// strong edge
    );
}

float cannyEdge(vec2 fragCoord, float mn, float mx){

    vec2 np = hysteresisThr(fragCoord + vec2(-1,+1), mn, mx);
    vec2 zp = hysteresisThr(fragCoord + vec2( 0,+1), mn, mx);
    vec2 pp = hysteresisThr(fragCoord + vec2(+1,+1), mn, mx);
    
    vec2 nz = hysteresisThr(fragCoord + vec2(-1, 0), mn, mx);
    vec2 zz = hysteresisThr(fragCoord + vec2( 0, 0), mn, mx);
    vec2 pz = hysteresisThr(fragCoord + vec2(+1, 0), mn, mx);
    
    vec2 nn = hysteresisThr(fragCoord + vec2(-1,-1), mn, mx);
    vec2 zn = hysteresisThr(fragCoord + vec2( 0,-1), mn, mx);
    vec2 pn = hysteresisThr(fragCoord + vec2(+1,-1), mn, mx);
    
    // np zp pp
    // nz zz pz
    // nn zn pn

	// supress if below weak, or (strong and no neighbor strong)
    return min(1., step(1e-2, zz.x*8.) * step(1e-2, (np.y + zp.y + pp.y + nz.y + pz.y + nn.y + zn.y + pn.y)*8.));
}


void main( void ) {
	vec4 jch1 = fwd_rgb2jch(texture2D(u_tex0, v_uv), D65, 100.0, 20.0, 1.0);
	vec4 jch2 = adjust_jch(jch1);

	if (u_showEdges>0.0) {
		// EDGE adjustment (a) optionally outline using gaussian difference
		// vec4 jch3 = blur_rgb2jch();
		// float t = u_showEdges / 100.0 * (100.0 - u_opacity) / 100.0;
		// jch2.x = mix(jch2.x, 100.0-(step(u_edgeDb*2.0 + 2.0, jch3.x-jch2.x)*100.0), t);

		// EDGE adjustment (b) optionally outline using canny edge detection
		vec2 fragCoord = v_uv*u_resolution.xy;
		float threshold = u_edgeDb*10. + 5.;
		float edge = cannyEdge(fragCoord, threshold/2., threshold);  // The weak threshold is typically set to 1/2 of the strong threshold
		float t = u_showEdges / 100.0 * (100.0 - u_opacity) / 100.0;
		jch2.x = mix(jch2.x, 100. - edge*100., t);

	}

	// Convert back to RGB
	vec4 rgb = rev_jch2rgb(jch2, D65, 100.0, 20.0, 1.0);

	gl_FragColor = rgb;

}