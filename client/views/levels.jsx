import { Template } from 'meteor/templating';
import React from 'react';
import { render } from 'react-dom';
import { _ } from 'meteor/underscore';

function LevelsDiagram(props) {
	return <h1>Hello, {_.times(props.levels, i => i + 1)}</h1>;
}


Template.levels.onRendered(function () {
	const self = this;

	self.$('.ui.checkbox').checkbox();
	render(
		<LevelsDiagram levels={6} />,
		self.$('.ui.levels')[0]
	);
});


