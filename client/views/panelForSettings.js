import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { store } from '/imports/store/index.js';


Template.panelForSettings.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

Template.panelForSettings.onRendered(function () {
	const self = this;

	// NOTE to have a Form "get values" and "set values" working compitibly
	// need FIX to lines 561 and 579 semantic-ui/definitions/behaviours/form.js
	// to get values[name].push(true) rather then 'on'.

	// Initialise Semantic UI checkboxes and dropdowns
	self.$('.ui.checkbox').checkbox({
		onChange: () => store.set('settings', self.$('.ui.form').form('get values')),
	});
	self.$('.ui.dropdown').dropdown({
		onChange: () => store.set('settings', self.$('.ui.form').form('get values')),
	});

	// load data for the form whenever it changes in the store
	self.autorun(() => {
		const doc = store.get('settings');
		if (doc && doc.isReady) {
			self.$('.ui.form').form('set values', _.omit(doc, ['_id', 'isReady']));
		}
	});
});


