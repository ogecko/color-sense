import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import numeral from 'numeral';
import * as d3s from 'd3-selection';
import * as d3t from 'd3-transition';
import * as d3c from 'd3-color';
import { maxChromaHcl, isRGBok } from '/imports/color/hcl.js';
import { store } from '/imports/store/index.js';


	const labels = [
			{ name: 'Windsor Yellow', 		r: 229, g: 195, b: 19 },
			{ name: 'New Gamboge', 			r: 243, g: 174, b: 0 },
			{ name: 'Gold Ochre', 			r: 240, g: 115, b: 11 },
			{ name: 'Burnt Umber', 			r: 191, g: 127, b: 27 },
			{ name: 'Burnt Sienna', 		r: 203, g: 69, b: 16 },
			{ name: 'Cadnium Red',			r: 240, g: 50, b: 25 },
			{ name: 'Perylene Maroon',		r: 168, g: 41, b: 33 },
			{ name: 'Quinacridone Magenta',	r: 227, g: 54, b: 136 },
			{ name: 'French Ultramarine',	r: 28, g: 86, b: 248 },
			{ name: 'Windsor Blue',			r: 69, g: 173, b: 238 },
			{ name: 'Cerulean Blue',		r: 49, g: 148, b: 199 },
			{ name: 'W Green BS',			r: 55, g: 187, b: 171 },
			{ name: 'W Green YS',			r: 62, g: 182, b: 132 },
			{ name: 'Paynes Grey',			r: 48, g: 76, b: 100 },
	];


Template.panelForPalette.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

Template.panelForPalette.onRendered(function () {
	const self = this;
	const container = self.$('.js-panelForPalette')[0];

	self.$('.ui.dropdown').dropdown({
		onChange: (text, value, elm) => {
			console.log(text, value, elm);
		},
		allowReselection: true,
	});
});

function hydrateData(labels) {
	return _.map(labels, label => ({
		name: label.name,
		code: 'shortColorCode(label.r, label.g, label.b)',
		hex: 'hexColorCode(label.r, label.g, label.b)',
		rgb: d3c.rgb(label.r, label.g, label.b),
		hcl: d3c.hcl(d3c.rgb(label.r, label.g, label.b)),
	}));
}

Template.panelForPalette.helpers({
	labels: () => hydrateData(labels),
});
