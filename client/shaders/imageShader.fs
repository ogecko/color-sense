uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_tex0;
varying vec2 v_uv;

void main( void ) {
	vec3 img = texture2D( u_tex0, v_uv ).rgb;
	gl_FragColor = vec4( img.r+u_time, img.g, img.b, 1.0 );
	// gl_FragColor = vec4( v_uv, 0.5+0.5*cos(u_time), 1.0 );
}