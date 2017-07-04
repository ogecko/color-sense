import THREE from 'three';
import { _ } from 'meteor/underscore';
import * as d3c from "d3-color";

function clampFloor(number, lower, upper) {
  number = number <= upper ? number : upper;
  number = number >= lower ? number : lower;
  number = Math.floor(number);
  return number;
}

export function getImageSliceDefn(camera, obj) {
	const viewMatrix = new THREE.Matrix4();
	const posTopLeft = new THREE.Vector3(-0.5, 0.5, 0);		// Assume 1 x 1 square mesh geometry
	const posBottomRight = new THREE.Vector3(0.5, -0.5, 0);

	viewMatrix.multiplyMatrices(camera.projectionMatrix, obj.modelViewMatrix);
	posTopLeft.applyMatrix4(viewMatrix);
	posBottomRight.applyMatrix4(viewMatrix);

	// position of the img in screen co-ord, where 0,0 (topleft) and 1,1 (bottomright) cover visible screen
	const sPos = {
		left: (posTopLeft.x + 1) / 2,
		top: (1 - posTopLeft.y) / 2,
		right: (posBottomRight.x + 1) / 2,
		bottom: (1 - posBottomRight.y) / 2,
	};
	sPos.width = sPos.right - sPos.left;
	sPos.height = sPos.bottom - sPos.top;

	// visible potion of the img on the screen in pixels
	const defn = {
		src: obj.material.uniforms.u_tex0.value.image.src,
		width: obj.material.uniforms.u_tex0.value.image.naturalWidth,
		height: obj.material.uniforms.u_tex0.value.image.naturalHeight,
		maxSlicePixels: 500000,
	};

	// define what is visible on the screen
	defn.sx = (sPos.left < 0) ? -sPos.left / sPos.width * defn.width : 0;	// crop left
	defn.sy = (sPos.top < 0) ? -sPos.top / sPos.height * defn.height : 0;	// crop top
	defn.dx = (sPos.right > 1) ?  defn.width - defn.sx - (sPos.right - 1) / sPos.width * defn.width : defn.width - defn.sx; // crop right
	defn.dy = (sPos.bottom > 1) ?  defn.height - defn.sy - (sPos.bottom - 1) / sPos.height * defn.height : defn.height - defn.sy; // crop bottom

	defn.sx = clampFloor(defn.sx, 0, defn.width);
	defn.sy = clampFloor(defn.sy, 0, defn.height);
	defn.dx = clampFloor(defn.dx, 0, defn.width);
	defn.dy = clampFloor(defn.dy, 0, defn.height);

	return defn;
}

export function getImageSlicePixels(defn, img) {
	// calculate size of canvas to ensure less than maxSlicePixels (retaining aspect ratio)
	const cx = Math.floor(Math.sqrt(defn.maxSlicePixels * defn.dx / defn.dy));
	const cy = Math.floor(cx * defn.dy / defn.dx);
	const canvas = document.createElement('canvas');
	canvas.width = cx;
	canvas.height = cy;

	// draw the slice of the image onto the 2d canvas then grab its pixels
	const gl = canvas.getContext('2d');
	gl.drawImage(img, defn.sx, defn.sy, defn.dx, defn.dy, 0, 0, cx, cy);
	return gl.getImageData(0, 0, cx, cy).data;
}

const isBoundary = (u, v) => (u === 0 || v === 0 || u === 1 || v === 1);

export function getImageSliceFuncs(defn, img) {
	// calculate size of canvas to ensure less than maxSlicePixels (retaining aspect ratio)
	const cx = Math.floor(Math.sqrt(defn.maxSlicePixels * defn.dx / defn.dy));
	const cy = Math.floor(cx * defn.dy / defn.dx);
	const canvas = document.createElement('canvas');
	canvas.width = cx;
	canvas.height = cy;

	// draw the slice of the image onto the 2d canvas then grab its pixels
	const gl = canvas.getContext('2d');
	gl.drawImage(img, defn.sx, defn.sy, defn.dx, defn.dy, 0, 0, cx, cy);
	return {
		parametricFunc: (u, v) => {
			const pixel = gl.getImageData(u * cx, (1 - v) * cy, 1, 1).data;
			const hcl = d3c.hcl(d3c.rgb(pixel[0], pixel[1], pixel[2]));
			return new THREE.Vector3(
				u * 20 - 10,
				v * 10 - 5,
				isBoundary(u, v) ? 0 : (100-hcl.l) / 50
			);
		},
		colorsFunc: (stacks, slices) => {
			const colors = [];
			for (let i = 0; i <= slices; i++) {
				for (let j = 0; j <= stacks; j++) {
					const pixel = gl.getImageData(j * cx / stacks, (slices - i) * cy / slices, 1, 1).data;
					colors.push(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, pixel[3] / 255);
				}
			}
			return new THREE.BufferAttribute(new Float32Array(colors), 4);

		},
	};
}
