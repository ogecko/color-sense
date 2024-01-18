import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { store } from '/imports/store/index.js';

Template.header.onCreated(function() {
	const self = this;
	store.subscribe(self);
});


Template.header.onRendered(function () {
	const self = this;
	self.$('.ui.dropdown').dropdown();
});

Template.header.helpers({
	isLocked: () => store.get('viewSettings').lockView ? 'lock' : 'unlock',
	isProjector: () => store.get('viewSettings').projectorView ? 'video' : 'tv',
	userId() {
		return Meteor.userId;
	},
});

Template.header.events({
	'click .js-sidebar': ev => 	$('.ui.sidebar').sidebar('toggle'),
	'click .js-lock': () => store.mutate('viewSettings', s => {
		s.lockView = !s.lockView;
		return s;
	}),
	'click .js-projector': () => store.mutate('viewSettings', s => {
		s.projectorView = !s.projectorView;
		return s;
	}),
	'click .js-saveImage': () => store.mutate('viewSettings', s => {
		s.saveImage = !s.saveImage;
		return s;
	}),
	'click .js-zoom': (ev) => store.mutate('viewSettings', s => {
		s.zoomLevel = +ev.currentTarget.dataset.zoomlevel;
		return s;
	}),
});
