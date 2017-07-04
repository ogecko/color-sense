import { FileCollection } from 'meteor/vsivsi:file-collection';
import { ObjectId } from 'meteor/mongo';

export const uploads = new FileCollection('uploads', {
	resumable: true,   					// Enable built-in resumable.js upload support
	resumableIndexName: 'uploadsIdx',	// Don't use the default MongoDB index name
	http: [
		{
			method: 'get',
			path: '/md5/:md5',  							// this will be at route "/gridfs/uploads/md5:/:md5"
			lookup: params => ({ md5: params.md5 }),    	// a query mapping url to gridfs selector
		},
		{
			method: 'get',
			path: '/name/:name',  							// this will be at route "/gridfs/uploads/name/:name"
			lookup: params => ({ $or: [
									{ filename: params.name },
									{ aliases: { $in: [params.name] } },
			] }),    										// a query mapping url to gridfs selector
		},
	],
});



