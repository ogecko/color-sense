import THREE from 'three';
import { VHC, maxChroma, rgb_to_vhc, vhc_to_rgb, wrapFromTo, dsp3 } from '/imports/color/vhc.js';
import chromatist from 'chromatist/lib/chromatist.js';

const sRGB = chromatist.rgb.Converter('sRGB');
const CIECAM02 = chromatist.ciecam.Converter({ adapting_luminance: 100, background_luminance: 20, whitepoint: 'D65', discounting: false });

const ditherHue = () => Math.random() * 1.41;		// 360/255
const ditherValue = () => Math.random() * 0.39;		// 100/255

class Scatter3d {
	constructor(xScale, yScale, zScale) {
		this.xScale = xScale;
		this.yScale = yScale;
		this.zScale = zScale;
		this.maxParticles = 500000;
		this.positions = new Float32Array(this.maxParticles * 3);
		this.colors = new Float32Array(this.maxParticles * 3);
		this.geometry = new THREE.BufferGeometry();
		this.geometry.addAttribute('position', new THREE.BufferAttribute(this.positions, 3));
		this.geometry.addAttribute('color', new THREE.BufferAttribute(this.colors, 3));
		this.geometry.computeBoundingSphere();
		this.material = new THREE.ShaderMaterial({
			uniforms: {		// values set each frame by refreshUniformsPoints
				size: { value: null },
				scale: { value: null },
				diffuse: { value: null },
				opacity: { value: null },
				u_tween: { value: 1.0 },
				map: { value: null },
			},
			// blending: THREE.AdditiveBlending,
			transparent: true,
			vertexShader: Shaders.scatter.vertexShader,
			fragmentShader: Shaders.scatter.fragmentShader,
		});
		this.material.size = 0.06;
		this.material.opacity = 0.9;
		this.material.map = null;
		this.material.isPointsMaterial = true;
		this.points = new THREE.Points(this.geometry, this.material);
	}

	updateDataAll() {
		const positions = this.geometry.getAttribute('position');
		const colors = this.geometry.getAttribute('color');
		const count = this.maxParticles;
		for (var i = 0; i < count; i ++) {
			// set rgb color of vertex
			var r = Math.random() * 256;
			var g = Math.random() * 256;
			var b = Math.random() * 256;
			colors.setX(i, r / 255);
			colors.setY(i, g / 255);
			colors.setZ(i, b / 255);
			// set position of vertex
			const xyz = sRGB.to_XYZ([r / 255, g / 255, b / 255]);
			const jch = CIECAM02.forward_model(xyz);

			positions.setX(i, this.xScale(jch.h));
			positions.setY(i, this.yScale(jch.J));
			positions.setZ(i, this.zScale(jch.C));
		}
		colors.updateRange = { offset: 0, count };
		colors.needsUpdate = true;

		positions.updateRange = { offset: 0, count };
		positions.needsUpdate = true;

		this.geometry.setDrawRange(0, count);
		this.geometry.computeBoundingSphere();
	}
	updateDataHue(pixelBuffer) {
		const positions = this.geometry.getAttribute('position');
		const colors = this.geometry.getAttribute('color');
		const pixels = new THREE.BufferAttribute(pixelBuffer, 4);
		const count = (pixels.count > this.maxParticles) ? this.maxParticles : pixels.count;
		for (var i = 0; i < count; i ++) {
			// set rgb color of vertex
			colors.setX(i, pixels.getX(i) / 255);
			colors.setY(i, pixels.getY(i) / 255);
			colors.setZ(i, pixels.getZ(i) / 255);
			// set position of vertex
			const xyz = sRGB.to_XYZ([pixels.getX(i) / 255, pixels.getY(i) / 255, pixels.getZ(i) / 255]);
			const jch = CIECAM02.forward_model(xyz);
			positions.setX(i, this.xScale(jch.h+ditherHue()));
			positions.setY(i, this.yScale(jch.J+ditherValue()));
			positions.setZ(i, this.zScale(jch.C+ditherValue()));
		}
		colors.updateRange = { offset: 0, count };
		colors.needsUpdate = true;

		positions.updateRange = { offset: 0, count };
		positions.needsUpdate = true;

		this.geometry.setDrawRange(0, count);
		this.geometry.computeBoundingSphere();
	}

	updateDataValue(pixelBuffer) {
		const positions = this.geometry.getAttribute('position');
		const colors = this.geometry.getAttribute('color');
		const pixels = new THREE.BufferAttribute(pixelBuffer, 4);
		const count = (pixels.count > this.maxParticles) ? this.maxParticles : pixels.count;
		const width = Math.sqrt(count);
		for (var i = 0; i < count; i ++) {
			// set rgb color of vertex
			colors.setX(i, pixels.getX(i) / 255);
			colors.setY(i, pixels.getY(i) / 255);
			colors.setZ(i, pixels.getZ(i) / 255);
			// set position of vertex
			const xyz = sRGB.to_XYZ([pixels.getX(i) / 255, pixels.getY(i) / 255, pixels.getZ(i) / 255]);
			const jch = CIECAM02.forward_model(xyz);
			positions.setX(i, (i%width - width/2)/30);
			positions.setY(i, (Math.round(i/width)-width/2)/30);
			positions.setZ(i, this.zScale(jch.J));

		}
		colors.updateRange = { offset: 0, count };
		colors.needsUpdate = true;

		positions.updateRange = { offset: 0, count };
		positions.needsUpdate = true;

		this.geometry.setDrawRange(0, count);
		this.geometry.computeBoundingSphere();
	}


}

export default function (xScale, yScale, zScale) {
	return new Scatter3d(xScale, yScale, zScale);
}

