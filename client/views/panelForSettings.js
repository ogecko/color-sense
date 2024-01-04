import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { store } from '/imports/store/index.js';

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
	opacities: () => _.range(0, 101, 20),
	isOpacity: (lvl) => { const n = store.get('thresholdSettings').opacity; return n==lvl ? 'primary' : undefined},
	isActiveLevel: (lvl) => { return (lvl==1)? 'active': undefined },
	isMasked: (lvl) => {
		const settings = store.get('thresholdSettings');
		if (lvl < settings.maskDark / 10 + 1) return 'primary';
		if (lvl > settings.numLevels - settings.maskLight / 10 + 1) return 'primary';
		return undefined;
	},
	isShowColors: () => store.get('thresholdSettings').showColors ? 'checked' : undefined,
	isShowSoftEdges: () => store.get('thresholdSettings').showSoftEdges ? 'checked' : undefined,
	isMaxContrast: () => store.get('thresholdSettings').maxContrast ? 'checked' : undefined,
});

function defaultNodes(levels) {
	const defaultValues = [
		[],									 				//0			
		[15, 50, 85],										//1
		[15, 25, 50, 75, 85],								//2
		[0, 0, 15, 50, 85, 100, 100],						//3
		[0, 0, 10, 25, 50, 75, 90, 100, 100],				//4
		[0, 0, 10, 20, 33, 50, 66, 80, 90, 100, 100],		//5
		[0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100],	//6
	]
	const i = Math.min(Math.max(levels, 0), defaultValues.length-1);
	return { 
		numLevels: i, 
		nodes: defaultValues[i]
	}
}

Template.panelForSettings.events({
	'click .js-onLevelDec': () => store.mutate('thresholdSettings', s => {
		s.numEdges = (90 + s.numEdges - 10) % 90;
		d = defaultNodes(s.numLevels-1)
		s.numLevels = d.numLevels;
		s.nodes = d.nodes;
		return s;
	}),
	'click .js-onLevelInc': () => store.mutate('thresholdSettings', s => {
		s.numEdges = (90 + s.numEdges + 10) % 90;
		d = defaultNodes(s.numLevels+1)
		s.numLevels = d.numLevels;
		s.nodes = d.nodes;
		return s;
	}),
	'click .js-onLevelMid': () => store.mutate('thresholdSettings', s => {
		if (s.maskLight === 0 && s.maskDark === 0) {
			s.numEdges = 0;
			d = defaultNodes(0)
			s.numLevels = d.numLevels;
			s.nodes = d.nodes;
		}
		s.maskLight = 0; s.maskDark = 0;
		return s;
	}),
	'click .js-onOpacity': (ev) => store.mutate('thresholdSettings', s => {
		s.opacity = ev.currentTarget.dataset.level*1;	// ensure number not string
		return s;
	}),
	'click .js-onMask': (ev) => store.mutate('thresholdSettings', s => {
		const lvl = ev.currentTarget.dataset.level*10;
		const darkDelta = lvl - s.maskDark;
		const lightDelta = +s.numEdges+20 - s.maskLight - lvl;
		if (darkDelta === 0) {
			s.maskDark = s.maskDark - 10;			// toggle current setting
		} else if (lightDelta === 0) {
			s.maskLight = s.maskLight - 10;			// toggle current setting
		} else if (darkDelta < lightDelta) {
			s.maskDark = lvl;						// change dark mask
		} else {
			s.maskLight = +s.numEdges+20 - lvl;		// change light mask
		}
		return s;
	}),
	'click .js-showColors': () => store.mutate('thresholdSettings', s => { s.showColors = !s.showColors; return s; }),
	'click .js-maxContrast': () => store.mutate('thresholdSettings', s => { s.maxContrast = !s.maxContrast; return s; }),
	// 'click .js-showSoftEdges': () => store.mutate('thresholdSettings', s => { s.showSoftEdges = !s.showSoftEdges; return s; }),
	'click .js-showSoftEdges': () => {
		store.set('thresholdSettings', { });
	},
});

