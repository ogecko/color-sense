import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Meteor } from 'meteor/meteor';

// display the template in the content section of the appLayout dynamic template
function appRenderContent(template) {
	BlazeLayout.render('appLayout', { content: template });
}

FlowRouter.route('/', 					{ action: () => appRenderContent('home') });
FlowRouter.route('/trace',				{ action: () => appRenderContent('trace') });
FlowRouter.route('/sketch',				{ action: () => appRenderContent('sketch') });
FlowRouter.route('/scatter/:type',		{ action: () => appRenderContent('scatter') });
FlowRouter.route('/surface',			{ action: () => appRenderContent('surface') });
FlowRouter.route('/page/:pageTitle', 	{ action: () => {
	let pageTitle = FlowRouter.getParam('pageTitle');
	if (!Template[pageTitle]) pageTitle = 'unknown';
	appRenderContent(pageTitle);
} });
