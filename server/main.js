import { Meteor } from 'meteor/meteor';
import moment from 'moment';
import '/imports/uploads/index.server.js';
import '/imports/store/index.js';

Meteor.startup(() => {
	// code to run on server at startup
	console.log('___________________SERVER RESTARTED_____________________ ');
	console.log('=> Timestamp: ', moment().format('dddd, MMMM Do YYYY, h:mm:ss a'));
	console.log('=> Mongo Database URL: '+JSON.stringify(process.env.MONGO_URL));
	console.log('=> Mongo OPLog URL: '+JSON.stringify(process.env.MONGO_OPLOG_URL));
	console.log('=> Meteor Shell dir: '+JSON.stringify(process.env.METEOR_SHELL_DIR));

});
