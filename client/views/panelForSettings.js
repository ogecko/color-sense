import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { store } from '/imports/store/index.js';


Template.panelForSettings.onCreated(function() {
	const self = this;
	store.subscribe(self);
});

function onFormChangesSetStore(self, formSelector, storeId) {
	// NOTE to have a Form "get values" and "set values" working compitibly
	// need FIX to lines 561 and 579 semantic-ui/definitions/behaviours/form.js
	// to get values[name].push(true) rather then 'on'.

	// Initialise form with any values from the store (and when they change)
	self.autorun(() => {
		const doc = store.get(storeId);
		if (doc && doc.isReady) {
			self.$(formSelector).form('set values', _.omit(doc, ['_id', 'isReady']));
		}
	});

	// Update the store whenever any field is changed
	self.$(`${formSelector} .ui.checkbox`).checkbox({
		onChange: () => store.set(storeId, self.$(formSelector).form('get values')),
	});
	self.$(`${formSelector} .ui.dropdown`).dropdown({
		onChange: () => store.set(storeId, self.$(formSelector).form('get values')),
	});

}

Template.panelForSettings.onRendered(function () {
	const self = this;

	// Link each form to the store
	onFormChangesSetStore(self, '.ui.threshold.form', 'thresholdSettings');
	onFormChangesSetStore(self, '.ui.view.form', 'viewSettings');
});


