import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

export const store = {
	// Subscribe the client template to all changes in the server's store. CLIENT ONLY.
	// Note. Automatically stops the subscription when template destroyed.
	subscribe: (template) => (store._subscription = template.subscribe('store')),

	// Store the object under the id key in the servers mongo database.
	// Note. This call will replace the currently stored object completely
	set: (id, obj) => Meteor.call('store.set', id, obj),

	// Retrieve the object under the id key. A reactive data source.
	// Note. Since this is reactive it will cause autorun to rerun when data is changed.
	// Note. The following keys are added to the doc
	// 			isReady: True if the server has marked the subscription as ready.
	// 			_id: The id of the document (if one is found)
	get: (id) => _.extend(
		{ isReady: store._subscription.ready() },
		store._collection.findOne({ _id: id })
	),

	mutate: (id, mutateFn) => {
		let settings = store.get(id);
		settings = mutateFn(settings);
		store.set(id, settings);
	},

	// private properties
	_collection: new Mongo.Collection('store'),
	_publication: (Meteor.isServer) && Meteor.publish('store', () => store._collection.find({})),
	_subscription: undefined,
	_methods: Meteor.methods({
		'store.set': (id, obj) => store._collection.upsert({ _id: id }, obj),
	}),
};

