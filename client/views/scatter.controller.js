import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';
import THREE from 'three';
import * as d3scale from 'd3-scale';
import * as d3shape from 'd3-shape';
import * as d3color from 'd3-color';
import { tween, physics, easing } from 'popmotion';
import '/imports/3d/OrbitControls.js';
import popmotionTHREERenderer from '/imports/3d/popmotionTHREERenderer.js';
import Scatter3d from '/imports/3d/scatter3d.js';
import { getImageSlicePixels } from '/imports/3d/getImageSlice.js';
import { getWebglPixel } from '/imports/3d/getWebglPixel.js';
import { createLabelSprite } from '/imports/3d/drawLabel.js';
import { createBackplaneMaterials } from '/imports/3d/drawBackplane.js';
import { lerpObject } from '/imports/color/hcl.js';
import { store } from '/imports/store/index.js';


const d3 = { ...d3scale, ...d3color, ...d3shape };
let oldHcl = undefined;
let newHcl = undefined;

Template.scatter.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

const xScale = d3.scaleLinear().domain([0, 360]).range([-10, 10]);
const yScale = d3.scaleLinear().domain([0, 100]).range([-5, 5]);
const zScale = d3.scaleLinear().domain([0, 100]).range([0, 10]);

Template.scatter.onRendered(function () {
	const self = this;

	self.$('.ui.sidebar').sidebar({
		dimPage: false,
		closable: false,
	});
	
	const container = self.$('.js-placeholder')[0];
	const film = self.film = popmotionTHREERenderer(container, { useOrbitControls: true });

	// Add the backplane
	const hueBkr = new THREE.Mesh(
		new THREE.BoxGeometry(xScale(360)-xScale(0), yScale(100)-yScale(0), 0.5),
		createBackplaneMaterials()
	);
	hueBkr.position.z = -0.25;
	film.scene.add(hueBkr);

	// Add the hue plate
	const huePlateGroup = new THREE.Group();
	const huePlateBkr = new THREE.Mesh(
		new THREE.PlaneGeometry(10, 10),
		new THREE.MeshStandardMaterial({
			color: d3.rgb(100, 100, 100), roughness: 0.5, metalness: 0.5, shading: THREE.SmoothShading,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.4,
		})
	);
	huePlateGroup.add(huePlateBkr);
	huePlateGroup.translateZ(5);
	huePlateGroup.rotateY(Math.PI / 2);
	film.scene.add(huePlateGroup);


	// Add the cylinder pointer
	const geometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 32);
	const material = new THREE.MeshStandardMaterial({ color: d3.hcl(0, 0, 100) });
	const cylinder = new THREE.Mesh(geometry, material);
	cylinder.rotateX(Math.PI / 2);
	cylinder.scale.y = zScale(0.001);
	film.scene.add(cylinder);
	function setCylinder(hcl) {
		film.set('huePlateGroup.x', xScale(hcl.h));
		film.set('cylinder.x', xScale(hcl.h));
		film.set('cylinder.y', yScale(hcl.l));
		film.set('cylinder.scaleY', zScale(hcl.c + 0.00001));
		film.set('cylinder.z', zScale(hcl.c / 2));
	}

	// Add the scatter points
	const scatter = Scatter3d(xScale, yScale, zScale);
	film.scene.add(scatter.points);

	const labels = [
		{ text: 'Windsor Yellow', 		r: 229, g: 195, b: 19 },
		{ text: 'New Gamboge', 			r: 243, g: 174, b: 0 },
		{ text: 'Gold Ochre', 			r: 240, g: 115, b: 11 },
		{ text: 'Burnt Umber', 			r: 191, g: 127, b: 27 },
		{ text: 'Burnt Sienna', 		r: 203, g: 69, b: 16 },
		{ text: 'Cadnium Red',			r: 240, g: 50, b: 25 },
		{ text: 'Perylene Maroon',		r: 168, g: 41, b: 33 },
		{ text: 'Quinacridone Magenta',	r: 227, g: 54, b: 136 },
		{ text: 'French Ultramarine',	r: 28, g: 86, b: 248 },
		{ text: 'Windsor Blue',			r: 69, g: 173, b: 238 },
		{ text: 'Cerulean Blue',		r: 49, g: 148, b: 199 },
		{ text: 'W Green BS',			r: 55, g: 187, b: 171 },
		{ text: 'W Green YS',			r: 62, g: 182, b: 132 },
		{ text: 'Paynes Grey',			r: 48, g: 76, b: 100 },
	];

	// Add the Labels
	_.each(labels, d => {
		const rgb = d3.rgb(d.r, d.g, d.b);
		const hcl = d3.hcl(rgb);
		const pos = new THREE.Vector3(xScale(hcl.h), yScale(hcl.l), zScale(hcl.c));
		const label = createLabelSprite({ text: d.text });
		label.position.copy(pos);
		film.scene.add(label);
	});

	film.setNameSpace({ scatter: scatter.points, cylinder, huePlateGroup });
	film.set('camera.z', 20);

	// contuously render to cater for OrbitControls which doesnt use film.set yet
	physics({ velocity: 1 }).output(v => film.set('camera.render', v)).start();

	film.touch.on('press', 		ev => console.log(ev));
	film.touch.on('tap', 		ev => store.set('rgb', getWebglPixel(film.renderer.context, ev)));

	// Monitor the image slice definition and update the scatter plot when it changes
	self.autorun(function() {
		const doc = store.get('imageSliceDefn');
		const scatterType = FlowRouter.getParam('type');
		switch (scatterType) {
		case 'all':
			scatter.updateDataAll();
			tween({ ease: easing.easeInOut, duration: 300 })
			.output(v => film.set('scatter.u_tween', v))
			.start();
			break;
		case 'hue':
			if (doc.isReady) {
				console.log('scatter', JSON.stringify(doc));
				const img = new Image();
				img.src = doc.src;
				img.onload = function() {
					scatter.updateDataHue(getImageSlicePixels(doc, this));
				};
			}
			break;
		default:
			break;
		}
		film.set('camera.render', true);
	});

	// Monitor the rgb pointer and update the cylinder pointer when it changes
	self.autorun(function() {
		const doc = store.get('rgb');
		if (doc.isReady) {
			oldHcl = _.clone(newHcl);
			newHcl = d3.hcl(d3.rgb(doc.r, doc.g, doc.b));
			if (!oldHcl) {
				setCylinder(newHcl);
			} else {
				tween({ ease: easing.easeInOut, duration: 500 })
					.output(t => setCylinder(lerpObject(t, oldHcl, newHcl)))
					.start();
			}
		}
	});
});

Template.scatter.events({
	'wheel': function(ev, template) {
		(ev.originalEvent.deltaY > 0) ? template.film.zoomOut() : template.film.zoomIn();
	},
});

