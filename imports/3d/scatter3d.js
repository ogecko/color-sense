import THREE from 'three';
import { VHC, maxChroma, rgb_to_vhc, vhc_to_rgb, wrapFromTo, dsp3 } from '/imports/color/vhc.js';
import * as d3c from "d3-color";

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
			var vhc = d3c.hcl(d3c.rgb(r, g, b));
			positions.setX(i, this.xScale(vhc.h));
			positions.setY(i, this.yScale(vhc.l));
			positions.setZ(i, this.zScale(vhc.c));
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
			var hcl = d3c.hcl(d3c.rgb(pixels.getX(i), pixels.getY(i), pixels.getZ(i)));
			positions.setX(i, this.xScale(hcl.h+ditherHue()));
			positions.setY(i, this.yScale(hcl.l+ditherValue()));
			positions.setZ(i, this.zScale(hcl.c+ditherValue()));
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
			var hcl = d3c.hcl(d3c.rgb(pixels.getX(i), pixels.getY(i), pixels.getZ(i)));
			positions.setX(i, (i%width - width/2)/30);
			positions.setY(i, (Math.round(i/width)-width/2)/30);
			positions.setZ(i, this.zScale(hcl.l));

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

