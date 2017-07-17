// THREE WebGLProgram built in uniforms and attributes
// attr vec2 uv;				// position of vertex in textures co-ord space
// attr vec2 position;			// vertex world position from geometry 
// unif mat4 modelViewMatrix;	// camera.matrixWorldInverse * object.matrixWorld
// unif mat4 projectionMatrix;	// camera.projectionMatrix

varying vec2 v_uv;					// varying texture position passed to fragment shader 

void main()
{
	v_uv = uv;

	// screen position = obj pos > world pos > camera pos > screen pos
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
