uniform float opacity;
uniform vec3 diffuse;
varying vec3 vColor;

void main() {

	gl_FragColor = vec4( vColor, opacity );
}
