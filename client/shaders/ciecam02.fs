uniform float u_numEdges;
uniform float u_maskDark;
uniform float u_maskLight;
uniform float u_showColors;
uniform float u_showEdges;
uniform float u_maxContrast;
uniform vec2 u_resolution;
uniform sampler2D u_tex0;
varying vec2 v_uv;

float pi = 3.14159;
vec3 D65 = vec3(95.047, 100.0, 108.883);
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
	float e_t = 1.0/4.0 * (cos(h_rad + 2.0) + 3.8);
	float t = (50000.0 / 13.0 * FcN.z * ANZn.w * e_t * sqrt(Aab.y*Aab.y + Aab.z*Aab.z) 
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
	float p_1 = 50000.0 / 13.0 * FcN.z * ANZn.w * e_t / t;
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

void main( void ) {
	vec4 lch = fwd_rgb2jch(texture2D(u_tex0, v_uv), D65, 100.0, 20.0, 1.0);

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

	gl_FragColor = rev_jch2rgb(lch, D65, 100.0, 20.0, 1.0);
}