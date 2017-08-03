import THREE from 'three';
import { _ } from 'meteor/underscore';

// img = ImageMesh('images/port.jpg', 'imageShader')
export default function ImageMesh(imagePath, shaderName, renderer) {

	// create the geometry (a 1x1 plane) to place the image on
	const geometry = new THREE.PlaneGeometry(1, 1);

	// create the material and uniforms for its shader
	const uniforms = JSON.parse(JSON.stringify(Shaders[shaderName].uniforms));
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: Shaders[shaderName].vertexShader,
		fragmentShader: Shaders[shaderName].fragmentShader,
	});

	// create the texture to hold the image
	const texture = new THREE.Texture();
	texture.minFilter = THREE.LinearFilter;
	// texture.magFilter = THREE.NearestFilter;
	texture.generateMipmaps = false;

	// create the mesh
	const mesh = new THREE.Mesh(geometry, material);
	mesh.scale.x = 0.0001;	// dont show anything until loaded

	// load the image, assign to texture, resize mesh, assign as u_tex0 for shader
	const image = new THREE.ImageLoader().load(imagePath, function (image) {
		console.log(`Image size: ${image.width} x ${image.height}`);
		texture.image = image;
		texture.needsUpdate = true;
		uniforms.u_tex0.value = texture;
		mesh.scale.x = 10;
		mesh.scale.y = 10 * image.height / image.width;
		renderer.render(true);
	});

	// return a new mesh created from the geometry and material
	return mesh;
}
