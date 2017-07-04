
uniform float size;
uniform float scale;
uniform float u_tween;
attribute vec3 color;
varying vec3 vColor;



void main() {

	vColor.xyz = color.xyz;
	vec3 transformed = vec3( position );
	transformed.z = u_tween * transformed.z;
	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
	gl_PointSize = size * ( scale / - mvPosition.z );

}
