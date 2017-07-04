import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
// Accounts.ui.config({
//     dropdownClasses: 'right'
// });

Template.header.helpers({
	userId() {
		return Meteor.userId;
	},
});

