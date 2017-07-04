import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import numeral from 'numeral';
import * as d3s from 'd3-selection';
import * as d3t from 'd3-transition';
import * as d3c from 'd3-color';
import { maxChromaHcl, isRGBok } from '/imports/color/hcl.js';
import { store } from '/imports/store/index.js';

Template.color2.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

function tileValues(rgb) {
	const result = [];
	const rgb1 = d3c.rgb(rgb.r, rgb.g, rgb.b);
	const hcl = d3c.hcl(rgb1);
	const rgb2 = rgb1;
	result.push({ x: 0, y: 1.5, scale: 14, hcl, rgb1, rgb2 });
	_.range(0, 24).forEach(h => {
		const hue = hcl.h + (h - 5) * 360 / 24;
		const max = maxChromaHcl(hue);
		const hcl2 = d3c.hcl(hue, max.c, max.l);
		const rgb1 = d3c.rgb(hcl2);
		const rgb2 = rgb1.darker();
		result.push({ x: h, y: 0, scale: 1, hcl2, rgb1, rgb2 });
	});
	_.range(0, 11).forEach(v => {
		_.range(0, 100, 10).forEach(c => {
			const hcl3 = d3c.hcl(hcl.h, c, v * 10);
			const rgb1 = d3c.rgb(hcl3);
			const rgb2 = rgb1.darker();
			if (isRGBok(rgb1)) result.push({ x: 1+c/10, y: 12-v, scale: 1, hcl3, rgb1, rgb2 });
		});
	});
	return result;
}

Template.color2.onRendered(function () {
	const self = this;
	const container = self.$('.js-color2')[0];

	const svg = d3s.select('.js-color2')
		.append('svg')
		.attr('width', 800)
		.attr('height', 800);

	self.autorun(function() {
		const doc = store.get('rgb');
		if (doc)  {
			const tiles = svg.selectAll('rect')
				.data(tileValues(doc));
			tiles.enter()
				.append('rect')
				.attr('rx', d => 3 / d.scale)
				.attr('ry', d => 3 / d.scale)
				.attr('width', 28)
				.attr('height', 28)
				.style('stroke', '#fff')
				.style('stroke-width', '.2px')
				.attr('transform', d => `translate(${5 * 30},${0 * 30})scale(0.01)`)
			.merge(tiles).transition()
				// .attr('transform', d => `translate(${d.x * 30},${d.y * 30})`)
				.attr('transform', d => `translate(${d.x * 30},${d.y * 30})scale(${d.scale})`)
				.style('fill', d => d.rgb1);
			tiles.exit()
				.remove();

		}

	});
});


Template.color2.helpers({
	hue: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b)).h).format('0');
	},
	value: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b)).l).format('0.0');
	},
	chroma: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b)).c).format('0');
	},
	threshold: function () {
		const doc = store.get('threshold');
		if (doc.isReady)  return numeral(doc.value).format('0');
	},

});


Template.color2.events({
	'click .btnLayered': function(event, template) {
	},
});

