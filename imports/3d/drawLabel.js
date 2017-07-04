import THREE from 'three';

export function drawLabel(ctx, options) {
	const defaults = {
		text: '',
		textColor: 'white',
		shadowColor: 'black',
		fontSize: 40,
		fontFace: 'Arial',
	};
	const props = { ...defaults, ...options };

	props.textWidth = ctx.measureText(props.text).width;
	const cx = ctx.canvas.width / 2;
	const cy = ctx.canvas.height / 2;
	const rx = props.fontSize / 6;
	const tx = props.fontSize ;
	const ty = props.fontSize / 4;

	ctx.shadowColor = props.shadowColor;
	ctx.shadowBlur = 10;
	ctx.lineWidth = 4;
	ctx.fillStyle = props.textColor;
	ctx.strokeStyle = props.textColor;

	ctx.beginPath();
	ctx.arc(cx, cy, rx, 0, 2 * Math.PI, false);
	ctx.lineTo(cx + tx, cy);
	ctx.stroke();

	ctx.font = `${props.fontSize}px ${props.fontFace}`;
	ctx.fillText(props.text, cx + tx, cy + ty);
	return props;
}

export function createLabelSprite(options) {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	canvas.width = 600;
	canvas.height = 100;
	drawLabel(context, options);
	const texture = new THREE.CanvasTexture(canvas);
	texture.minFilter = THREE.LinearFilter;
	const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
	label.scale.x = canvas.width / canvas.height;
	return label;
}
