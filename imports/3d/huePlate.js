import THREE from 'three';
import { _ } from 'meteor/underscore';
import { VHC, maxChroma, maxValue, dspVHC } from '/imports/color/vhc.js';

export function setVCPos(obj, v, c) {
	obj.position.setX(getCPos(c));
	obj.position.setY(getVPos(v));
}

export function getVPos(v) {
	return Math.round(v) * GRIDSIZE;
}
export function getCPos(c) {
	return Math.round(2 + c / 2) * GRIDSIZE;
}

function roundedRect(ctx, x, y, width, height, radius) {
	const xl = x - width / 2;
	const yb = y - width / 2;
	ctx.moveTo(xl, yb + radius);
	ctx.lineTo(xl, yb + height - radius);
	ctx.quadraticCurveTo(xl, yb + height, xl + radius, yb + height);
	ctx.lineTo(xl + width - radius, yb + height);
	ctx.quadraticCurveTo(xl + width, yb + height, xl + width, yb + height - radius);
	ctx.lineTo(xl + width, yb + radius);
	ctx.quadraticCurveTo(xl + width, yb, xl + width - radius, yb);
	ctx.lineTo(xl + radius, yb);
	ctx.quadraticCurveTo(xl, yb, xl, yb + radius);
}

function rectHole(ctx, x, y, width, height) {
	const xl = x - width / 2;
	const yb = y - width / 2;
	ctx.moveTo(xl, yb);
	ctx.lineTo(xl + width, yb);
	ctx.lineTo(xl + width, yb + height);
	ctx.lineTo(xl, yb + height);
	ctx.closePath();
}


const GRIDSIZE = 0.3;
const TILEPROPORTION = 0.70;
const TILEWIDTH = GRIDSIZE*TILEPROPORTION;
const HOLEWIDTH = TILEWIDTH;

export function hueCursor(v, h, c) {
	const shape = new THREE.Shape();
	const color = VHC((v>5)? v-4 : v+4, h, c);
	roundedRect(shape, 0, 0, GRIDSIZE, GRIDSIZE, GRIDSIZE*0.1);
	const hole = new THREE.Path();
	rectHole(hole, 0, 0, HOLEWIDTH, HOLEWIDTH);
	shape.holes.push(hole);
	return new THREE.Mesh(
				new THREE.ShapeGeometry(shape),
				new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
			);
}

var clippingPlanes = [
					// new THREE.Plane( new THREE.Vector3( -1,  0,  0 ), 0 ),
					// new THREE.Plane( new THREE.Vector3( 0,  0, -1 ), 5 )
				];

export function hueRow(v, h) {
	const hueRowGroup = new THREE.Group();
	_.range(0, 32, 2).forEach(c => {
		const color = VHC(v, h, c);
		if (color) {
			const hueTile = new THREE.Mesh(
				new THREE.BoxGeometry(TILEWIDTH, TILEWIDTH, 0.01),
				new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, 
					clippingPlanes,	clipIntersection: true })
				// new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
			);
			setVCPos(hueTile, v, c);
			hueRowGroup.add(hueTile);
			// const hueTile2 = new THREE.Mesh(
			// 	new THREE.IcosahedronBufferGeometry(TILEWIDTH/6, 2),
			// 	new THREE.MeshStandardMaterial({ color,  roughness: 0.5, shading: THREE.FlatShading })
			// 	// new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
			// );
			// setVCPos(hueTile2, v, c);
			// hueTile2.position.setX(getCPos(c)-TILEWIDTH/3);
			// hueTile2.position.setY(getVPos(v)+TILEWIDTH/3);
			// hueRowGroup.add(hueTile2);
		}
	});
	return hueRowGroup;
}

let s = '';

export function huePlate(h) {
	const huePlateGroup = new THREE.Group();
	_.range(0, 11).forEach(v => {
		huePlateGroup.add(hueRow(v, h));
	});

	const max = maxChroma(h, undefined, 0.01);
	const maxColor = VHC(max.V, max.H, max.C);

	const hueBkr = new THREE.Mesh(
		new THREE.PlaneGeometry(GRIDSIZE*10, GRIDSIZE*10),
		new THREE.MeshStandardMaterial({
			color: maxColor, roughness: .5, metalness: .5, shading: THREE.SmoothShading,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.2
		})
	);
	setVCPos(hueBkr, 5, 10);
	huePlateGroup.add(hueBkr);

	const hueTitle = new THREE.Mesh(
		new THREE.RingGeometry(
				(1.5+10)*GRIDSIZE, 
				(1.5+10.95)*GRIDSIZE, 
				6,
				1,
				0/360*2*Math.PI,
				14/360*2*Math.PI,
			),
		new THREE.MeshBasicMaterial({
			color: maxColor,
			side: THREE.DoubleSide
		})
	);
		hueTitle.rotation.x=Math.PI/2;
		hueTitle.rotation.z=-7.5/360*2*Math.PI;
		huePlateGroup.add(hueTitle);

	_.range(1, 10).forEach(v => {
		// const max = maxChroma(h, v);
		// const maxColor = VHC(max.V, max.H, max.C);
		// const hueTitleValue = new THREE.Mesh(
		// 	new THREE.PlaneGeometry(GRIDSIZE, GRIDSIZE/2),
		// 	new THREE.MeshBasicMaterial({
		// 		color: maxColor,
		// 		side: THREE.DoubleSide
		// 	})
		// );
		// setVCPos(hueTitleValue, 11, v*2);
		// huePlateGroup.add(hueTitleValue);

		const max = maxChroma(h, v);
		const maxColor = VHC(max.V, max.H, max.C);
		const hueTitleValue = new THREE.Mesh(
			new THREE.RingGeometry(
				(1.5+v)*GRIDSIZE, 
				(1.5+v+.95)*GRIDSIZE, 
				1,
				1,
				0/360*2*Math.PI,
				14/360*2*Math.PI,
			),
			new THREE.MeshBasicMaterial({
				color: maxColor,
				side: THREE.DoubleSide
			})
		);
		// hueTitleValue.position.x=v/2*GRIDSIZE;
		hueTitleValue.rotation.x=Math.PI/2;
		hueTitleValue.rotation.z=-7.5/360*2*Math.PI;
		huePlateGroup.add(hueTitleValue);

	});



	return huePlateGroup;
}

export function hueSpace() {
	const hueSpaceGroup = new THREE.Group();
	_.range(0, 360, 360/24).forEach(h => {
		const huePlateGroup = huePlate(h);
		huePlateGroup.rotation.y = h/360*2*Math.PI;
		hueSpaceGroup.add(huePlateGroup);
	});

	return hueSpaceGroup;
}
