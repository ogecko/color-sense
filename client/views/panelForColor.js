import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import numeral from 'numeral';
import * as d3s from 'd3-selection';
import * as d3t from 'd3-transition';
import * as d3c from 'd3-color';
import * as d3sc from 'd3-scale';
import { maxChromaHcl, isRGBok } from '/imports/color/hcl.js';
import { shortColorCode } from '/imports/color/shortColorCode.js';
import { ciecam02 } from '/imports/color/ciecam02.js';
import { store } from '/imports/store/index.js';
import { srgb_to_xyz, xyz_to_JuMuHu, hex_to_srgb, parse_colors, JuMuHu_to_label } from 'color-cam16/dist/index.js';


d3s.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

Template.panelForColor.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

function hex_to_rgb(hex) {
	const rgb = hex_to_srgb(hex)
	return { r: rgb[0]*255, g: rgb[1]*255, b: rgb[2]*255 }
}

function rgb_to_JuMuHu(rgb) {
	const xyz = srgb_to_xyz([rgb.r/255,rgb.g/255,rgb.b/255]);
	const JuMuHu = xyz_to_JuMuHu(xyz);
	return JuMuHu;
}

function rgb_to_label(rgb, bHueOnly=false) {
	const JuMuHu = rgb_to_JuMuHu(rgb);
	if (bHueOnly) { JuMuHu.Ju=0; JuMuHu.Mu=0 }
	const label = JuMuHu_to_label(JuMuHu)
	return label;
}

function tileColors(rgb) {
	const start = rgb_to_label(rgb, true);
	const colors = parse_colors(`${start} lighter to 100 in 11 steps, stronger to 50 in 11 steps`).filter(x => x.inGamut)
	return colors;
}

function markerColors(rgb) {
	const start = rgb_to_label(rgb, false);
	const colors = parse_colors(`${start} contrast by 50 in 2 steps`)
	return colors;
}

Template.panelForColor.onRendered(function () {
	const self = this;
	const container = self.$('.js-panelForColor')[0];
	const size = 20;

	const svg = d3s.select('.js-panelForColor')
		.append('svg')
		.attr('width', 230)
		.attr('height', 250);

	// Define LinearGradient fill style 
	const defs = svg.append("defs");
	const gradient = defs.append("linearGradient")
		.attr("id", "gradient")
		.attr("x1", "0%").attr("y1", "0%")
		.attr("x2", "0%").attr("y2", "100%")
		.attr("spreadMethod", "pad");
	gradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", "#D0D0D0");
	gradient.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", "#303030");

	// Append background with linear gradient fill
	const bkgr = svg.append("rect")
		.attr('class', 'bkgrtile')
		.attr('width', '100%')
		.attr('height', '100%')
		.style('fill', 'url(#gradient)');

	// Define scales for mapping Ju to y and Mu to x
	const x = d3sc.scaleLinear().domain([0, 50]).range([size*0.25, size*11])
	const y = d3sc.scaleLinear().domain([0, 100]).range([size*11, size*0.25])

	self.autorun(function() {
		const doc = store.get('rgb');
		if (doc.isReady)  {
			const [markerColor, markerText] = markerColors(doc)

			d3s.selectAll('.js-colortitle').style('background-color', markerColor.hex);
			d3s.selectAll('.js-colortitle .ui.header').style('color', markerText.hex);

			const tiles = svg.selectAll('.huetile')
				.data(tileColors(doc));
			tiles.enter()
				.append('rect')
				.attr('class', 'huetile')
				.attr('rx', 3)
				.attr('ry', 3)
				.attr('width', size-2)
				.attr('height', size-2)
				.on('click', d => store.set('rgb', hex_to_rgb(d.hex)))
			.merge(tiles).transition()
				.attr('transform', d => `translate(${ x(d.Mu) },${ y(d.Ju) })`)
				.style('fill', d => d.hex);
			tiles.exit()
				.remove();

			const marker = svg.selectAll('.huemarker')
				.data([markerColor]);
			marker.enter()
				.append('rect')
				.attr('class', 'huemarker')
				.attr('rx', 10)
				.attr('ry', 10)
				.attr('width', size+2)
				.attr('height', size+2)
				.style('stroke-width', '3px')
			.merge(marker).transition()
				.style('stroke', markerText.hex)
				.attr('transform', d => `translate(${ x(d.Mu) },${ y(d.Ju) })`)
				.style('fill', d => d.hex);
			marker.moveToFront();

		}
	});

});


Template.panelForColor.helpers({
	colorCode: function() {
		const doc = store.get('rgb');
		if (doc.isReady)  return shortColorCode(doc.r, doc.g, doc.b);
	},
	hue: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(rgb_to_JuMuHu(doc).Hu).format('0');
	},
	value: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(rgb_to_JuMuHu(doc).Ju).format('0');
	},
	chroma: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(rgb_to_JuMuHu(doc).Mu*2).format('0');
	},
	threshold: function () {
		const doc = store.get('threshold');
		if (doc.isReady)  return numeral(doc.value).format('0');
	},

});


Template.panelForColor.events({
	'click .btnLayered': function(event, template) {
	},
});

