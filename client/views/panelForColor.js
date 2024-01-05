import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { Keypress } from 'meteor/keypress:keypress';
import numeral from 'numeral';
import * as d3s from 'd3-selection';
import * as d3sc from 'd3-scale';
import * as d3f from 'd3-force';
import { store } from '/imports/store/index.js';
import { srgb_to_xyz, xyz_to_JuMuHu, hex_to_srgb, parse_colors, JuMuHu_to_label, JuMuHu_to_color } from 'color-cam16/dist/index.js';
import { colorNames } from 'color-cam16/dist/color-names';


d3s.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

Template.panelForColor.onCreated(function() {
	const self = this;
	store.subscribe(self);
	self.keyboard = new Keypress.Listener();	// ensure this is destroyed on template removal
});

Template.sketch.onDestroyed(function() {
	const self = this;
	self.keyboard.destroy();
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

function rainbowColors(rgb) {
	const JuMuHu = rgb_to_JuMuHu(rgb)
	const colors = parse_colors(`rainbow in 52 steps`)
		.map(x => ({ ...x, newhex: JuMuHu_to_color({Ju: JuMuHu.Ju, Mu: JuMuHu.Mu>5?JuMuHu.Mu:5, Hu: x.Hu}).hex }))
	return colors;
}

function markerColors(rgb) {
	const start = rgb_to_label(rgb, false);
	const colors = parse_colors(`${start} contrast by 50 in 2 steps`)
	return colors;
}


Template.panelForColor.onRendered(function () {
	const self = this;
	const size = 20;
	const height = 295;
	const width = self.$('.js-colortitle')[0].clientWidth;
	const container = self.$('.js-panelForColor')[0];

	const svg = d3s.select('.js-panelForColor')
		.append('svg')
		.attr('width', width)
		.attr('height', height);


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
	const x = d3sc.scaleLinear().domain([0, 50]).range([width-11*size + size*0.25, width-size*0.25])
	const y = d3sc.scaleLinear().domain([0, 100]).range([size*11, size])

	self.autorun(function() {
		const doc = store.get('rgb');
		if (doc.isReady)  {
			const [markerColor, markerText] = markerColors(doc)
			const JuMuHu = rgb_to_JuMuHu(doc)
			console.log(markerColor)

			d3s.selectAll('.js-colortitle').style('background-color', markerColor.hex);
			d3s.selectAll('.js-colortitle .ui.header').style('color', markerText.hex);

			const tiles = svg.selectAll('.huetile')
				.data(tileColors(doc));
			tiles.enter()
				.append('rect')
				.attr('class', 'huetile')
				.attr('cursor', 'pointer')
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
				.attr('cursor', 'pointer')
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

			const rainbow = svg.selectAll('.rainbowtile')
				.data(rainbowColors(doc));
			rainbow.enter()
				.append('rect')
				.attr('class', 'rainbowtile')
				.attr('cursor', 'pointer')
				.attr('rx', 3)
				.attr('ry', 3)
				.attr('width', size-2)
				.attr('height', size-2)
				.on('click', d => store.set('rgb', hex_to_rgb(d.newhex)))
			.merge(rainbow).transition()
				.attr('transform', d => `translate(${ ((d.Hu-JuMuHu.Hu)/6.923076923-0.4)*size+width/2 },${ height-15-size })`)
				.style('fill', d => d.hex);
			rainbow.exit()
				.remove();

			// Append rainbow pointer
			const xpos = width/2
			const rainbowptr = svg.append("polygon")
				.attr('points', `${xpos-15},${height-5} ${xpos},${height-15} ${xpos+15},${height-5}`)
				.attr('class', 'rainbowptr')
				.style('fill', '#e0e0e0');
		}

	});

	self.autorun(function() {
		const doc = store.get('thresholdSettings');
		if (doc.isReady)  {
			if (!doc.nodes) doc.nodes = [0,0,10,25,50,75,85,100,100];
			const nodes = doc.nodes.map((d,i)=>({ 
				i:i, 
				Ju: d,  
				isTarget: i % 2,
				isMasked: (i % 2) & doc.maskLevels[Math.floor(i/2)+1],
				isSelected: i==doc.idxSelected
			}));

			// layout the tree nodes
			const simulation = d3f.forceSimulation(nodes)
				.force("collide",d3f.forceCollide(12))
				.force("forceX",d3f.forceX((d,i) => (d.isTarget ? 20 : x(0)-28)).strength(1))
				.force("forceY",d3f.forceY((d) => (y(d.Ju)+size/2)).strength(0.5))
				.stop();
			
			// Run the simulation to its end, then draw.
			simulation.tick(20);

			const treetxt = svg.selectAll('.treetxt')
				.data(nodes);
			treetxt.enter()
				.append("text")
				.attr("class", "treetxt")
				.attr('cursor', 'pointer')
				.attr("alignment-baseline","middle")
				.attr("text-anchor","middle")
				.on('click', d => store.mutate('thresholdSettings', s => {
					s.idxSelected = d.i; 
					s.levelSelected = Math.floor(d.i / 2)+1;
					if (s.levelSelected > s.numLevels) s.levelSelected = s.numLevels
					return s
				}))
			.merge(treetxt).transition()
				.style("fill", d => (d.isSelected ? "#2185d0" : "black" ))
				.attr("x", d => d.x).attr("y", d => d.y)
				.text(d => d.Ju)
			treetxt.exit()
				.remove();

			const treelines = svg.selectAll('.treelines')
				.data(nodes);
			treelines.enter()
				.append("polyline")
				.attr("class", "treelines")
				.attr("stroke","black")
				.style("stroke-width", '.5px')
			.merge(treelines).transition()
				.attr("points", d => (d.isTarget ? 
						// arrow pointing to Output Tone Target
						`${nodes[d.i-1].x-15},${nodes[d.i-1].y} 
						${nodes[d.i+0].x+15},${nodes[d.i+0].y} 
						${nodes[d.i+1].x-15},${nodes[d.i+1].y} 
						${nodes[d.i+0].x+30},${nodes[d.i+0].y>nodes[d.i-1].y? nodes[d.i-1].y : nodes[d.i+0].y<nodes[d.i+1].y? nodes[d.i+1].y : nodes[d.i+0].y} 
						${nodes[d.i-1].x-15},${nodes[d.i-1].y}`
					: 
						// simple line pointing to threshold Tone
						`${nodes[d.i+0].x+15},${nodes[d.i+0].y} 
						${x(0)},${y(d.Ju)+size/2}`))
				.attr("fill", d => (d.isMasked ? "#2185d0" : "gray"))
			treelines.exit()
				.remove();
								 
		}
			
	});

	
	self.keyboard.simple_combo(']', ev => store.mutate('thresholdSettings', s => { 
		const i = s.idxSelected;
		if (s.nodes[i]<100) s.nodes[i]++
		return s; 
	}));
	self.keyboard.simple_combo('[', ev => store.mutate('thresholdSettings', s => { 
		const i = s.idxSelected;
		if (s.nodes[i]>0) s.nodes[i]--
		return s; 
	}));


});


Template.panelForColor.helpers({
	colorCode: function() {
		const doc = store.get('rgb');
		if (doc.isReady)  return rgb_to_label(doc);
	},
	colorName: function() {
		const doc = store.get('rgb');
		if (doc.isReady)  {
			const label=rgb_to_label(doc);
			return colorNames[label] || 'Unknown';
		}
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

