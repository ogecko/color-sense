import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Keypress } from 'meteor/keypress:keypress';
import THREE from 'three';
import Hammer from  'hammerjs';
import popmotionTHREERenderer from '/imports/3d/popmotionTHREERenderer.js';
import ImageMesh from '/imports/3d/ImageMesh.js';
import { createRulerMesh } from '/imports/3d/drawRuler.js';
import { huePlate, hueSpace, hueCursor, getCPos, getVPos } from '/imports/3d/huePlate.js';
import { VHC, maxChroma, rgb_to_vhc, vhc_to_rgb, wrapFromTo, dsp3 } from '/imports/color/vhc.js';
import { tween, physics, easing }  from 'popmotion';
import * as d3c from "d3-color";
import { getImageSliceDefn } from '/imports/3d/getImageSlice.js';
import { store } from '/imports/store/index.js';

Template.sketch.onCreated(function() {
	const self = this;
	store.subscribe(self);
	self.keyboard = new Keypress.Listener();	// ensure this is destroyed on template removal
});

Template.sketch.onDestroyed(function() {
	const self = this;
	self.keyboard.destroy();
	self.film.restoreScrollBars();

});

Template.sketch.onRendered(function () {
	const self = this;
	let noLockView = true;
	let img = undefined;
	let clock = undefined;

	self.$('.ui.sidebar').sidebar({
		dimPage: false,
		closable: false,
	});

	const container = self.$('.js-placeholder')[0];
	const film = self.film = popmotionTHREERenderer(container);
	film.removeScrollBars();


	self.autorun(function() {
		const imageName = FlowRouter.getQueryParam('image');
		const fileName = FlowRouter.getQueryParam('file');
		let path = undefined;
		if (imageName) path = `/images/${imageName}.jpg`;
		if (fileName) path = `/gridfs/uploads/md5/${fileName}`;
		if (path) {
			if (img) film.scene.remove(img);
			img = ImageMesh(path, 'ciecam02', film);
			film.scene.add(img);

			// const ruler = createRulerMesh();
			// img.add(ruler);


			film.setNameSpace({ img });
			
			if (!clock) {
				clock = physics({ velocity: 1 })
					.output(v => film.set('img.u_time', film.clock.getElapsedTime()))
					.start();
			}

			film.thresholdTo(50);
		}
	});

	self.autorun(function() {
		const doc = store.get('thresholdSettings');
		if (doc.isReady || true) {						// always set the WEBGL uniforms, to defaults if necessary
			const nodes = _.isArray(doc.nodes) ? doc.nodes : [0, 50, 100];
			_.each(doc.maskLevels, (isMasked, level) =>{
				if (isMasked) {
					maskIndex = level*2-1
					nextIndex = (level>doc.numLevels/2) ? maskIndex - 2 : maskIndex + 2
					nodes[maskIndex] = nodes[nextIndex]
				}
			})
			console.log('updating', doc);
			film.uniformTo('img.u_numEdges', doc.numEdges ? doc.numEdges : 0);
			film.uniformTo('img.u_opacity', doc.opacity ? doc.opacity : 0);
			film.uniformTo('img.u_showColors', doc.showColors ? 100 : 0);
			film.uniformTo('img.u_showEdges', doc.showSoftEdges ? 10 : 0);
			film.uniformTo('img.u_maxContrast', doc.maxContrast ? 100 : 0);
			film.uniformSet('img.u_numLevels', doc.numLevels ? doc.numLevels : 0);
			film.uniformSet('img.u_nodes', nodes);
		}
	});


	self.autorun(function() {
		const doc = store.get('viewSettings');
		if (doc.isReady) {
			console.log('updating', doc);
			film.zoomTo(doc.zoomLevel);
			noLockView = !doc.lockView;
		}
	});

	film.touch.on('panstart', 	ev => noLockView && film.panToStartDrag(ev));
	film.touch.on('pan', 		ev => noLockView && film.panToContinueDrag(ev));
	film.touch.on('panend', 	ev => noLockView && film.panToEndWithInertia(ev));

	film.touch.on('press', 		ev => console.log(getImageSliceDefn(film.camera, film.namespace.img)));
	film.touch.on('tap', 		ev => {
		const pos = { x: ev.srcEvent.offsetX, y: film.renderer.domElement.height - ev.srcEvent.offsetY };
		var pixelBuffer = new Uint8Array( 4 );

		const gl = film.renderer.context;
		gl.readPixels(pos.x, pos.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
		const vhc = rgb_to_vhc(pixelBuffer[0], pixelBuffer[1], pixelBuffer[2]);
		const rgb = d3c.rgb(pixelBuffer[0], pixelBuffer[1], pixelBuffer[2]);
		const hcl = d3c.hcl(rgb);
		console.log(pos, rgb, hcl, vhc);
		store.set('rgb', rgb);
	});

	self.keyboard.simple_combo('ctrl 1', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.0; return s; }));
	self.keyboard.simple_combo('ctrl 2', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.05; return s; }));
	self.keyboard.simple_combo('ctrl 3', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.1; return s; }));
	self.keyboard.simple_combo('ctrl 4', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.15; return s; }));
	self.keyboard.simple_combo('ctrl 5', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.2; return s; }));
	self.keyboard.simple_combo('ctrl 6', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.3; return s; }));
	self.keyboard.simple_combo('ctrl 7', ev => store.mutate('viewSettings', s => { s.zoomLevel = 1.6; return s; }));
	self.keyboard.simple_combo('ctrl 8', ev => store.mutate('viewSettings', s => { s.zoomLevel = 2.0; return s; }));
	self.keyboard.simple_combo('ctrl 9', ev => store.mutate('viewSettings', s => { s.zoomLevel = 5.0; return s; }));
	self.keyboard.simple_combo('ctrl 0', ev => store.mutate('viewSettings', s => { s.zoomLevel = 0.95; return s; }));
	self.keyboard.simple_combo('ctrl =', ev => film.zoomIn(0.1));
	self.keyboard.simple_combo('ctrl -', ev => film.zoomOut(0.1));

	self.keyboard.simple_combo('alt 1', ev => store.mutate('thresholdSettings', s => { s.numEdges = 0; return s; }));
	self.keyboard.simple_combo('alt 2', ev => store.mutate('thresholdSettings', s => { s.numEdges = 10; return s; }));
	self.keyboard.simple_combo('alt 3', ev => store.mutate('thresholdSettings', s => { s.numEdges = 20; return s; }));
	self.keyboard.simple_combo('alt 4', ev => store.mutate('thresholdSettings', s => { s.numEdges = 30; return s; }));
	self.keyboard.simple_combo('alt 5', ev => store.mutate('thresholdSettings', s => { s.numEdges = 40; return s; }));
	self.keyboard.simple_combo('alt 6', ev => store.mutate('thresholdSettings', s => { s.numEdges = 50; return s; }));
	self.keyboard.simple_combo('alt 7', ev => store.mutate('thresholdSettings', s => { s.numEdges = 60; return s; }));
	self.keyboard.simple_combo('alt 8', ev => store.mutate('thresholdSettings', s => { s.numEdges = 70; return s; }));
	self.keyboard.simple_combo('alt 9', ev => store.mutate('thresholdSettings', s => { s.numEdges = 80; return s; }));
	self.keyboard.simple_combo('alt 0', ev => store.mutate('thresholdSettings', s => { s.numEdges = 90; return s; }));
	self.keyboard.simple_combo('alt =', ev => store.mutate('thresholdSettings', s => { s.numEdges++; return s; }));
	self.keyboard.simple_combo('alt -', ev => store.mutate('thresholdSettings', s => { s.numEdges--; return s; }));

	self.keyboard.simple_combo('m', ev => {
		store.set('imageSliceDefn', getImageSliceDefn(film.camera, film.namespace.img));
	});

	self.keyboard.simple_combo('x', ev => {
		var pixelBuffer = new Uint8Array( 4*500*500 );

		const gl = film.renderer.context;
		gl.readPixels(
			0, 0,
			500, 500, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer
		);
		const vhc = rgb_to_vhc(pixelBuffer[0], pixelBuffer[1], pixelBuffer[2]);
		console.log('grabbed pixelBuffer');
	});

});

Template.sketch.events({
	'click js-lock': () => console.log('lock'),
	'wheel': function(ev, template) {
		(ev.originalEvent.deltaY > 0) ? template.film.zoomOut() : template.film.zoomIn();
	},
});

