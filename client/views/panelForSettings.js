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
	numLevels: () => { const n = store.get('thresholdSettings').numEdges / 10 + 1; return n == 1 ? 'All' : n},
	isLevels: () => store.get('thresholdSettings').numEdges > 0,
	levels: () => _.range(1, store.get('thresholdSettings').numEdges / 10 + 2),
	isMasked: (lvl) => {
		const settings = store.get('thresholdSettings');
		if (lvl < settings.maskDark / 10 + 1) return 'primary';
		if (lvl > settings.numEdges / 10 - settings.maskLight / 10 + 1) return 'primary';
		return undefined;
	},
	isShowColors: () => store.get('thresholdSettings').showColors ? 'checked' : undefined,
	isShowSoftEdges: () => store.get('thresholdSettings').showSoftEdges ? 'checked' : undefined,
	isMaxContrast: () => store.get('thresholdSettings').maxContrast ? 'checked' : undefined,
});


Template.panelForSettings.events({
	'click .js-onLevelDec': () => store.mutate('thresholdSettings', s => {
		s.numEdges = (90 + s.numEdges - 10) % 90;
		return s;
	}),
	'click .js-onLevelInc': () => store.mutate('thresholdSettings', s => {
		s.numEdges = (90 + s.numEdges + 10) % 90;
		return s;
	}),
	'click .js-onLevelMid': () => store.mutate('thresholdSettings', s => {
		if (s.maskLight === 0 && s.maskDark === 0) s.numEdges = 0;
		s.maskLight = 0; s.maskDark = 0;
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
	'click .js-showSoftEdges': () => store.mutate('thresholdSettings', s => { s.showSoftEdges = !s.showSoftEdges; return s; }),
	'click .js-maxContrast': () => store.mutate('thresholdSettings', s => { s.maxContrast = !s.maxContrast; return s; }),
});

