precision highp float;

uniform float u_time;               // elapsed time in seconds since initial render
uniform vec2 u_mouse;               // windows-relative co-ordinates of the mouse pointer
uniform vec2 u_resolution;          // dimensions of the viewport in pixels

uniform float u_isLayered;
uniform float u_isBlackWhite;
uniform float u_isSaturated;
uniform float u_isTraced;
uniform float u_isRegisterMarked;
uniform float u_isExpanded;
uniform float u_currentLevel;

uniform sampler2D u_tex0;           // contains first texture loaded with <canvas> data-textures attribute
uniform vec2 u_tex0Resolution;     // resolution of the first texture

// varying vec4 gl_FragCoord        // window-relative coordinates of the current fragment (bottom left = 0.5,0.5, top right = width-.5,height-.5)
varying vec2 v_position;            // normalised device coordinates of the current fragment (bottom left = -1,-1, top right = 1,1)
varying vec2 v_texcoord;            // unit coordinates of the current fragment (bottom left = 0,0, top right = 1,1)

vec4 rgb_to_xyz(vec4 color) {
		float var_R = (color.r); //R from 0.0 to 255.0
		float var_G = (color.g); //G from 0.0 to 255.0
		float var_B = (color.b); //B from 0.0 to 255.0
 
		if (var_R > 0.04045) {
			var_R = pow(((var_R + 0.055) / 1.055), 2.4);
		} else {
			var_R = var_R / 12.92;
		}
		if (var_G > 0.04045) {
			var_G = pow(((var_G + 0.055) / 1.055), 2.4);
		} else {
			var_G = var_G / 12.92;
		}
 
		if (var_B > 0.04045) {
			var_B = pow(((var_B + 0.055) / 1.055), 2.4);
		} else {
			var_B = var_B / 12.92;
		}
 
		var_R = var_R * 100.0;
		var_G = var_G * 100.0;
		var_B = var_B * 100.0;
 
		//Observer. = 2.0°, Illuminant = D65
		float X = var_R * 0.4124 + var_G * 0.3576 + var_B * 0.1805;
		float Y = var_R * 0.2126 + var_G * 0.7152 + var_B * 0.0722;
		float Z = var_R * 0.0193 + var_G * 0.1192 + var_B * 0.9505;
 
		return vec4(X, Y, Z, color.a);
	}
 
	vec4 xyz_to_lab(vec4 color) {
 
		float ref_X = 95.047; //Observer= 2.0°, Illuminant= D65
		float ref_Y = 100.000;
		float ref_Z = 108.883;
 
		float var_X = color.r / ref_X;
		float var_Y = color.g / ref_Y;
		float var_Z = color.b / ref_Z;
 
		if (var_X > 0.008856) {
			var_X = pow(var_X, (1.0 / 3.0));
		} else {
			var_X = (7.787 * var_X) + (16.0 / 116.0);
		}
		if (var_Y > 0.008856) {
			var_Y = pow(var_Y, (1.0 / 3.0));
		} else {
			var_Y = (7.787 * var_Y) + (16.0 / 116.0);
		}
		if (var_Z > 0.008856) {
			var_Z = pow(var_Z, (1.0 / 3.0));
		} else {
			var_Z = (7.787 * var_Z) + (16.0 / 116.0);
		}
 
		float L = (116.0 * var_Y) - 16.0;
		float a = 500.0 * (var_X - var_Y);
		float b = 200.0 * (var_Y - var_Z);
 
		return vec4(L, a, b, color.a);
	}
 
	vec4 lab_to_lch(vec4 color) {
 
		const float MPI = 3.14159265359;
 
		float var_H = atan(color.b, color.g); //in GLSL this is atan2
 
		if (var_H > 0.0) {
			var_H = (var_H / MPI) * 180.0;
		} else {
			var_H = 360.0 - (abs(var_H) / MPI) * 180.0;
		}
 
		float C = sqrt(pow(color.g, 2.0) + pow(color.b, 2.0));
		float H = var_H;
 
		return vec4(color.r, C, H, color.a);
	}
	// ---------------------------
	vec4 lch_to_lab(vec4 color) {
		float a = cos(radians(color.b)) * color.g;
		float b = sin(radians(color.b)) * color.g;
 
		return vec4(color.r, a, b, color.a);
	}
 
	vec4 lab_to_xyz(vec4 color) {
		float var_Y = (color.r + 16.0) / 116.0;
		float var_X = color.g / 500.0 + var_Y;
		float var_Z = var_Y - color.b / 200.0;
 
		if (pow(var_Y, 3.0) > 0.008856) {
			var_Y = pow(var_Y, 3.0);
		} else {
			var_Y = (var_Y - 16.0 / 116.0) / 7.787;
		}
		if (pow(var_X, 3.0) > 0.008856) {
			var_X = pow(var_X, 3.0);
		} else {
			var_X = (var_X - 16.0 / 116.0) / 7.787;
		}
		if (pow(var_Z, 3.0) > 0.008856) {
			var_Z = pow(var_Z, 3.0);
		} else {
			var_Z = (var_Z - 16.0 / 116.0) / 7.787;
		}
 
		float ref_X = 95.047; //Observer= 2.0 degrees, Illuminant= D65
		float ref_Y = 100.000;
		float ref_Z = 108.883;
 
		float X = ref_X * var_X;
		float Y = ref_Y * var_Y;
		float Z = ref_Z * var_Z;
 
		return vec4(X, Y, Z, color.a);
	}
 
	vec4 xyz_to_rgb(vec4 color) {
		float var_X = color.r / 100.0; //X from 0.0 to  95.047      (Observer = 2.0 degrees, Illuminant = D65);
		float var_Y = color.g / 100.0; //Y from 0.0 to 100.000;
		float var_Z = color.b / 100.0; //Z from 0.0 to 108.883;
 
		float var_R = var_X * 3.2406 + var_Y * -1.5372 + var_Z * -0.4986;
		float var_G = var_X * -0.9689 + var_Y * 1.8758 + var_Z * 0.0415;
		float var_B = var_X * 0.0557 + var_Y * -0.2040 + var_Z * 1.0570;
 
		if (var_R > 0.0031308) {
			var_R = 1.055 * pow(var_R, (1.0 / 2.4)) - 0.055;
		} else {
			var_R = 12.92 * var_R;
		}
		if (var_G > 0.0031308) {
			var_G = 1.055 * pow(var_G, (1.0 / 2.4)) - 0.055;
		} else {
			var_G = 12.92 * var_G;
		}
		if (var_B > 0.0031308) {
			var_B = 1.055 * pow(var_B, (1.0 / 2.4)) - 0.055;
		} else {
			var_B = 12.92 * var_B;
		}
 
		float R = var_R;
		float G = var_G;
		float B = var_B;
 
		return vec4(R, G, B, color.a);
	}
 
 
	vec4 rgb_to_lch(vec4 color) {
		vec4 xyz = rgb_to_xyz(color);
		vec4 lab = xyz_to_lab(xyz);
		vec4 lch = lab_to_lch(lab);
		return lch;
	}
 
 
	vec4 lch_to_rgb(vec4 color) {
		vec4 lab = lch_to_lab(color);
		vec4 xyz = lab_to_xyz(lab);
		vec4 rgb = xyz_to_rgb(xyz);
		return rgb;
	}
 
	vec4 rgb_to_lab(vec4 color) {
		vec4 xyz = rgb_to_xyz(color);
		vec4 lab = xyz_to_lab(xyz);
		return lab;
	}
 
	vec4 lab_to_rgb(vec4 color) {
		vec4 xyz = lab_to_xyz(color);
		vec4 rgb = xyz_to_rgb(xyz);
		return rgb;
	}

//  Function from http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl 
//  Verified against PhotoShop HSB scales
vec4 rgb2hsb( in vec4 c ){
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);
	vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)),   d / (q.x + e),   q.x,   c.a);
}

vec4 hsb2rgb( in vec4 c ){
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return vec4(c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y),   c.a);
}

float smoothquantends(				// quantize a value into a series of steps (curved at start and end of range)
	in float v,                     // value to quantify (0 to range)
	in float range,                 // 100% value or highest value
	in float steps,                 // number of steps to break value up into (2 to n) 
	in float curved)                // proportion of each step plateau to curve between levels (0=0% to 1=100%)
	{
	float x = v/range;						// normalised value (0 to 1)
	float xc = x*curved/steps;				// curved region of each step
	x = x / (1.0 - xc);						// scale up x to ignore last curved area
	float si = floor(x*(steps-1.0));		// integer step (0 to steps-1)
	float sf = fract(x*(steps-1.0));		// fraction of next step (0 to 1)
	return ((si + smoothstep(0.0,curved,sf)) /steps) * range;
}


float smoothquant(					// quantize a value into a series of steps (curved at trailing end of each step)
	in float v,                     // value to quantify (0 to range)
	in float range,                 // 100% value or highest value
	in float steps,                 // number of steps to break value up into (2 to n) 
	in float curved)                // proportion of each step plateau to curve between levels (0=0% to 1=100%)
	{
	float x = v/range;				// normalised value (0 to 1)
	float si = floor(x*steps);		// integer step (0 to steps)
	float sf = fract(x*steps);		// fraction of next step (0 to 1)
	return ((si + smoothstep(1.0-curved,1.0,sf)) /steps) * range;
}

void main(){
	// vec2 st = gl_FragCoord.xy/u_resolution;
	// vec3 color = vec3(0.0);

	// We map x (0.0 - 1.0) to the hue (0.0 - 1.0)
	// And the y (0.0 - 1.0) to the brightness
	// gl_FragColor = vec4(color,1.0);

	vec4 newColor;
	vec2 st = v_texcoord.xy;

	vec4 tex0Color = rgb_to_lch(texture2D(u_tex0,st));
	vec4 tex0HSB = rgb2hsb(texture2D(u_tex0,st));
	vec4 mouseHSB = rgb2hsb(texture2D(u_tex0,u_mouse/u_resolution));
	float dy = (mouseHSB.y - tex0HSB.y)/3.0;							// less sensitive to saturation changes
	float dx = mouseHSB.x - tex0HSB.x;									// calc raw hue difference
	dx = dx - floor((dx+0.5)/1.0)*1.0;									// clamp dx to equiv of -180 to +180
	float match = sqrt(dx*dx+dy*dy);									// calc hue/sat difference ignoring brightness (shadows)

	newColor = tex0Color;
	newColor.x = smoothquantends(tex0Color.x,100.0,u_currentLevel,0.001);            // break brightness up into X levels
	newColor.z = smoothquant(tex0Color.z,360.0,24.0,0.001);                          // break hue up into 18 levels
	newColor.y = smoothquantends(tex0Color.y,100.0,10.0,0.001);            // break brightness up into X levels

	// newColor = (u_isLayered*newColor)+(1.0-u_isLayered)*tex0Color;                // if layered use new color
	// newColor.y = (u_isSaturated*256.0)+(1.0-u_isSaturated)*newColor.y;            // if saturated set saturation to 1
	// newColor.y = (u_isBlackWhite*0.0)+(1.0-u_isBlackWhite)*newColor.y;            // if BW set saturation to zero

	// if (u_isExpanded*match>0.15) {
	// 	newColor.w = 0.0;
	// }

	// if (u_isExpanded==1.0) {
	// 	newColor.x=(1.0-smoothstep(u_mouse.x/u_resolution.x,u_mouse.x/u_resolution.x+0.1,newColor.x/100.0))*100.0;
	// 	newColor.w=1.0;
	// }

	// if (u_isTraced==1.0) {
	// 	// newColor.x=max((u_mouse.x/u_resolution.x-0.5/u_currentLevel)*100.0,newColor.x);
	// 	// newColor.x=min((u_mouse.x/u_resolution.x+0.5/u_currentLevel)*100.0,newColor.x);
	// 	newColor.x=u_mouse.x/u_resolution.x*100.0;
	// 	newColor.w=1.0;
	// }

	gl_FragColor = lch_to_rgb(newColor);

}