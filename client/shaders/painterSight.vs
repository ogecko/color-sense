attribute vec2 a_position;			// attribute for normalised device coordinates of the current fragment (bottom left = -1,-1, top right = 1,1)
attribute vec2 a_texcoord;			// attribute for unit texture co-ordinates
varying vec2 v_texcoord;            // unit coordinates of the current fragment (bottom left = 0,0, top right = 1,1)
uniform vec2 u_resolution;          // dimensions of the viewport in pixels
uniform vec2 u_tex0Resolution;     // resolution of the first texture

void main() {
	vec2 st = a_position;
	float yscale = u_resolution.y/u_tex0Resolution.y;
	float xscale = u_resolution.x/u_tex0Resolution.x;
	float texaspect = u_tex0Resolution.x / u_tex0Resolution.y; 
	// st.y = st.y/yscale;
	gl_Position = vec4(st, 0.0, 1.0);
	v_texcoord = a_texcoord;
}
