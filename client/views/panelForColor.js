import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import numeral from 'numeral';
import * as d3s from 'd3-selection';
import * as d3t from 'd3-transition';
import * as d3c from 'd3-color';
import { maxChromaHcl, isRGBok } from '/imports/color/hcl.js';
import { store } from '/imports/store/index.js';

d3s.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

Template.panelForColor.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

function tileValues(rgb) {
	const result = [];
	const rgb1 = d3c.rgb(rgb.r, rgb.g, rgb.b);
	const hcl = d3c.hcl(rgb1);
	const rgb2 = rgb1;
	result.push({ x: 0, y: 0, scale: 13.5, hcl, rgb1, rgb2 });
	// _.range(0, 24, 2).forEach(h => {
	// 	const hue = hcl.h + (h - 5) * 360 / 24;
	// 	const max = maxChromaHcl(hue);
	// 	const hcl2 = d3c.hcl(hue, max.c, max.l);
	// 	const rgb1 = d3c.rgb(hcl2);
	// 	const rgb2 = rgb1.darker();
	// 	result.push({ x: h / 2, y: 0, scale: 1, hcl2, rgb1, rgb2 });
	// });
	_.range(0, 11).forEach(v => {
		_.range(0, 100, 10).forEach(c => {
			const hcl3 = d3c.hcl(hcl.h, c, v * 10);
			const rgb1 = d3c.rgb(hcl3);
			const rgb2 = rgb1.darker();
			if (isRGBok(rgb1)) result.push({ x: 1+c/10, y: 10.5-v, scale: 1, hcl3, rgb1, rgb2 });
		});
	});
	return result;
}

Template.panelForColor.onRendered(function () {
	const self = this;
	const container = self.$('.js-panelForColor')[0];
	const size = 20;

	const svg = d3s.select('.js-panelForColor')
		.append('svg')
		.attr('width', 230)
		.attr('height', 240);

	const defs = svg.append("defs");
	const gradient = defs.append("linearGradient")
		.attr("id", "gradient")
		.attr("x1", "0%").attr("y1", "0%")
		.attr("x2", "0%").attr("y2", "100%")
		.attr("spreadMethod", "pad");

	gradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", "#F0F0F0");

	gradient.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", "#303030");


	// const filter = defs.append("filter")
	// 	.attr("id", "shadowFilter")
	// 	.attr("x", "0").attr("y", "0")
	// 	.attr("width", "200%").attr("height", "200%")

	// filter.append("feOffset")
	// 	.attr("result", "offOut")
	// 	.attr("in", "SourceAlpha")
	// 	.attr("dx", "5")
	// 	.attr("dy", "5");

	// filter.append("feGaussianBlur")
	// 	.attr("result", "blurOut")
	// 	.attr("in", "offOut")
	// 	.attr("stdDeviation", "5");

	// filter.append("feBlend")
	// 	.attr("in", "SourceGraphic")
	// 	.attr("in2", "blurOut")
	// 	.attr("mode", "normal");

	self.autorun(function() {
		const doc = store.get('rgb');
		if (doc.isReady)  {
			console.log(doc);
			const c0 = d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b));
			const c1 = (d3c.hcl(c0).l > 40) ? c0.darker(4) : c0.brighter(4);

			d3s.selectAll('.js-colortitle').style('background-color', c0);
			d3s.selectAll('.js-colortitle .ui.header').style('color', c1);

			const tiles = svg.selectAll('.huetile')
				.data(tileValues(doc));
			tiles.enter()
				.append('rect')
				.attr('class', 'huetile')
				.attr('rx', d => 3 / d.scale)
				.attr('ry', d => 3 / d.scale)
				.attr('width', size-2)
				.attr('height', size-2)
				// .style('stroke', '#fff')
				// .style('stroke-width', '.2px')
				.attr('transform', d => `translate(${5 * size},${0 * size})scale(0.01)`)
				.on('click', d => store.set('rgb', d.rgb1))
			.merge(tiles).transition()
				// .attr('transform', d => `translate(${d.x * size},${d.y * size})`)
				.attr('transform', d => `translate(${d.x * size},${d.y * size})scale(${d.scale})`)
				.style('fill', d => ((d.scale>5) ? 'url(#gradient)' : d.rgb1));
			tiles.exit()
				.remove();

			const marker = svg.selectAll('.huemarker')
				.data([c0]);
			marker.enter()
				.append('circle')
				.attr('class', 'huemarker')
				.attr('r', size/2 + 5)
				.style('stroke', '#fff')
				.style('stroke-width', '.5px')
			.merge(marker).transition()
				.attr('transform', d => `translate(${(d.c + 15) / 10 * size - 1},${(110 - d.l) / 10 * size - 1})`)
				.style('fill', d => d);
			marker.moveToFront();


		}

	});
});


Template.panelForColor.helpers({
	colorCode: function() {
		const doc = store.get('rgb');
		if (doc.isReady)  {
			const c0 = d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b));
			const v = numeral(c0.l/10).format('0');
			const c = numeral(c0.c/10).format('0');
			const h = String.fromCharCode(65 + c0.h / 360 * 24);
			return ''+v+h+c;
		}
	},
	hue: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b)).h).format('0');
	},
	value: function () {
		const doc = store.get('rgb');
		if (doc.isReady)  return numeral(d3c.hcl(d3c.rgb(doc.r, doc.g, doc.b)).l).format('0');
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


Template.panelForColor.events({
	'click .btnLayered': function(event, template) {
	},
});

