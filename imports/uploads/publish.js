import { Meteor } from 'meteor/meteor';
import { uploads } from './model.js';

if (Meteor.isServer) {
	Meteor.publish('uploads', () => uploads.find({
		'metadata._Resumable': { $exists: false },
	}));
}
