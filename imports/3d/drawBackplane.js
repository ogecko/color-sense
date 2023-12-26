import THREE from 'three';
import { _ } from 'meteor/underscore';
import * as d3scale from 'd3-scale';
import * as d3shape from 'd3-shape';
import * as d3color from 'd3-color';
import { JuMuHu_to_color } from 'color-cam16/dist/index.js';


const d3 = { ...d3scale, ...d3color, ...d3shape };

export function drawBackplane(ctx, options) {
	const defaults = {
		textColor: d3.hcl(0, 0, 100),
		fontSize: 20,
		fontFace: 'Arial',
	};
	const props = { ...defaults, ...options };
	ctx.font = `${props.fontSize}px ${props.fontFace}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const xScale = d3.scaleLinear().domain([0, 360]).range([0, ctx.canvas.width]);
	const yScale = d3.scaleLinear().domain([0, 100]).range([0, ctx.canvas.height]);

	const nh = 26*2;
	const nv = 10;
	const dh = 360 / nh;
	const dv = 100 / nv;
	_.each(_.range(0, 360, dh), h => {
		_.each(_.range(-5, 100, dv), v => {

			// Fill each tile
			const dvv = ((dv/2 + v) / dv) % 2;
			const dvh = ((dh/2 + h) / dh) % 2;
			const tileValue = 52 + (dvh ^ dvv) * 5;
			const c = JuMuHu_to_color({ Ju: tileValue, Mu: 40, Hu: h })
			const g = JuMuHu_to_color({ Ju: tileValue+10, Mu: 40, Hu: h })
	
			ctx.fillStyle = c.hex;
			ctx.fillRect(xScale(h), yScale(v), xScale(dh), yScale(dv));

			// Horizontal gridlines
			_.each(_.range(0, dv, dv/4), t => {
				ctx.strokeStyle = g.hex
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(xScale(h), yScale(v + t));
				ctx.lineTo(xScale(h + dh), yScale(v + t));
				ctx.stroke();
			});

			// Vertical gridlines
			_.each(_.range(0, dh, dh/3), t => {
				ctx.strokeStyle = g.hex
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(xScale(h + t), yScale(v));
				ctx.lineTo(xScale(h + t), yScale(v + dv));
				ctx.stroke();
			});

			if (v >= 100-dv) {
				// Hue scale (Alphabetic)
				ctx.fillStyle = props.textColor;
				ctx.fillText(c.hexLabel1.substr(1,1), xScale(h + dh / 2), yScale(dv / 4));
				ctx.fillText(c.hexLabel1.substr(1,1), xScale(h + dh / 2), yScale(100 - dv / 4));
			}

		});

		// ctx.fillStyle = props.textColor;
		// ctx.fillText(String.fromCharCode(65 + (h / dh)), xScale(h + dh / 2), yScale(100 - dv / 4));
	});

	// Value scale (Numeric)
	_.each(_.range(10, 100, dv), v => {
		ctx.fillStyle = props.textColor;
		ctx.fillText(String.fromCharCode(58 - (v / dv)), xScale(dh / 2), yScale(v));
		ctx.fillText(String.fromCharCode(58 - (v / dv)), xScale(360 - dh / 2), yScale(v));
	});

	// Vertical 90' Gridlines
	_.each(_.range(0, 380, 360/4), t => {
		ctx.strokeStyle = d3.hcl(0, 0, 70);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(xScale(t), yScale(0));
		ctx.lineTo(xScale(t), yScale(100));
		ctx.stroke();
	});

	// Vertical 90' Hue Angle Labels
	// _.each(_.range(0, 380, 360/4), t => {
	// 	ctx.font = `${props.fontSize*3/4}px ${props.fontFace}`;
	// 	ctx.fillStyle = props.textColor;
	// 	ctx.save();
	// 	ctx.translate(xScale(t), yScale(dv / 4));
	// 	ctx.rotate(-Math.PI/2);
	// 	ctx.fillText(t, 0, 0);
	// 	ctx.restore();
	// });

	return props;
}

export function createBackplaneMaterials(options) {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	canvas.width = 1024;
	canvas.height = 1024;
	drawBackplane(context, options);

	const front = new THREE.CanvasTexture(canvas);

	const top = new THREE.CanvasTexture(canvas);
	top.repeat = new THREE.Vector2(1, 0.05);

	const left = new THREE.CanvasTexture(canvas);
	left.repeat = new THREE.Vector2(15 / 360, 1);

	const right = new THREE.CanvasTexture(canvas);
	right.offset = new THREE.Vector2(345 / 360, 0);
	right.repeat = new THREE.Vector2(15 / 360, 1);

	const materials = [
		new THREE.MeshStandardMaterial({ map: right }),
		new THREE.MeshStandardMaterial({ map: left }),
		new THREE.MeshStandardMaterial({ map: top }),
		new THREE.MeshStandardMaterial({ map: top }),
		new THREE.MeshStandardMaterial({ map: front }),
		new THREE.MeshStandardMaterial({ map: front }),
	];


	return new THREE.MultiMaterial(materials);
}
