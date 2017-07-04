import { Template } from 'meteor/templating';
import THREE from 'three';
import * as d3scale from 'd3-scale';
import * as d3shape from 'd3-shape';
import * as d3color from 'd3-color';
import { tween, physics, easing } from 'popmotion';
import '/imports/3d/OrbitControls.js';
import popmotionTHREERenderer from '/imports/3d/popmotionTHREERenderer.js';
import { createBackplaneMaterials } from '/imports/3d/drawBackplane.js';
import { getImageSliceFuncs } from '/imports/3d/getImageSlice.js';
import { getWebglPixel } from '/imports/3d/getWebglPixel.js';
import { store } from '/imports/store/index.js';

const d3 = { ...d3scale, ...d3color, ...d3shape };
let surface = undefined;

Template.surface.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

const xScale = d3.scaleLinear().domain([0, 360]).range([-10, 10]);
const yScale = d3.scaleLinear().domain([0, 100]).range([-5, 5]);
const zScale = d3.scaleLinear().domain([0, 100]).range([0, 10]);

Template.surface.onRendered(function () {
	const self = this;
	const container = self.$('.js-placeholder')[0];
	const film = self.film = popmotionTHREERenderer(container, { useOrbitControls: true });

	// Add the backplane
	const hueBkr = new THREE.Mesh(
		new THREE.BoxGeometry(xScale(360) - xScale(0), yScale(100) - yScale(0), 0.5),
		createBackplaneMaterials()
	);
	hueBkr.position.z = -0.25;
	film.scene.add(hueBkr);

	film.setNameSpace({  });
	film.set('camera.z', 20);

	// contuously render to cater for OrbitControls which doesnt use film.set yet
	physics({ velocity: 1 }).output(v => film.set('camera.render', v)).start();

	film.touch.on('press', 		ev => console.log(ev));
	film.touch.on('tap', 		ev => console.log(getWebglPixel(film.renderer.context, ev)));

	// Add or update the surface plot
	self.autorun(function() {
		const doc = store.get('imageSliceDefn');
		if (doc.isReady) {
			if (surface) film.scene.remove(surface);
			const img = new Image();
			img.src = doc.src;
			img.onload = function() {
				const fn = getImageSliceFuncs(doc, this);
				const surfaceGeometry = new THREE.ParametricBufferGeometry(fn.parametricFunc, 200, 100);
				surfaceGeometry.addAttribute('color', fn.colorsFunc(200, 100));
				const surfaceMaterial = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });
				surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
				film.scene.add(surface);
			};
		}
		film.set('camera.render', true);
	});
});


Template.surface.events({
	'wheel': function(ev, template) {
		(ev.originalEvent.deltaY > 0) ? template.film.zoomOut() : template.film.zoomIn();
	},
});

