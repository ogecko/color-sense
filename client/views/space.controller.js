import { _ } from 'meteor/underscore';
import THREE from 'three';
import Hammer from  'hammerjs';
import popmotionTHREERenderer from '/imports/3d/popmotionTHREERenderer.js';
import ImageMesh from '/imports/3d/ImageMesh.js';
import { huePlate, hueSpace, hueCursor, getCPos, getVPos } from '/imports/3d/huePlate.js';
import { VHC, maxChroma, rgb_to_vhc, vhc_to_rgb, wrapFromTo, dsp3 } from '/imports/color/vhc.js';
import { tween, physics, easing }  from 'popmotion';
import numeral from 'numeral';

Template.space.onCreated(function() {
	var self = this;
});


Template.space.onRendered(function () {
	const self = this;
	const container = self.$('.js-placeholder')[0];

	const film = self.film = popmotionTHREERenderer(container);

	const hues = hueSpace(); 
	film.scene.add(hues);

	film.setNameSpace({ hues });
	film.set('camera.z', 7);
	film.set('camera.y', 1.5);

	film.touch.on('panstart', 	ev => film.panToStartDrag(ev));
	film.touch.on('pan', 		ev => film.panToContinueDrag(ev));
	film.touch.on('panend', 	ev => film.panToEndWithInertia(ev));

	film.touch.on('press', 		ev => console.log(ev));

	const keyboard = new Keypress.Listener();
	keyboard.simple_combo('ctrl 1', ev => film.zoomTo(1.5));
	keyboard.simple_combo('ctrl 2', ev => film.zoomTo(2));
	keyboard.simple_combo('ctrl 3', ev => film.zoomTo(3));
	keyboard.simple_combo('ctrl 4', ev => film.zoomTo(5));
	keyboard.simple_combo('ctrl 5', ev => film.zoomTo(7));
	keyboard.simple_combo('ctrl 6', ev => film.zoomTo(10));
	keyboard.simple_combo('ctrl 7', ev => film.zoomTo(15));
	keyboard.simple_combo('ctrl 8', ev => film.zoomTo(20));
	keyboard.simple_combo('ctrl 9', ev => film.zoomTo(30));
	keyboard.simple_combo('ctrl 0', ev => film.zoomTo(1));
	keyboard.simple_combo('ctrl =', ev => film.zoomIn());
	keyboard.simple_combo('ctrl -', ev => film.zoomOut());

	keyboard.simple_combo(']', ev => film.viewPlan());
	keyboard.simple_combo('[', ev => film.viewElev());

});


Template.space.events({
	'wheel': function(ev, template) {
		(ev.originalEvent.deltaY > 0) ? template.film.zoomOut() : template.film.zoomIn();
	},
});

function updatePos(film, vhc) {
		vhc.H = Math.round(vhc.H / 15) * 15;
		const posChange = wrapFromTo(film.get('hues.rotateY'), -vhc.H/360*2*Math.PI);
		tween({ ...posChange, duration: 500 })
			.output(v => film.set('hues.rotateY', v))
			.start();
			const startX = film.get('cursor.x'); const endX = getCPos(vhc.C);
			const startY = film.get('cursor.y'); const endY = getVPos(vhc.V);
		tween({ from: startX, to: endX })
			.output(v => film.set('cursor.x', v))
			.start();
		tween({ from: startY, to: endY })
			.output(v => film.set('cursor.y', v))
			.start();
		tween({ from: startY, to: endY })
			.output(v => film.set('cursor.y', v))
			.start();
}
