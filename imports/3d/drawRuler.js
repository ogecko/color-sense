import THREE from 'three';

export function drawRuler(ctx, options) {
	const defaults = {
		text: '30',
		textColor: 'white',
		shadowColor: 'black',
		shadowBlur: 10,
		lineWidth: 4,
		fontSize: 60,
		fontFace: 'Century',
	};
	const props = { ...defaults, ...options };

	const cx = ctx.canvas.width / 2;
	const cy = ctx.canvas.height / 2;
	const rx = props.fontSize / 6;
	const tx = props.fontSize;
	const ty = props.fontSize / 4;

	ctx.shadowColor = props.shadowColor;
	ctx.shadowBlur = props.shadowBlur;
	ctx.lineWidth = props.lineWidth;
	ctx.fillStyle = props.textColor;
	ctx.strokeStyle = props.textColor;
	ctx.font = `${props.fontSize}px ${props.fontFace}`;
	props.textWidth = ctx.measureText(props.text).width;

	ctx.beginPath();
	ctx.arc(cx, cy, rx, 0, 2 * Math.PI, false);
	ctx.lineTo(cx + tx, cy);
	ctx.stroke();

	ctx.fillText(props.text, cx + tx, cy + ty);
	return props;
}

export function createRulerMesh(options) {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	const aspectRatio = 30 / 3;
	canvas.width = 1920;
	canvas.height = canvas.width / aspectRatio;
	drawRuler(context, options);
	const texture = new THREE.CanvasTexture(canvas);
	texture.minFilter = THREE.LinearFilter;
	const geometry = new THREE.PlaneBufferGeometry(0.5, 0.5 / aspectRatio);
	const material = new THREE.MeshBasicMaterial({ map: texture });
	const ruler = new THREE.Mesh(geometry, material);
	ruler.position.z = 0.05;
	ruler.position.x = -0.25;
	return ruler;
}
