import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { store } from '/imports/store/index.js';
import { changeValue } from '/imports/store/changeValue.js';
import { isArray } from 'util';

Template.panelForSettings.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

Template.panelForSettings.onRendered(function () {
	const self = this;
	self.$('.ui.checkbox').checkbox();
	self.$('.ui.dropdown').dropdown();
});

Template.panelForSettings.helpers({
	numLevels: () => { const n = store.get('thresholdSettings').numLevels; return n == 0 ? 'All' : n},
	isLevels: () => store.get('thresholdSettings').numLevels > 0,
	levels: () => { const n = store.get('thresholdSettings').numLevels; return _.range(1, n ? n + 1 : []) },
	maxRange: () => { const d = store.get('thresholdSettings'); return Number(d.nodes[d.levelSelected*2].toFixed(1)) },
	outputTone: () => { const d = store.get('thresholdSettings'); return Number(d.nodes[d.levelSelected*2-1].toFixed(1)) },
	minRange: () => { const d = store.get('thresholdSettings'); return Number(d.nodes[d.levelSelected*2-2].toFixed(1)) },
	opacities: () => _.range(0, 101, 20),
	isOpacity: (lvl) => { const n = store.get('thresholdSettings').opacity; return n==lvl ? 'primary' : undefined},
	isActiveLevel: (lvl) => { return (lvl==store.get('thresholdSettings').levelSelected)? 'active': undefined },
	isActiveMaxRange: () => { const d = store.get('thresholdSettings'); return (d.levelSelected*2 == d.idxSelected)? 'blue': undefined },
	isActiveOutputTone: () => { const d = store.get('thresholdSettings'); return (d.levelSelected*2-1 == d.idxSelected)? 'blue': undefined },
	isActiveMinRange: () => { const d = store.get('thresholdSettings'); return (d.levelSelected*2-2 == d.idxSelected)? 'blue': undefined },
	isLevelMasked: () => { const s = store.get('thresholdSettings'); return s.maskLevels[s.levelSelected] ? 'checked' : undefined},
	isShowColors: () => store.get('thresholdSettings').showColors ? 'checked' : undefined,
	isqHue: () => store.get('thresholdSettings').qHue ? 'checked' : undefined,
	isqChroma: () => store.get('thresholdSettings').qChroma ? 'checked' : undefined,
	isShowEdges: () => store.get('thresholdSettings').showEdges ? 'checked' : undefined,
	isMaxContrast: () => store.get('thresholdSettings').maxContrast ? 'checked' : undefined,
});

function defaultNodes(levels) {
	const defaultValues = [
		[],									 				//0			
		[20, 50, 80],										//1
		[0, 25, 50, 75, 100],								//2
		[0, 0, 15, 50, 85, 100, 100],						//3
		[0, 0, 10, 25, 50, 75, 90, 100, 100],				//4
		[0, 0, 10, 20, 33, 50, 66, 80, 90, 100, 100],		//5
		[0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100],	//6
		[0, 0, 8, 17, 25, 33, 42, 50, 58, 67, 75, 83, 92, 100, 100],	//7
		[0, 0, 7, 14, 21, 29, 36, 43, 50, 57, 64, 71, 79, 86, 93, 100, 100],	//8
	]
	const i = Math.min(Math.max(levels, 0), defaultValues.length-1);
	return { 
		numLevels: i, 
		nodes: defaultValues[i]
	}
}

Template.panelForSettings.events({
	'click .js-onNumLevelsDX': (ev) => store.mutate('thresholdSettings', s => {
		d = defaultNodes(s.numLevels + ev.currentTarget.dataset.dx*1)
		s.numLevels = d.numLevels;
		s.nodes = d.nodes;
		s.levelSelected = 1;
		s.idxSelected = undefined;
		return s;
	}),
	'click .js-onLevelMid': () => store.mutate('thresholdSettings', s => {
		if (isArray(s.maskLevels) && !s.maskLevels.some(d => d==true)) {
			s.numEdges = 0;
			d = defaultNodes(0)
			s.numLevels = d.numLevels;
			s.nodes = d.nodes;
			s.levelSelected = 1;
			s.idxSelected = undefined;
		}
		s.maskLevels = [];
		s.idxSelected = undefined;
		return s;
	}),
	'click .js-onLevelTab': (ev) => store.mutate('thresholdSettings', s => {
		s.levelSelected = ev.currentTarget.dataset.level*1;
		s.idxSelected = undefined;
		return s;
	}),
	'click .js-onMaxRangeDX': (ev) => store.mutate('thresholdSettings', s => {
		s.idxSelected = s.levelSelected*2
		s.nodes[s.idxSelected] = changeValue(s.nodes[s.idxSelected], ev.currentTarget.dataset.dx);
		return s;
	}),
	'click .js-onOutputToneDX': (ev) => store.mutate('thresholdSettings', s => {
		s.idxSelected = s.levelSelected*2-1
		s.nodes[s.idxSelected] = changeValue(s.nodes[s.idxSelected], ev.currentTarget.dataset.dx);
		return s;
	}),
	'click .js-onMinRangeDX': (ev) => store.mutate('thresholdSettings', s => {
		s.idxSelected = s.levelSelected*2-2
		s.nodes[s.idxSelected] = changeValue(s.nodes[s.idxSelected], ev.currentTarget.dataset.dx);
		return s;
	}),

	'click .js-onOpacity': (ev) => store.mutate('thresholdSettings', s => {
		s.opacity = ev.currentTarget.dataset.level*1;	// ensure number not string
		return s;
	}),
	'click .js-maskLevel': (ev) => store.mutate('thresholdSettings', s => {
		if (!s.maskLevels) s.maskLevels = []
		s.maskLevels[s.levelSelected] = !s.maskLevels[s.levelSelected]
		return s;
	}),
	'click .js-showColors': () => store.mutate('thresholdSettings', s => { s.showColors = !s.showColors; return s; }),
	'click .js-showEdges': () => store.mutate('thresholdSettings', s => { s.showEdges = !s.showEdges; return s; }),
	'click .js-qHue': () => store.mutate('thresholdSettings', s => { s.qHue = !s.qHue; return s; }),
	'click .js-qChroma': () => store.mutate('thresholdSettings', s => { s.qChroma = !s.qChroma; return s; }),
	'click .js-maxContrast': () => store.mutate('thresholdSettings', s => { s.maxContrast = !s.maxContrast; return s; }),
});

