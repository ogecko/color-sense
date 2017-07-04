import { uploads } from './model.js';


uploads.allow({
	insert: (userId, file) => {
		file.metadata = file.metadata || {};
		file.metadata.srcImage = '/images/defaults/image.png';
		file.metadata.owner = userId;
		return true;
	},
	remove: (userId, file) => true,
	read: (userId, file) => true,
	write: (userId, file) => true,
});