// 2.js

"use strict";

function main() {
	const clock = new THREE.Clock();
	// create a scene, that will hold all our elements such as objects, cameras and lights.
	const scene = new THREE.Scene();

	// // create a render and configure it with shadows
	const renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(new THREE.Color(0.8, 0.8, 0.8));
	renderer.setSize(window.innerWidth, window.innerHeight);

	const gui = new dat.GUI();

	// create a camera, which defines where we're looking at.
	let camera = new THREE.OrthographicCamera(
		window.innerWidth / -130,
		window.innerWidth / 130,
		window.innerHeight / 130,
		window.innerHeight / -130,
		-200,
		500
	);

	// add the output of the renderer to the html element
	document.body.appendChild(renderer.domElement);
	document.addEventListener("mousemove", onDocumentMouseMove, false);
	document.addEventListener("mousedown", onDocumentMouseDown, false);
	document.addEventListener("mouseup", onDocumentMouseUp, false);

	const trackballControls = initTrackballControls(camera, renderer);

	Data.init(scene, camera, trackballControls);

	gui.add(Data.controlsParameters, "showAxes").onChange(function (e) {
		Data.setVertexBuffersAndDraw();
	});

	const guiCtrPointsParams = gui.addFolder("Control point parameters");
	const guiAreaBounds = guiCtrPointsParams.addFolder("Area Bounds");
	const guiCountControlPoints = guiCtrPointsParams.addFolder(
		"Count control points"
	);
	const guiSplineParams = gui.addFolder("Spline parameters");

	guiAreaBounds
		.add(Data.controlsParameters, "Xmin", 0, 3 * Math.PI)
		.onChange(function (e) {
			Data.setDependentGeomParameters();
			Data.generateControlPoints();
		});
	guiAreaBounds
		.add(Data.controlsParameters, "Xmax", 0, 3 * Math.PI)
		.onChange(function (e) {
			Data.setDependentGeomParameters();
			Data.generateControlPoints();
		});
	guiAreaBounds
		.add(Data.controlsParameters, "Ymin", 0, 3 * Math.PI)
		.onChange(function (e) {
			Data.setDependentGeomParameters();
			Data.generateControlPoints();
		});
	guiAreaBounds
		.add(Data.controlsParameters, "Ymax", 0, 3 * Math.PI)
		.onChange(function (e) {
			Data.setDependentGeomParameters();
			Data.generateControlPoints();
		});
	guiAreaBounds
		.add(Data.controlsParameters, "Z", 0, 5)
		.onChange(function (e) {
			Data.setDependentGeomParameters();
			Data.generateControlPoints();
		});
	guiCountControlPoints
		.add(Data.controlsParameters, "N_ctr", 2, 8, 1)
		.onChange(function (e) {
			Data.generateControlPoints();
		});
	guiCountControlPoints
		.add(Data.controlsParameters, "M_ctr", 2, 8, 1)
		.onChange(function (e) {
			Data.generateControlPoints();
		});
	guiCtrPointsParams
		.add(Data.controlsParameters, "showCtrPoints")
		.onChange(function (e) {
			Data.setVertexBuffersAndDraw();
		});
	guiCtrPointsParams
		.add(Data.controlsParameters, "controlNet")
		.onChange(function (e) {
			Data.setVertexBuffersAndDraw();
		});

	guiSplineParams
		.add(Data.controlsParameters, "lineSurfaceSpline")
		.onChange(function (e) {
			Data.calculateAndDraw();
		});
	guiSplineParams
		.add(Data.controlsParameters, "paramCoords", [
			"uniform",
			"chordal",
			"centripetal"
		])
		.onChange(function (e) {
			Data.calculateAndDraw();
		});
	guiSplineParams
		.add(Data.controlsParameters, "visualize", ["wireframe", "solid"])
		.onChange(function (e) {
			Data.setVertexBuffersAndDraw();
		});
	guiSplineParams
		.add(Data.controlsParameters, "slices", 2, 120, 1)
		.onChange(function (e) {
			Data.calculateAndDraw();
		});
	guiSplineParams
		.add(Data.controlsParameters, "stacks", 2, 120, 1)
		.onChange(function (e) {
			Data.calculateAndDraw();
		});

	Data.generateControlPoints();

	camera.position.set(0, 0, 30);

	renderScene();

	function renderScene() {
		trackballControls.update(clock.getDelta());
		// render using requestAnimationFrame
		requestAnimationFrame(renderScene);
		renderer.render(scene, camera);
	}
}

class Point {
	constructor (x, y, z) {
		this.select = false;
		// ДОБАВИТЬ ПАРАМЕТРИЧЕСКИЕ КООРДИНАТЫ u и v
		this.u = 0;
		this.v = 0;

		this.x = x;
		this.y = y;
		this.z = z;
		this.winx = 0.0;
		this.winz = 0.0;
		this.winy = 0.0;
	}
	setRect() {
		this.left = this.winx - 5;
		this.right = this.winx + 5;
		this.bottom = this.winy - 5;
		this.up = this.winy + 5;
	}
	calculateWindowCoordinates(object, camera) {
		//------------Get window coordinates of point-----------
		const vector = new THREE.Vector3();
		vector.setFromMatrixPosition(object.matrixWorld);
		vector.project(camera);

		const width = window.innerWidth,
			height = window.innerHeight;
		const widthHalf = width / 2,
			heightHalf = height / 2;

		vector.x = vector.x * widthHalf + widthHalf;
		vector.y = -(vector.y * heightHalf) + heightHalf;

		this.winx = vector.x;
		this.winy = vector.y;
		this.winz = vector.z;

		this.setRect(); //create a bounding rectangle around point
	}
	ptInRect(x, y) {
		const inX = this.left <= x && x <= this.right;
		const inY = this.bottom <= y && y <= this.up;
		return inX && inY;
	}
}

const Data = {
	pointsCtr: [],
	spritesCtr: [],
	indicesCtr: [],
	verticesCtr: {},
	controlPoligons: {},
	scene: null,
	movePoint: false,
	iMove: -1,
	jMove: -1,
	leftButtonDown: false,
	N_ctr: null,
	M_ctr: null,
	Xmid: 0.0,
	Ymid: 0.0,
	lastPosX: 0,
	lastPosY: 0,
	materialSpritesCtr: null,
	materialSelectedSpritesCtr: null,
	materialControlPoligons: [],
	materialWireframeSplineSurface: null,
	materialSolidSplineSurface: null,
	geometrySplineSurface: null,
	meshControlPoligons: null,
	meshSplineSurface: null,
	camera: null,
	trackballControls: null,
	axes: null,
	controlsParameters: {
		showAxes: true,
		Xmin: 0.0,
		Xmax: 3 * Math.PI,
		Ymin: 0.0,
		Ymax: 3 * Math.PI,
		Z: 1.5,
		N_ctr: 4,
		M_ctr: 4,
		showCtrPoints: true,
		controlNet: false,
		lineSurfaceSpline: false,
		paramCoords: "uniform",
		visualize: "wireframe",
		slices: 8,
		stacks: 8
	},
	init: function (scene, camera, trackballControls) {
		this.scene = scene;
		this.camera = camera;
		this.trackballControls = trackballControls;

		this.N_ctr = this.controlsParameters.N_ctr;
		this.M_ctr = this.controlsParameters.M_ctr;

		this.materialSpritesCtr = new THREE.SpriteMaterial({ color: 0x000000 });
		this.materialSelectedSpritesCtr = new THREE.SpriteMaterial({
			color: "rgb(50%,50%,0%)"
		});
		this.materialControlPoligons = [
			new THREE.LineBasicMaterial({ color: 0x00ff00 }),
			new THREE.LineBasicMaterial({ color: 0x0000ff })
		];
		this.materialSolidSplineSurface = new THREE.MeshPhongMaterial({
			color: "rgb(50%,50%,50%)",
			specular: "rgb(50%,50%,50%)",
			shininess: 51,
			side: THREE.DoubleSide
		});
		this.materialWireframeSplineSurface = new THREE.MeshBasicMaterial({
			color: "rgb(50%,50%,50%)",
			wireframe: true
		});
		// show axes in the screen
		this.axes = new THREE.AxesHelper(6);

		this.setDependentGeomParameters();
	},
	setDependentGeomParameters: function () {
		const Xmin = this.controlsParameters.Xmin,
			Xmax = this.controlsParameters.Xmax,
			Ymin = this.controlsParameters.Ymin,
			Ymax = this.controlsParameters.Ymax,
			Z = this.controlsParameters.Z;
		this.Xmid = Xmin + (Xmax - Xmin) / 2.0;
		this.Ymid = Ymin + (Ymax - Ymin) / 2.0;
	},
	generateControlPoints: function () {
		const Xmin = this.controlsParameters.Xmin,
			Xmax = this.controlsParameters.Xmax,
			Ymin = this.controlsParameters.Ymin,
			Ymax = this.controlsParameters.Ymax,
			Z = this.controlsParameters.Z
			; (this.N_ctr = this.controlsParameters.N_ctr),
				(this.M_ctr = this.controlsParameters.M_ctr),
				(this.pointsCtr = new Array(this.N_ctr));
		this.spritesCtr = new Array(this.N_ctr);
		for (let i = 0; i < this.N_ctr; i++) {
			this.pointsCtr[i] = new Array(this.M_ctr);
			this.spritesCtr[i] = new Array(this.M_ctr);
		}

		for (let i = 0; i < this.N_ctr; i++)
			for (let j = 0; j < this.M_ctr; j++) {
				const x =
					Xmin + (i * (Xmax - Xmin)) / (this.N_ctr - 1) - this.Xmid;
				const y =
					Ymin + (j * (Ymax - Ymin)) / (this.M_ctr - 1) - this.Ymid;
				const z = Z * Math.sin(x) * Math.sin(y);

				this.add_coords(i, j, x, y, z);
			}

		this.add_vertices(this.N_ctr, this.M_ctr);

		this.createIndicesCtr(this.N_ctr, this.M_ctr);

		if (this.controlsParameters.lineSurfaceSpline)
			this.calculateLineSurfaceSpline();

		this.setVertexBuffersAndDraw();
	},
	setLeftButtonDown: function (value) {
		this.leftButtonDown = value;
	},
	add_coords: function (i, j, x, y, z) {
		const pt = new Point(x, y, z);
		this.pointsCtr[i][j] = pt;
	},
	createIndicesCtr: function (n, m) {
		let i,
			j,
			k = 0;
		this.indicesCtr = new Array(2 * n * m);

		for (i = 0; i < n; i++)
			for (j = 0; j < m; j++) this.indicesCtr[k++] = i * m + j;
		for (j = 0; j < m; j++)
			for (i = 0; i < n; i++) this.indicesCtr[k++] = i * m + j;

		this.controlPoligons = new THREE.BufferGeometry();
		this.controlPoligons.setIndex(this.indicesCtr);

		for (i = 0; i < n; i++) this.controlPoligons.addGroup(i * m, m, 0);

		for (j = 0; j < m; j++)
			this.controlPoligons.addGroup(n * m + j * n, n, 1);

		this.meshControlPoligons = new THREE.Line(
			this.controlPoligons,
			this.materialControlPoligons
		);
	},
	mousemoveHandler: function (x, y) {
		if (this.leftButtonDown) {
			if (this.movePoint) {
				const offset = this.iMove * this.M_ctr + this.jMove;

				const vector = new THREE.Vector3();

				const width = window.innerWidth,
					height = window.innerHeight;
				const widthHalf = width / 2,
					heightHalf = height / 2;

				vector.x = (x - widthHalf) / widthHalf;
				vector.y = -(y - heightHalf) / heightHalf;
				vector.z = this.pointsCtr[this.iMove][this.jMove].winz;

				vector.unproject(this.camera);

				this.pointsCtr[this.iMove][this.jMove].x = vector.x;
				this.pointsCtr[this.iMove][this.jMove].y = vector.y;
				this.pointsCtr[this.iMove][this.jMove].z = vector.z;

				this.verticesCtr[offset * 3] =
					this.pointsCtr[this.iMove][this.jMove].x;
				this.verticesCtr[offset * 3 + 1] =
					this.pointsCtr[this.iMove][this.jMove].y;
				this.verticesCtr[offset * 3 + 2] =
					this.pointsCtr[this.iMove][this.jMove].z;

				if (this.controlsParameters.lineSurfaceSpline)
					this.calculateLineSurfaceSpline();
			}
			this.setVertexBuffersAndDraw();
		} else {
			this.trackballControls.enabled = true;
			for (let i = 0; i < this.N_ctr; i++)
				for (let j = 0; j < this.M_ctr; j++) {
					this.pointsCtr[i][j].select = false;
					this.pointsCtr[i][j].calculateWindowCoordinates(
						this.spritesCtr[i][j],
						this.camera
					);

					if (this.pointsCtr[i][j].ptInRect(x, y)) {
						this.pointsCtr[i][j].select = true;
						this.trackballControls.enabled = false;
					}
				}
			this.setVertexBuffersAndDraw();
		}
	},
	mousedownHandler: function (button, x, y) {
		if (button == 0) {
			//left button
			this.movePoint = false;

			for (let i = 0; i < this.N_ctr; i++)
				for (let j = 0; j < this.M_ctr; j++) {
					if (this.pointsCtr[i][j].select == true) {
						this.movePoint = true;
						this.iMove = i;
						this.jMove = j;
					}
				}

			if (!this.movePoint) {
				this.lastPosX = x;
				this.lastPosY = y;
			}

			this.setLeftButtonDown(true);
		}
	},
	mouseupHandler: function (button, x, y) {
		if (button == 0)
			//left button
			this.setLeftButtonDown(false);
	},
	add_vertices: function (n, m) {
		this.verticesCtr = new Float32Array(n * m * 3);
		for (let i = 0; i < n; i++)
			for (let j = 0; j < m; j++) {
				const offset = i * m + j;
				this.verticesCtr[offset * 3] = this.pointsCtr[i][j].x;
				this.verticesCtr[offset * 3 + 1] = this.pointsCtr[i][j].y;
				this.verticesCtr[offset * 3 + 2] = this.pointsCtr[i][j].z;
			}
	},
	setVertexBuffersAndDraw: function () {
		// Clear scene
		this.scene.remove.apply(this.scene, this.scene.children);

		if (this.controlsParameters.showAxes) this.scene.add(this.axes);

		// Draw
		if (this.controlsParameters.showCtrPoints)
			for (let i = 0; i < this.N_ctr; i++)
				for (let j = 0; j < this.M_ctr; j++) {
					if (this.pointsCtr[i][j].select)
						this.spritesCtr[i][j] = new THREE.Sprite(
							this.materialSelectedSpritesCtr
						);
					else
						this.spritesCtr[i][j] = new THREE.Sprite(
							this.materialSpritesCtr
						);
					this.spritesCtr[i][j].position.set(
						this.pointsCtr[i][j].x,
						this.pointsCtr[i][j].y,
						this.pointsCtr[i][j].z
					);
					this.spritesCtr[i][j].scale.set(0.2, 0.2);
					this.scene.add(this.spritesCtr[i][j]);
				}
		if (this.controlsParameters.controlNet) {
			this.meshControlPoligons.geometry.setAttribute(
				"position",
				new THREE.BufferAttribute(this.verticesCtr, 3)
			);
			this.scene.add(this.meshControlPoligons);
		}
		if (this.controlsParameters.lineSurfaceSpline) {
			switch (this.controlsParameters.visualize) {
				case "solid":
					this.meshSplineSurface = new THREE.Mesh(
						this.geometrySplineSurface,
						this.materialSolidSplineSurface
					);
					this.scene.add(this.meshSplineSurface);
					initDefaultLighting(this.scene, this.camera.position);
					break;
				case "wireframe":
					this.meshSplineSurface = new THREE.Mesh(
						this.geometrySplineSurface,
						this.materialWireframeSplineSurface
					);
					this.scene.add(this.meshSplineSurface);
					break;
			}
		}
	},
	calculateAndDraw: function () {
		if (this.controlsParameters.lineSurfaceSpline)
			this.calculateLineSurfaceSpline();

		this.setVertexBuffersAndDraw();
	},
	calculateLineSurfaceSpline: function () {
		let i, j;

		const N_ctr = this.N_ctr;
		const M_ctr = this.M_ctr;

		console.log(N_ctr, M_ctr);

		let chordalTempArrayU = Array(N_ctr)
			.fill()
			.map(() => Array(M_ctr).fill(0));
		let chordalTempArrayV = Array(N_ctr)
			.fill()
			.map(() => Array(M_ctr).fill(0));

		switch (this.controlsParameters.paramCoords) {
			case "chordal":
				{
					for (let i1 = 0; i1 < N_ctr; i1++) {
						let dv = 0;
						for (let j = 1; j < M_ctr; j++) {
							dv += Math.hypot(
								this.pointsCtr[i1][j].x -
								this.pointsCtr[i1][j - 1].x,
								this.pointsCtr[i1][j].y -
								this.pointsCtr[i1][j - 1].y,
								this.pointsCtr[i1][j].z -
								this.pointsCtr[i1][j - 1].z,
							);
						}
						for (let j1 = 1; j1 < M_ctr; j1++) {
							chordalTempArrayV[i1][j1] =
								chordalTempArrayV[i1][j1 - 1] +
								Math.hypot(
									this.pointsCtr[i1][j1].x -
									this.pointsCtr[i1][j1 - 1].x,
									this.pointsCtr[i1][j1].y -
									this.pointsCtr[i1][j1 - 1].y,
									this.pointsCtr[i1][j1].z -
									this.pointsCtr[i1][j1 - 1].z
								) /
								dv;
						}
					}
					for (let j1 = 0; j1 < M_ctr; j1++) {
						let du = 0;
						for (let i = 1; i < N_ctr; i++) {
							du += Math.hypot(
								this.pointsCtr[i][j1].x -
								this.pointsCtr[i - 1][j1].x,
								this.pointsCtr[i][j1].y -
								this.pointsCtr[i - 1][j1].y,
								this.pointsCtr[i][j1].z -
								this.pointsCtr[i - 1][j1].z
							);
						}
						for (let i1 = 1; i1 < N_ctr; i1++) {
							chordalTempArrayU[i1][j1] =
								chordalTempArrayU[i1 - 1][j1] +
								Math.hypot(
									this.pointsCtr[i1][j1].x -
									this.pointsCtr[i1 - 1][j1].x,
									this.pointsCtr[i1][j1].y -
									this.pointsCtr[i1 - 1][j1].y,
									this.pointsCtr[i1][j1].z -
									this.pointsCtr[i1 - 1][j1].z
								) /
								du;
						}
					}
				}
				break;
			case "centripetal":
				{
					for (let i1 = 0; i1 < N_ctr; i1++) {
						let dv = 0;
						for (let j = 1; j < M_ctr; j++) {
							dv += Math.sqrt(
								Math.hypot(
									this.pointsCtr[i1][j].x -
									this.pointsCtr[i1][j - 1].x,
									this.pointsCtr[i1][j].y -
									this.pointsCtr[i1][j - 1].y,
									this.pointsCtr[i1][j].z -
									this.pointsCtr[i1][j - 1].z,
								)
							);
						}
						for (let j1 = 1; j1 < M_ctr; j1++) {
							chordalTempArrayV[i1][j1] =
								chordalTempArrayV[i1][j1 - 1] +
								Math.sqrt(
									Math.hypot(
										this.pointsCtr[i1][j1].x -
										this.pointsCtr[i1][j1 - 1].x,
										this.pointsCtr[i1][j1].y -
										this.pointsCtr[i1][j1 - 1].y,
										this.pointsCtr[i1][j1].z -
										this.pointsCtr[i1][j1 - 1].z,
									)
								) /
								dv;
						}
					}
					for (let j1 = 0; j1 < M_ctr; j1++) {
						let du = 0;
						for (let i = 1; i < N_ctr; i++) {
							du += Math.sqrt(
								Math.hypot(
									this.pointsCtr[i][j1].x -
									this.pointsCtr[i - 1][j1].x,
									this.pointsCtr[i][j1].y -
									this.pointsCtr[i - 1][j1].y,
									this.pointsCtr[i][j1].z -
									this.pointsCtr[i - 1][j1].z,
								)
							);
						}
						for (let i1 = 1; i1 < N_ctr; i1++) {
							chordalTempArrayU[i1][j1] =
								chordalTempArrayU[i1 - 1][j1] +
								Math.sqrt(
									Math.hypot(
										this.pointsCtr[i1][j1].x -
										this.pointsCtr[i1 - 1][j1].x,
										this.pointsCtr[i1][j1].y -
										this.pointsCtr[i1 - 1][j1].y,
										this.pointsCtr[i1][j1].z -
										this.pointsCtr[i1 - 1][j1].z,
									)
								) /
								du;
						}
					}
				}
				break;
		}

		let u = 0;
		let v = 0;

		// INITIALIZE PARAMETRIC COORDINATES

		for (i = 0; i < N_ctr; i++) {
			for (j = 0; j < M_ctr; j++) {
				switch (this.controlsParameters.paramCoords) {
					case "uniform":
						u = i / (N_ctr - 1);
						v = j / (M_ctr - 1);

						this.pointsCtr[i][j].u = u;
						this.pointsCtr[i][j].v = v;
						break;
					case "chordal":
					case "centripetal":
						u = 0;
						for (let j1 = 0; j1 < M_ctr; j1++) {
							u += chordalTempArrayU[i][j1];
						}

						v = 0;
						for (let i1 = 0; i1 < N_ctr; i1++) {
							v += chordalTempArrayV[i1][j];
						}

						u = u / M_ctr;
						v = v / N_ctr; M_ctr;

						this.pointsCtr[i][j].u = u;
						this.pointsCtr[i][j].v = v;
						break;
				}
			}
		}

		const lineSurfaceSpline = (pointsCtr, N_ctr, M_ctr) => {
			return function (u, v, target) {
				// CALCULATE SPLINE COORDINATES
				let i = 0;
				let j = 0;

				while (u > pointsCtr[i + 1][j].u) i += 1;

				while (v > pointsCtr[i][j + 1].v) j += 1;

				const xi =
					(v - pointsCtr[i][j].v) /
					(pointsCtr[i][j + 1].v - pointsCtr[i][j].v);

				const x0 =
					pointsCtr[i][j].x * (1 - xi) + pointsCtr[i][j + 1].x * xi;
				const y0 =
					pointsCtr[i][j].y * (1 - xi) + pointsCtr[i][j + 1].y * xi;
				const z0 =
					pointsCtr[i][j].z * (1 - xi) + pointsCtr[i][j + 1].z * xi;

				const x1 =
					pointsCtr[i + 1][j].x * (1 - xi) +
					pointsCtr[i + 1][j + 1].x * xi;
				const y1 =
					pointsCtr[i + 1][j].y * (1 - xi) +
					pointsCtr[i + 1][j + 1].y * xi;
				const z1 =
					pointsCtr[i + 1][j].z * (1 - xi) +
					pointsCtr[i + 1][j + 1].z * xi;

				const omega =
					(u - pointsCtr[i][j].u) /
					(pointsCtr[i + 1][j].u - pointsCtr[i][j].u);

				const x = x0 * (1 - omega) + x1 * omega;
				const y = y0 * (1 - omega) + y1 * omega;
				const z = z0 * (1 - omega) + z1 * omega;

				target.set(x, y, z);
			};
		};
		this.geometrySplineSurface = new THREE.ParametricGeometry(
			lineSurfaceSpline(this.pointsCtr, N_ctr, M_ctr),
			this.controlsParameters.slices,
			this.controlsParameters.stacks
		);
	}
};

function mousedown(ev, canvas) {
	const x = ev.clientX; // x coordinate of a mouse pointer
	const y = ev.clientY; // y coordinate of a mouse pointer
	const rect = ev.target.getBoundingClientRect();

	Data.mousedownHandler(EventUtil.getButton(ev), x - rect.left, y - rect.top);
}
function onDocumentMouseDown(event) {
	const x = event.clientX; // x coordinate of a mouse pointer
	const y = event.clientY; // y coordinate of a mouse pointer
	const rect = event.target.getBoundingClientRect();

	Data.mousedownHandler(
		EventUtil.getButton(event),
		x - rect.left,
		y - rect.top
	);
}

function onDocumentMouseUp(event) {
	const x = event.clientX; // x coordinate of a mouse pointer
	const y = event.clientY; // y coordinate of a mouse pointer
	const rect = event.target.getBoundingClientRect();

	Data.mouseupHandler(EventUtil.getButton(event), x - rect.left, y - rect.top);
}

function onDocumentMouseMove(event) {
	const x = event.clientX; // x coordinate of a mouse pointer
	const y = event.clientY; // y coordinate of a mouse pointer
	const rect = event.target.getBoundingClientRect();

	Data.mousemoveHandler(x - rect.left, y - rect.top);
}