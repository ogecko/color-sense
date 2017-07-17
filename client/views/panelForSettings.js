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
		if (lvl < settings.maskLevel / 10 + 1) return 'primary';
		if (lvl > settings.numEdges / 10 - settings.maskLight / 10 + 1) return 'primary';
		return undefined;
	},
	isShowColors: () => store.get('thresholdSettings').showColors ? 'checked' : undefined,
	isShowSoftEdges: () => store.get('thresholdSettings').showSoftEdges ? 'checked' : undefined,
});

function settingsMutate(mutateFn) {
		let settings = store.get('thresholdSettings');
		settings = mutateFn(settings);
		store.set('thresholdSettings', settings);
}

Template.panelForSettings.events({
	'click .js-onLevelDec': () => settingsMutate(s => {
		s.numEdges = (90 + s.numEdges - 10) % 90;
		return s;
	}),
	'click .js-onLevelInc': () => settingsMutate(s => {
		s.numEdges = (90 + s.numEdges + 10) % 90;
		return s;
	}),
	'click .js-onLevelMid': () => settingsMutate(s => {
		if (s.maskLight === 0 && s.maskLevel === 0) s.numEdges = 0;
		s.maskLight = 0; s.maskLevel = 0;
		return s;
	}),
	'click .js-onMask': (ev) => settingsMutate(s => {
		const lvl = ev.currentTarget.dataset.level*10;
		const darkDelta = lvl - s.maskLevel;
		const lightDelta = +s.numEdges+20 - s.maskLight - lvl;
		if (darkDelta === 0) {
			s.maskLevel = s.maskLevel - 10;			// toggle current setting
		} else if (lightDelta === 0) {
			s.maskLight = s.maskLight - 10;			// toggle current setting
		} else if (darkDelta < lightDelta) {
			s.maskLevel = lvl;						// change dark mask
		} else {
			s.maskLight = +s.numEdges+20 - lvl;		// change light mask
		}
		return s;
	}),
	'click .js-showColors': () => settingsMutate(s => { s.showColors = !s.showColors; return s; }),
	'click .js-showSoftEdges': () => settingsMutate(s => { s.showSoftEdges = !s.showSoftEdges; return s; }),
});

