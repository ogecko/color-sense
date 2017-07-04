import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import uploads from '/imports/uploads/index.client.js';
import numeral from 'numeral';
import moment from 'moment';

const VALID_TYPES = {
	'image/jpeg': true,
	'image/png': true,
	'image/bmp': true,
	'image/gif': true,
	'image/tiff': true,
};

function isValidFileType(type) {
	return VALID_TYPES[type];
}

const UPLOAD_MESSAGE = 'uploadMessage';

function clearUploadMessage() {
	Session.set(UPLOAD_MESSAGE, undefined);
}

function setUploadMessage(msg) {
	Session.set(UPLOAD_MESSAGE, msg);
}

Template.files.onCreated(function() {
	var self = this;
	clearUploadMessage();
	self.autorun(function() {
		self.subscribe('uploads');
	});
});

Template.files.onRendered(function () {
	const self = this;

	Template.files.initializeEventHandlers();

	// Define what to do when a user selects or drops a file
	uploads.resumable.on('fileAdded', file => {
		clearUploadMessage();	// clear message
		Session.set(file.uniqueIdentifier, 0);		// set progress to 0
		if (!isValidFileType(file.file.type)) {
			setUploadMessage(`Invalid file type: ${file.file.type}.`);
			return;
		}
		uploads.insert({
			_id: file.uniqueIdentifier,
			filename: file.fileName,
			contentType: file.file.type,
			contentSize: file.size,
			lastModified: file.file.lastModified,
		}, (err, _id) => {
			if (err) { console.log(err); return; }
			uploads.resumable.upload();
		});
	});

	uploads.resumable.on('fileProgress', file => {
		Session.set(file.uniqueIdentifier, Math.floor(100 * file.progress()));
	});

	uploads.resumable.on('fileSuccess', file => {
		Session.set(file.uniqueIdentifier, undefined);
		// uploads.update({ _id: file.uniqueIdentifier },
		// 	{ $set: { 'metadata.srcImage': 'xx' } });
	});
});

function shortenFilename(n, len = 16) {
	if (!n.length) return '(no filename)';
	const ext = n.substring(n.lastIndexOf('.') + 1, n.length).toLowerCase();
	const filename = n.replace('.' + ext, '');
	if (filename.length <= len) {
		return n;
	}
	return filename.substr(0, len) + (n.length > len ? '..' : '') + '.' + ext;
}

Template.files.helpers({
	uploads: () => uploads.find({}),
	id: upload => `${upload._id}`,
	md5: upload => `${upload.md5}`,
	link: upload => `${uploads.baseURL}/md5/${upload.md5}`,
	when: upload => moment(upload.uploadDate).fromNow(),
	size: upload => (upload.length>0) ? numeral(upload.length).format('0.0b') : undefined,
	shortFilename: upload => shortenFilename(upload.filename, 64),
	progress: upload => {
		const percent = Session.get(`${upload._id}`); 
		Template.instance().$(`.ui.progress#${upload._id}`).progress({ percent });
		return percent ? `${percent}%` : undefined;
	},
	uploadMessage: () => Session.get(UPLOAD_MESSAGE),
	isUploadMessage: () => Session.get(UPLOAD_MESSAGE) ? '' : 'hidden',
});


Template.files.events({
	'click .js-upload-message': clearUploadMessage,
	'click .js-delete': e => uploads.remove({ _id: new Mongo.ObjectID(e.currentTarget.dataset.key) }),
});

Template.files.initializeEventHandlers = function() {
    // Setup the target Browse Button and Drop Zone
	uploads.resumable.assignDrop(self.$('.js-drop-file'));
	uploads.resumable.assignBrowse(self.$('.js-browse-file'));

	// Prevent default drop behavior (loading a file) outside of the drop zone
    window.addEventListener('dragover', e => (e.preventDefault()), false);
    window.addEventListener('drop', e => (e.preventDefault()), false);
}
