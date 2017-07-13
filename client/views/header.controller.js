import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
// Accounts.ui.config({
//     dropdownClasses: 'right'
// });


Template.header.onRendered(function () {
	const self = this;
	self.$('.ui.dropdown').dropdown();
});

Template.header.helpers({
	userId() {
		return Meteor.userId;
	},
});

Template.header.events({
	'click .js-sidebar': ev => 	$('.ui.sidebar').sidebar('toggle'),
});
