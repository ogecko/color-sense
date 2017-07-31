import THREE from 'three';
import Hammer from  'hammerjs';
import TouchEmulator from 'hammer-touchemulator';

import { Renderer }  from 'popmotion';
import { _ } from 'meteor/underscore';
import { tween, parallel, physics, easing }  from 'popmotion';
import { setSelectors, getSelectors } from './popmotionTHREESelectors.js';
import { store } from '/imports/store/index.js';

const LZCONST = 1.5;
const convertLevelToScale = x => Math.pow(LZCONST, x);
const convertScaleToLevel = x => Math.log(x) / Math.log(LZCONST);

class popmotionTHREERenderer extends Renderer {
	constructor(props) {
		super(props);
		this.onWindowResize = this.onWindowResize.bind(this);
		this.zoomTo = this.zoomTo.bind(this);
		this.panToStartDrag = this.panToStartDrag.bind(this);
		this.panToContinueDrag = this.panToContinueDrag.bind(this);
		this.panToEndWithInertia = this.panToEndWithInertia.bind(this);
		this.panToCenterZoom = this.panToCenterZoom.bind(this);

		// setup a clock, scene, camera and THREE renderer
		this.namespace = {};
		this.dragInertiaAction = undefined;
		this.dragStartPosition = { x: 0, y: 0 };
		this.container = this.props.container;
		this.clock = new THREE.Clock();
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x09253A);
		this.camera = new THREE.PerspectiveCamera(45, this.getWindowSize().aspect, 0.1, 1000);
		this.camera.position.z = 10;
		this.renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
		this.renderer.localClippingEnabled = true;
		this.container.append(this.renderer.domElement);

		// setup touch events for this renderer
		this.touch = new Hammer(this.container, { });
		this.touch.get('pan').set({ direction: Hammer.DIRECTION_ALL });
		this.touch.get('pinch').set({ enable: true });

		// TouchEmulator();

		// setup Orbit Controls
		if (this.props.useOrbitControls) {
			this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
			this.controls.enableDamping = true;
			this.controls.dampingFactor = 0.05;
			this.controls.rotateSpeed = 0.05;
			this.controls.minAzimuthAngle = - Math.PI / 2;
			this.controls.maxAzimuthAngle = Math.PI / 2;
		}

		// setup lighting
		var ambientLight = new THREE.AmbientLight(0xffffff);
		this.scene.add(ambientLight);

		var lights = [];
		lights[ 0 ] = new THREE.PointLight(0xffffff, 1, 0);
		lights[ 1 ] = new THREE.PointLight(0xffffff, 1, 0);
		lights[ 2 ] = new THREE.PointLight(0x888888, 1, 0);

		lights[ 0 ].position.set(0, 200, 0);
		lights[ 1 ].position.set(100, 200, 100);
		lights[ 2 ].position.set(- 100, - 200, - 100);

		this.scene.add(lights[ 0 ]);
		this.scene.add(lights[ 1 ]);
		this.scene.add(lights[ 2 ]);

		// listen for resize events, and setup for initial size
		window.addEventListener('resize', this.onWindowResize, false);
		this.onWindowResize();
	}


	panToStartDrag(ev) {
		if (this.dragInertiaAction) this.dragInertiaAction.stop();
		this.dragStartPosition = this.onRead('camera.xy');
	}

	panToContinueDrag(ev) {
		this.set('camera.xy', {
			x: this.dragStartPosition.x - ev.deltaX / 100 / this.camera.zoom,
			y: this.dragStartPosition.y + ev.deltaY / 100 / this.camera.zoom,
		});
	}

	panToEndWithInertia(ev) {
		this.dragInertiaAction = physics({ velocity: 20, friction: 0.3 })
			.output(v => this.set('camera.xy', {
				x: this.dragStartPosition.x - ev.deltaX / 100 / this.camera.zoom - ev.velocityX * v / this.camera.zoom,
				y: this.dragStartPosition.y + ev.deltaY / 100 / this.camera.zoom + ev.velocityY * v / this.camera.zoom,
			}))
			.start();
	}

	panToCenterZoom(startScale, endScale) {
		if (this.dragInertiaAction) this.dragInertiaAction.stop();
		const sp = this.onRead('camera.xy');
		// parallel([
		// 	tween({ from: sp.x, to: sp.x / startScale * endScale })
		// 		.output(v => this.set('camera.x', v)),
		// 	tween({ from: sp.y, to: sp.y / startScale * endScale })
		// 		.output(v => this.set('camera.y', v)),
		// ]).start();
	}

	zoomIn(amount = 1) {
		const startScale = this.onRead('camera.zoom');
		const endScale = convertLevelToScale(convertScaleToLevel(startScale) + amount);
		this.panToCenterZoom(startScale, endScale);
		tween({ from: startScale, to: endScale })
			.output(v => this.set('camera.zoom', v))
			.start();
	}

	zoomOut(amount = 1) {
		const startScale = this.onRead('camera.zoom');
		const endScale = convertLevelToScale(convertScaleToLevel(startScale) - amount);
		this.panToCenterZoom(startScale, endScale);
		tween({ from: startScale, to: endScale })
			.output(v => this.set('camera.zoom', v))
			.start();
	}

	zoomTo(endScale) {
		const startScale = this.get('camera.zoom');
		this.panToCenterZoom(startScale, endScale);
		tween({ from: startScale, to: endScale })
			.output(v => this.set('camera.zoom', v))
			.start();
	}

	viewPlan() {
		tween({ from: this.get('camera.rotateX'), to: Math.PI/2 })
			.output(v => this.set('camera.rotateX', v))
			.start();
	}

	viewElev() {
		tween({ from: this.get('camera.rotateX'), to: 0 })
			.output(v => this.set('camera.rotateX', v))
			.start();
	}

	uniformTo(uname, endValue) {
		const startValue = this.get(uname);
		tween({ from: startValue, to: endValue })
			.output(v => this.set(uname, v))
			.start();
	}


	thresholdTo(endThreshold) {
		const startThreshold = this.get('img.u_numEdges');
		store.set('threshold', { value: endThreshold });
		tween({ from: startThreshold, to: endThreshold })
			.output(v => this.set('img.u_numEdges', v))
			.start();
	}

	thresholdUp() {
		const startThreshold = this.get('img.u_numEdges');
		store.set('threshold', { value: startThreshold + 1 });
		tween({ from: startThreshold, to: startThreshold + 1 })
			.output(v => this.set('img.u_numEdges', v))
			.start();
	}

	thresholdDown() {
		const startThreshold = this.get('img.u_numEdges');
		store.set('threshold', { value: startThreshold - 1 });
		tween({ from: startThreshold, to: startThreshold - 1 })
			.output(v => this.set('img.u_numEdges', v))
			.start();
	}

	getWindowSize() {
		const offset = $(this.container).offset();
		const size = {
			width: window.innerWidth - offset.left,
			height: window.innerHeight - offset.top,
		};
		size.aspect = size.width / size.height;
		return size;
	}
	onWindowResize() {
		const size = this.getWindowSize();
		if (this.namespace.camera) this.set('camera.aspect', size.aspect);
		this.renderer.setSize(size.width, size.height);
		this.renderer.setPixelRatio(window.devicePixelRatio);
	}

	removeScrollBars() {
		$('body').css('overflow','hidden');
	}

	addTHREEObjects(obj, parent) {
		// add THREE objects to a parent (or the scene by default)
	}

	setNameSpace(keys) {
		this.namespace = { 
			camera: this.camera,
			scene: this.scene,
			...keys };
		return this;
	}

	onRender() {
		// Apply all the changed values to the THREE model
		_.each(this.changedValues, key => {
			const parts = key.split('.');
			const keyobj = this.namespace[parts[0]];
			const keyparam = parts[1];
			if (setSelectors[keyparam]) {
				setSelectors[keyparam](keyobj, this.state[key]);
			} else {
				console.log(`cannot set value for key:${keyparam}`);
			}
		});

		// this.camera.lookAt(new THREE.Vector3(0,0,0));
		if (this.controls && this.controls.update)
			this.controls.update();
		
		// Render the THREE model
		this.renderer.render( this.scene, this.camera );
	}

	onRead(key) {
		const parts = key.split('.');
		const keyobj = this.namespace[parts[0]];
		const keyparam = parts[1];
		return getSelectors[keyparam] ? getSelectors[keyparam](keyobj) : undefined;
	}
}

export default function (container, props) {
	return new popmotionTHREERenderer({
		container,
		...props,
	});
}