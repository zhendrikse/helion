import {
    Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, Group, Vector3, BufferAttribute, Fog,
    MeshStandardMaterial, SphereGeometry, Mesh, BufferGeometry, LineBasicMaterial, Line, TubeGeometry,
    CylinderGeometry, ConeGeometry, BoxGeometry, Color, Curve, Quaternion, RepeatWrapping, DoubleSide,
    TextureLoader, Vector2, PlaneGeometry, PCFShadowMap, AmbientLight, EdgesGeometry, LineSegments,
    TorusGeometry, ShaderMaterial, AdditiveBlending, Points, PointsMaterial
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Renderer } from "../../simulation.js"
import { VectorFieldVector, ComplexScalarFieldValue, Complex, Vec3 } from "../../math/math.js";
import woodWicketColorUrl from '../../textures/Wood_Wicker_011_color.png';
import woodWicketNormalUrl from '../../textures/Wood_Wicker_011_normal.png';
import woodWicketRoughnessUrl from '../../textures/Wood_Wicker_011_roughness.png';
import pavingColorUrl from '../../textures/paving_color.jpg';
import pavingRoughnessUrl from '../../textures/paving_roughness.jpg';
import pavingNormalUrl from '../../textures/paving_normal.jpg';

export class ThreeJsRenderOptions {
    constructor({
        background = ThreeJsRenderer.Background.TRANSPARENT,
        backgroundColor = 0x0088ff,
        controls = true,
        light = true,
        cameraPosition = new Vec3(3, 3, 3),
        shadowsEnabled = false,
        fieldOfView = 50
    } = {}) {
        this.background = background;
        this.backgroundColor = backgroundColor;
        this.controls = controls;
        this.light = light;
        this.cameraPosition = cameraPosition;
        this.shadowsEnabled = shadowsEnabled;
        this.fieldOfView = fieldOfView;
    }
}

export class ThreeJsRenderer extends Renderer {
    static Background = Object.freeze({
        PLAIN: "Plain",
        FOG: "Fog",
        TRANSPARENT: "Transparent",
        STARS: "Stars"
    });

    static on = (canvasWrapperDiv) => new ThreeJsRenderer(canvasWrapperDiv);

    constructor(canvasWrapperDiv) {
        super(canvasWrapperDiv);
        this._canvas = this._canvasWrapperDiv.canvas.htmlCanvas;
        this._overlay = this._canvasWrapperDiv.overlay?.htmlOverlay;

        this._staticObjects = [];  // Are static during the whole simulation hence do NOT need to be synchronized
        this._dynamicObjects = []; // Need to be synchronized every update

        this._autoRotate = false;
        this._autoRotateTheta = Math.PI / 2;
        this._autoRotatePhi = 0;

        this._scene = new Scene();
        this._world = new Group();
        this._skydome = null;
        this._scene.add(this._world);
    }

    _showOverlayMessage(message, duration = 1000) {
        if (!this._overlay)
            return; // No overlay has been specified by the user, so we cannot render our information

        this._overlay.textContent = message;
        this._overlay.style.display = "block";

        setTimeout(() => {
            this._overlay.style.display = "none";
        }, duration);
    }

    onRunStatusChanged(currentSimulationRunningState) {
        if (currentSimulationRunningState)
            this._showOverlayMessage("Started");
        else
            this._showOverlayMessage("Reset"); // Canvas clicked during execution ==> we need to reset the simulation
    }

    with(options) {
        const canvas = this._canvas;

        this._renderer = new WebGLRenderer({
            antialias: true,
            canvas: this._canvas,
            alpha: options.background === ThreeJsRenderer.Background.TRANSPARENT
        });

        if (options.shadowsEnabled) {
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = PCFShadowMap;
        }

        this._camera = new PerspectiveCamera(options.fieldOfView, canvas.clientWidth / canvas.clientHeight, 0.1, 1e6);
        this._camera.position.set(options.cameraPosition.x, options.cameraPosition.y, options.cameraPosition.z);

        if (options.controls)
            this._controls = new OrbitControls(this._camera, canvas);

        if (options.light)
            this._initLights(options.shadowsEnabled);

        this._initBackground(options.background, options.backgroundColor);

        this.resize();
        window.addEventListener("resize", () => this.resize());

        return this;
    }

    resize() {
        const canvas = this._renderer.domElement;
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;

        if (!canvasWidth || !canvasHeight)
            return;

        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const width = Math.floor(canvasWidth * pixelRatio);
        const height = Math.floor(canvasHeight * pixelRatio);

        if (canvas.width === width || canvas.height === height)
            return;

        this._renderer.setPixelRatio(pixelRatio);
        this._renderer.setSize(canvasWidth, canvasHeight, false);
        this._camera.aspect = canvasWidth / canvasHeight;
        this._camera.updateProjectionMatrix();
    }

    reset() {
        for (const anObject of this._dynamicObjects)
            if (anObject.reset)
                anObject.reset();
    }

    _doAutoRotate(distance) {
        this._autoRotateTheta += -Math.PI / (7.5 * 100);
        this._autoRotatePhi +=  Math.PI / (7.5 * 100) * 2;

        this._camera.position.set(
            distance * Math.sin(this._autoRotateTheta) * Math.sin(this._autoRotatePhi),
            distance * Math.cos(this._autoRotateTheta),
            distance * Math.sin(this._autoRotateTheta) * Math.cos(this._autoRotatePhi)
        );

        this._camera.lookAt(0, 0, 0);
    }

    _initLights(shadowsEnabled) {
        const directionalLight = new DirectionalLight(0xffffff, shadowsEnabled ? 2 : 1);
        directionalLight.position.set(0, this._camera.position.y, 0);
        this._scene.add(directionalLight);
        this._scene.add(new AmbientLight(0xffffff, 0.8));

        if (!shadowsEnabled)
            return;

        // Adjust shadow camera settings
        directionalLight.shadow.camera.near = 0.5; // Default is 0.5
        directionalLight.shadow.camera.far = 50; // Default is 500
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.camera.left = -20;
        directionalLight.castShadow = true;

        // Adjust shadow map settings
        directionalLight.shadow.mapSize.width = 2048; // Default is 512
        directionalLight.shadow.mapSize.height = 2048; // Default is 512
    }

    _initBackground(background, backgroundColor) {
        switch (background) {
            case ThreeJsRenderer.Background.PLAIN:
                this._scene.background = new Color(backgroundColor);
                break;
            case ThreeJsRenderer.Background.FOG:
                this._scene.background = new Color(backgroundColor);
                this._scene.fog = new Fog(backgroundColor, 1, 100);
                break;
            case ThreeJsRenderer.Background.STARS:
                this._skydome = new SkyDome({
                    skyRadius: this._camera.position.clone().length() * 10,
                    blinkSpeed: 2.5
                });
                this._world.add(this._skydome);
                break;
            case ThreeJsRenderer.Background.TRANSPARENT:
            default:
                break;
        }
    }

    initialize(transform) {
        // Sync new physics state with view
        for (const anObject of this._staticObjects)
            anObject.render?.(transform);
    }

    render(transform, time) {
        // Sync new physics state with view
        for (const anObject of this._dynamicObjects)
            anObject.render?.(transform);

        this._renderer.render(this._scene, this._camera);
        this._controls?.update();
        this._skydome?.update(time, this._camera);

        if (this._autoRotate)
            this._doAutoRotate(this._camera.position.length());
    }

    addObject3D(threeJsObject) {
        this._world.add(threeJsObject);
    }

    synchronize(bodyAndView) {
        // Tie the body state to its associated view
        if (!bodyAndView.view.attachTo)
            throw new Error("Use addPlainObject() to attach regular Three.js objects!");

        this._world.add(bodyAndView.view);

        if (bodyAndView.always)
            this._dynamicObjects.push(bodyAndView.view);
        else
            this._staticObjects.push(bodyAndView.view);

        bodyAndView.view.attachTo(bodyAndView.body);
    }

    remove(anObject) {
        throw new Error("Remove() method not implemented.");
    }

    set autoRotate(autoRotate) { this._autoRotate = autoRotate; }
}

/*************
 * V I E W S *
 *************/

//
// T R A I L
//
class TrailLine {
    constructor({
                    maxPoints = 200,
                    color = 0xffffff,
                    linewidth = 1,
                } = {}) {
        this._maxPoints = maxPoints;
        this._positions = [];
        this._geometry = new BufferGeometry();
        this._material = new LineBasicMaterial({ color, linewidth });
        this._line = new Line(this._geometry, this._material);
    }

    addPoint(position) {
        this._positions.push(position.clone());

        if (this._positions.length > this._maxPoints)
            this._positions.shift();

        const array = new Float32Array(this._positions.length * 3);
        this._positions.forEach((pos, i) => {
            array[3 * i] = pos.x;
            array[3 * i + 1] = pos.y;
            array[3 * i + 2] = pos.z;
        });

        this._geometry.setAttribute('position', new BufferAttribute(array, 3));
        this._geometry.computeBoundingSphere();
    }

    clear() {
        this._positions.length = 0;
        this._geometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
    }
}

export class Trail extends Group {
    constructor({
        maxPoints = 200,
        trailStep = 1,
        lineWidth = 1,
        color = 0xffff00
    } = {}) {
        super();
        this._color = color;
        this._maxPoints = maxPoints;
        this._lineWidth = lineWidth;
        this._trailAccumulator = 0;
        this._trailStep = trailStep;
        this._body = null;
        this._initialState = null;
        this._previousPosition = null;
    }

    attachTo(body) {
        this._body = body;
        this._initialState = body.clone();
        this._previousPosition = body.position.clone();
        this._renew();
    }

    reset() {
        this.dispose();
        this._renew();
    }

    render(transform, increment = 1) {
        const newPosition = new Vector3();
        transform.physicsToRender(this._body.position, newPosition);
        if (this._previousPosition.x === newPosition.x &&
            this._previousPosition.y === newPosition.y &&
            this._previousPosition.z === newPosition.z)
            return; // When body's position remains unchanged, do NOT update the trail

        this._trailAccumulator += increment;
        if (this._trailAccumulator >= this._trailStep) {
            this._trail.addPoint(newPosition);
            this._previousPosition = newPosition;
            this._trailAccumulator = 0;
        }
    }

    _renew() {
        this._trail = new TrailLine({
            maxPoints: this._maxPoints,
            color: this._color,
            linewidth: this._lineWidth
        });
        this.add(this._trail._line);
    }

    dispose() {
        if (!this._trail) return;

        if (this._trail._line) {
            if (this._trail._line.geometry)
                this._trail._line.geometry.dispose();
            if (this._trail._line.material)
                this._trail._line.material.dispose();
        }
        this.remove(this._trail._line);
        this._trail = null;
    }
}

//
// Sphere
//
export class Sphere extends Mesh {
    constructor({
        color = 0xffff00,
        visible = true,
        segments = 24,
        opacity = 1,
        castShadow = false,
        wireframe = false
    } = {}) {
        const material = new MeshStandardMaterial({
            color: color,
            opacity: opacity,
            transparent: true,
            wireframe: wireframe,
            visible: visible,
            roughness: 0.2,
            metalness: 0.8
        })

        super(new SphereGeometry(1, segments, segments), material);
        this._body = null;
        this._initialState = null;
        this.visible = visible;
        this.castShadow = castShadow;
    }

    attachTo(body) {
        // Sanity checks
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
        this._initialState = body.clone(body);
    }

    reset() {
        this._body.position = this._initialState.position;
        this._body.velocity = this._initialState.velocity;
        this._body.radius = this._initialState.radius;
    }

    render(transform) {
        transform.physicsToRender(this._body.position, this.position);
        this.scale.setScalar(transform.scaleRadius(this._body.radius));
        this._trail?.render(transform);
    }

    get radius() { return this._radius; }
    get color() { return this.material.color; }

    set radius(newRadius) { this._radius = newRadius; }
    set color(newColor) { this.material.color.set(newColor); }
}

//
// Arrow
//
export class Arrow extends Group {
    static HEAD_RATIO = 0.35;   // part of total length
    static SHAFT_RATIO = 1 - Arrow.HEAD_RATIO;
    static UP = new Vector3(0, 1, 0);
    static FORWARD = new Vector3(0, 0, 1);
    static ShaftGeometryRound = new CylinderGeometry(1, 1, 1, 16);
    static ShaftGeometrySquare = new BoxGeometry(1, 1, 1);
    static HeadGeometryRound = new ConeGeometry(1, 1, 16);
    static HeadGeometrySquare = new ConeGeometry(1, 1, 4);
    constructor({
        color = 0xff0000,
        size = 1,
        opacity = 1,
        round = false,
        visible = true,
        castShadow = false,
        magnitudeMap = magnitude => magnitude, // identity mapping by default
        colorMap = null  // use the unmodified base color by default
    } = {}) {
        super();

        const shaftGeometry = round ? Arrow.ShaftGeometryRound : Arrow.ShaftGeometrySquare;
        const headGeometry = round ? Arrow.HeadGeometryRound : Arrow.HeadGeometrySquare;
        const material = new MeshStandardMaterial({
            color,
            roughness: 0.25,
            metalness: 0.35,
            emissive: new Color(0x333),
            opacity: opacity,
            transparent: true,
            emissiveIntensity: 0.2,
            envMapIntensity: 1.2
        });
        this._shaft = new Mesh(shaftGeometry, material);
        this._shaft.castShadow = castShadow;
        this._head = new Mesh(headGeometry, material);
        this._head.castShadow = castShadow;
        if (!round)
            this._head.rotation.y = Math.PI / 4; // By default, the rotation of square-shaped head is 45 degrees off

        this.add(this._shaft, this._head);
        this._initialState = null;
        this.visible = visible;
        this._body = null;
        this._size = size;
        this._colorMap = colorMap;
        this._magnitudeMap = magnitudeMap;
        this._baseColor = color;
        this._tempAxisVector = new Vector3();
    }

    reset() {
        this._body.position.copy(this._initialState.position);
        this._body.axis.copy(this._initialState.axis);
    }

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");

        this._body = body;
        this._initialState = body.clone();
    }
    get body() { return this._body; }

    dispose() {
        // DO NOT dispose shared geometries
        if (this._shaft) {
            if (this._shaft.material)
                this._shaft.material.dispose();
            this.remove(this._shaft);
            this._shaft = null;
        }

        if (this._head) { // head.material is the same object as share.material, so has already been disposed
            this.remove(this._head);
            this._head = null;
        }

        this.clear();
    }

    render(transform) {
        transform.physicsToRender(this._body.position, this.position);

        this._tempAxisVector.copy(this._body.axis);
        const magnitude = this._tempAxisVector.length();

        const visualMagnitude = this._magnitudeMap(magnitude);
        const length = visualMagnitude * this._size;

        if (this._colorMap) {
            const color = this._colorMap(this._tempAxisVector, magnitude);
            this._shaft.material.color.copy(color);
            this._head.material.color.copy(color);
        }

        this.quaternion.setFromUnitVectors(Arrow.UP, this._tempAxisVector.normalize());

        const shaftLength = length * Arrow.SHAFT_RATIO;
        const headLength = length * Arrow.HEAD_RATIO;
        const shaftRadius = length * 0.075;

        this._shaft.scale.set(shaftRadius, shaftLength, shaftRadius);
        this._shaft.position.y = shaftLength * 0.5;

        this._head.scale.set(shaftRadius * 2, headLength, shaftRadius * 2);
        this._head.position.y = shaftLength + headLength * 0.5;
    }

    set opacity(opacity) { this._shaft.material.opacity = opacity; }
    set color(color) { this._shaft.material.color = color; }
}

//
// ArrowField
//
export class ArrowField extends Group{
    constructor({
        xRange,
        yRange,
        zRange,
        scaleFactor = 1,
        round = false,
        magnitudeMap = magnitude => Math.log(1 + magnitude),
        colorMap = (axis, magnitude) => new Color().setHSL(Math.min(Math.log(1 + magnitude)/5, 1), 0.7, 0.5)
    } = {}) {
        super();
        this._xRange = xRange;
        this._yRange = yRange;
        this._zRange = zRange;
        this._scaleFactor = scaleFactor;
        this._magnitudeMap = magnitudeMap;
        this._colorMap = colorMap;
        this._round = round;
        this._fieldArrows = [];
    }

    _createArrowAt(x, y, z) {
        const arrow = new Arrow({
            color: 0x00ffff,
            size: this._scaleFactor,
            round: this._round,
            magnitudeMap: this._magnitudeMap,
            colorMap: this._colorMap,
        });
        const position = new Vector3(x, y, z);
        arrow.attachTo(new VectorFieldVector({ position }));
        this._fieldArrows.push(arrow);
        this.add(arrow);
    }

    // TODO implement reset()

    attachTo(vectorField) {
        // Sanity checks
        if (!vectorField.vectorAt)
            throw new Error("Body does not implement vectorAt(), hence it cannot be attached to this view.");

        this._vectorField = vectorField;
        for (let x of this._xRange)
            for (let y of this._yRange)
                for (let z of this._zRange)
                    this._createArrowAt(x, y, z);
    }

    render(transform) {
        for (let fieldArrow of this._fieldArrows) {
            // Field vectors haven't been added to the renderer by the application, so we need to sync state here:
            const fieldVector = fieldArrow.body;
            fieldVector.axis.copy(this._vectorField.vectorAt(fieldVector.position));
            fieldArrow.render(transform);
        }
    }
}

//
// Cylinder
//
export class Cylinder extends Mesh {
    constructor({
        color = 0xffff00,
        opacity = 1,
        segments = 24,
        castShadow = false
    } = {}) {
        const geometry = new CylinderGeometry(1, 1, 1, segments);
        const material = new MeshStandardMaterial({
            color,
            opacity,
            transparent: opacity < 1
        });
        super(geometry, material);
        this.castShadow = castShadow;

        this._body = null;
        this._initialState = null;
    }

    reset() {
        this._body.position.copy(this._initialState.position);
        this._body.axis.copy(this._initialState.axis);
        this._body.radius = this._initialState.radius;
    }

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
        this._initialState = body.clone();
    }

    render(transform) {
        transform.physicsToRender(this._body.position, this.position);

        const axis = new Vector3();
        transform.physicsToRender(this._body.axis, axis);
        const radius = transform.scaleRadius(this._body.radius);
        const length = axis.length();
        this.scale.set(radius, length, radius);

        const direction = axis.normalize();
        this.quaternion.setFromUnitVectors(Arrow.UP, direction);

        this.position.add(direction.multiplyScalar(length / 2));
    }
}

//
// Box
//
export class Box extends Mesh {
    constructor({
        color = 0xff0000,
        opacity = 1,
        visible = true,
        castShadow = false
    } = {}) {
        super(
            new BoxGeometry(1, 1, 1),
            new MeshStandardMaterial({
                color: color,
                transparent: true,
                opacity: opacity,
                depthTest: true
            }));
        this.visible = visible;
        this.castShadow = castShadow;
        this._initialState = null;
        this._body = null;
    }

    reset() {
        this._body.position.copy(this._initialState.position);
    }

    attachTo(body) {
        // Sanity checks
        if (!body.size || !body.size.x)
            throw new Error("Body does not have size (vector), hence it cannot be attached to this view.");

        this._body = body;
        this._initialState = body.clone();
    }

    render(transform) {
        transform.physicsToRender(this._body.position, this.position);
        transform.physicsToRender(this._body.size, this.scale);
    }
}

//
// Ring
//
export class Ring extends Mesh {
    constructor({
        color = 0xffff00,
        thickness = 0.1,
        radialSegments = 16,
        tubularSegments = 32
    } = {}) {
        const geometry = new TorusGeometry(1, thickness, radialSegments, tubularSegments);
        const material = new MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.75
        });
        super(geometry, material);
    }

    reset() {
        this._body.position.copy(this._initialState.position);
    }

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
        this._initialState = body.clone();
    }

    render(transform) {
        transform.physicsToRender(this._body.position, this.position);

        const axis = new Vector3();
        transform.physicsToRender(this._body.axis, axis);
        this.scale.setScalar(transform.scaleRadius(this._body.radius));

        const direction = axis.normalize();
        this.quaternion.setFromUnitVectors(Arrow.FORWARD, direction);
    }
}

//
// Spring
//
class Coils extends Curve {
    constructor(position, axis, coils = 25, radius = 0.4, waveAmp = 0.05, wavePhase = 0) {
        super();
        this.start = position.clone();
        this.coils = coils;
        this._axis = axis;
        this._direction = axis.clone().normalize();
        this.radius = radius;
        this.waveAmp = waveAmp;
        this.wavePhase = wavePhase;
    }

    updateAxis = (newAxis) => {
        this._axis.copy(newAxis);
        this._direction.copy(newAxis).normalize();
    }

    getPoint(t) {
        const length = this._axis.length();
        const angle = t * this.coils * Math.PI * 2;
        const x = Math.cos(angle) * this.radius;
        const y = Math.sin(angle) * this.radius;

        // Longitudinal wave across spring
        const z = t * length + this.waveAmp * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * t * 3 - this.wavePhase);

        const point = new Vector3(x, y, z);
        const quaternion = new Quaternion();
        quaternion.setFromUnitVectors(Arrow.FORWARD, this._direction);
        point.applyQuaternion(quaternion);

        return point.add(this.start);
    }
}

export class Helix extends Mesh {
    constructor({
        color = 0x00ffff,
        coils = 20,
        longitudinalOscillation = false,
        tubularSegments = 400,
        radialSegments = 16,
        radius = 0.125,
        thickness = 0.01,
        visible = true,
        castShadow = false
    } = {}) {
        const curve = new Coils(new Vector3(), new Vector3(), coils, radius, longitudinalOscillation ? 0.05 : 0);
        const geometry = new TubeGeometry(curve, tubularSegments, thickness, radialSegments, false);
        const material = new MeshStandardMaterial({
            color: color,
            visible: visible,
            metalness: 0.3,
            roughness: 0.4,
        });
        super(geometry, material);
        this._curve = curve;
        this._longitudinalOscillation = longitudinalOscillation;
        this._radius = radius;
        this._tubularSegments = tubularSegments;
        this._radialSegments = radialSegments;
        this._thickness = thickness;
        this.castShadow = castShadow;

        this._body = null;
        this._initialState = null;
    }

    reset() {
        this._body.position.copy(this._initialState.position);
        this._body.axis.copy(this._initialState.axis);
        this._body.radius = this._initialState.radius;
    }

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
        this._initialState = body.clone();
    }

    #regenerateTube() {
        this.geometry.dispose();
        this.geometry = new TubeGeometry(
            this._curve, this._tubularSegments, this._thickness, this._radialSegments, false
        );
    }

    update(time) {
        if (this._longitudinalOscillation)
            this._curve.wavePhase = time * 4;
    }

    #updateWithoutLongitudinal() {
        this.#regenerateTube();
    }

    #updateWithLongitudinal(time) {
        // Longitudinal wave amplitude coupled to spring elongation
        const displacement = this._axis.y - this._curve.start.y;
        this._curve.waveAmp = Math.min(Math.abs(displacement) / 10, 0.3); // max amplitude 0.3
        this.#regenerateTube();
    }

    render(transform) {
        transform.physicsToRender(this._body.position, this.position);

        this._curve.radius = transform.scaleRadius(this._body.radius);

        const axis = new Vector3();
        transform.physicsToRender(this._body.axis.clone(), axis );
        this._curve.updateAxis(axis);
        this._longitudinalOscillation ?
            this.#updateWithLongitudinal() :
            this.#updateWithoutLongitudinal();
    }
}

//
// Plane waves
//
export class ElectromagneticWave extends Group {
    constructor({
        electricFieldColor = new Color("orange"),
        magneticFieldColor = new Color("cyan"),
        arrowSize = 1,
        numArrows = 100,
        scalingFunction = (position, lambda) => .5, // default: fixed scaling with increasing distance
    } = {}) {
        super();
        this._electricFieldArrows = [];
        this._magneticFieldArrows = [];
        this._numArrows = numArrows;
        this._eletricFieldColor = electricFieldColor;
        this._magneticFieldColor = magneticFieldColor;
        this._arrowSize = arrowSize;
        this._scalingFunction = scalingFunction;

        // Optimization for vector calculations
        this._tempPosition = new Vector3();
        this._tempAxis = new Vector3();
        this._tempPosition = new Vector3();
        this._i_hat = new Vector3(1, 0, 0);

        this._planeWave = null;
    }

    attachTo(planeWave) {
        // Sanity checks
        if (!planeWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._planeWave = planeWave;
        this._createEmWaveFor(planeWave);
    }

    _updateFieldVectorAt(index) {
        const fieldVector = this._electricFieldArrows[index].body;

        // x = distance along wave
        const x = this._tempPosition.copy(fieldVector.position)
            .sub(this._planeWave.position)
            .length();

        // Field vectors haven't been added to the renderer by the application, so we need to sync state here:
        const scaling = this._scalingFunction(fieldVector.position);
        fieldVector.axis.y = scaling * this._planeWave.valueAt(x);

        // Magnetic field (orthogonal)
        this._magneticFieldArrows[index].body.axis.copy(
            this._tempAxis.copy(fieldVector.axis).cross(this._i_hat)
        );
    }

    render(transform) {
        for (let index = 0; index < this._electricFieldArrows.length; index++)
            this._updateFieldVectorAt(index);
        for (const arrow of this._electricFieldArrows)
            arrow.render(transform);
        for (const arrow of this._magneticFieldArrows)
            arrow.render(transform);
    }

    _createEmWaveFor(planeWave) {
        const ds = planeWave.lambda / 10.0;
        const dr1 = planeWave.position.clone().normalize().multiplyScalar(ds);
        const position = planeWave.position.clone();
        for (let ct = 0; ct < this._numArrows; ct++) {
            const electricFieldArrow = new Arrow({
                color: this._eletricFieldColor,
                size: this._arrowSize,
                round: true
            });
            const magneticFieldArrow = new Arrow({
                color: this._magneticFieldColor,
                size: this._arrowSize,
                round: true
            });
            electricFieldArrow.attachTo(new VectorFieldVector({position}));
            magneticFieldArrow.attachTo(new VectorFieldVector({position}));
            this._magneticFieldArrows.push(magneticFieldArrow);
            this._electricFieldArrows.push(electricFieldArrow);
            this.add(electricFieldArrow, magneticFieldArrow);

            position.add(dr1);
        }
    }
}

export class OneDimensionalComplexPlaneWave3D extends Group {
    constructor({
        size = 1,
        numArrows = 70,
        round = false
    } = {}) {
        super();
        this._arrows = [];

        this._numArrows = numArrows;
        this._round = round;
        this._size = size;
        this._complexPlaneWave = null;
    }

    attachTo(complexPlaneWave) {
        // Sanity checks
        if (!complexPlaneWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._complexPlaneWave = complexPlaneWave;

        const position = new Vector3().copy(complexPlaneWave.position);
        for (let i = 0; i < this._numArrows; i++)
            this._createArrowAt(position, i);
    }

    _createArrowAt(position, index) {
        const x = position.x + index * 0.5;
        const arrow = new Arrow({
            round: this._round,
            size: this._size,
            colorMap: (axis) => new Color().setHSL(1.0 - new Complex(axis.z, axis.y).phase() / (2 * Math.PI), 1.0, 0.5)
        });

        arrow.attachTo(new ComplexScalarFieldValue({ position: new Vector3(x, position.y, position.z) }));
        this._arrows.push(arrow);
        this.add(arrow);
    }

    render(transform) {
        for (let arrow of this._arrows)
            arrow.body.value = this._complexPlaneWave.valueAt(arrow.body.position.x);

        for (let arrow of this._arrows)
            arrow.render(transform);
    }
}

/*******************************************
 * Floor, Grid, Ceiling, Aquarium          *
 *******************************************/

class Grid extends Group {
    constructor({
        size = 1,
        granularity = 20,
        y = 0,
        color = 0x00ff00
    } = {}) {
        super();

        const step = (size * 2) / granularity;
        const material = new LineBasicMaterial({ color: color });
        for (let i = 0; i <= granularity; i++) {
            const x = -size + i * step;
            this.add(new Line(this.#verticalLine(x, y, size), material));
            this.add(new Line(this.#horizontalLine(x, y, size), material));
        }
    }

    #verticalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(x, y, -size), new Vector3(x, y, size)]);
    }

    #horizontalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(-size, y, x), new Vector3(size, y, x)]);
    }
}

export class Floor extends Group {
    static Type = Object.freeze({
        PLAIN: "PLAIN",
        GRID: "Grid",
        PAVING: "Paving",
        WOOD_WICKER: "WoodWicker"  // https://3dtextures.me/2024/06/22/wood-wicker-011/
    });
    constructor({
        type= Floor.Type.PLAIN,
        position = new Vector3(),
        planeSizeXy = new Vector2(2, 2),
        granularity = 1,
        color = 0x00ff00,
        opacity = null,
        receiveShadow = true
    } = {}) {
        super();
        const planeGeometry = new PlaneGeometry(planeSizeXy.x, planeSizeXy.y);
        const planeMaterial = new MeshStandardMaterial({
            normalScale: planeSizeXy,
            roughness: 1,
            transparent: opacity !== null,
            opacity: opacity ? opacity : 1,
            side: DoubleSide
            //occlusionMap: textureAmbientOcclusion,
            //alphaMap: textureOpacity,
            //aoMap: textureAmbientOcclusion,
            //aoMapIntensity: 0,
        });
        this._mesh = new Mesh(planeGeometry, planeMaterial);
        this._mesh.receiveShadow = receiveShadow;
        this._mesh.rotation.x = -Math.PI / 2;

        this.position.copy(position);
        this.add(this._mesh);

        const loader = new TextureLoader();
        switch (type) {
            case Floor.Type.PLAIN:
                this._mesh.material.color.set(color);
                break;
            case Floor.Type.GRID:
                this.add(new Grid({
                    color,
                    size: planeSizeXy.x * .5, // TODO enable rectangular formats
                    granularity: granularity
                }));
                break;
            case Floor.Type.PAVING:
                this._mesh.material.map = this._loadTexture(loader, pavingColorUrl, granularity);
                this._mesh.material.roughnessMap = this._loadTexture(loader, pavingRoughnessUrl, granularity);
                this._mesh.material.normalMap = this._loadTexture(loader, pavingNormalUrl, granularity);
                break;
            case Floor.Type.WOOD_WICKER:
                this._mesh.material.map = this._loadTexture(loader, woodWicketColorUrl, granularity);
                this._mesh.material.roughnessMap = this._loadTexture(loader, woodWicketRoughnessUrl, granularity);
                this._mesh.material.normalMap = this._loadTexture(loader, woodWicketNormalUrl, granularity);
                break;
        }
    }

    _loadTexture(loader, url, granularity) {
        const texture = loader.load(url);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(granularity, granularity);
        return texture;
    }

    get level() { return this.position.y; }
}

export class Ceiling extends Mesh {
    constructor({
        position = new Vector3(0, 0, 0),
        size = 12,
        thickness = 0.75,
        color = 0x8a8a8a
    } = {}) {
        const ceilingGeometry = new BoxGeometry(size, size, thickness);
        const ceilingMaterial = new MeshStandardMaterial({
            color: color,
            metalness: 0.05,
            roughness: 0.95,
            side: DoubleSide
        });
        ceilingMaterial.bumpScale = 0.05;
        super(ceilingGeometry, ceilingMaterial);
        this.rotation.x = Math.PI / 2;
        this.position.copy(position);
    }
}

export class Aquarium extends Mesh {
    constructor({
        position = new Vector3(0, 0, 0),
        size = new Vector3(1, 1, 1),
        opacity = 0.35,
        contentColor = new Color(.1, .3, .78),
        frameColor = 0xaa9900,
        frameWidth = 1
    } = {}) {
        const geometry = new BoxGeometry(size.x, size.y, size.z);
        const material = new MeshStandardMaterial({
            color: contentColor,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            depthTest: true,
        });

        super(geometry, material);
        this.position.copy(position);
        this._size = size;

        // --- Edges ---
        const edges = new EdgesGeometry(geometry);
        const lineMaterial = new LineBasicMaterial({
            color: frameColor,
            linewidth: frameWidth,
            depthTest: true
        });

        const wireframe = new LineSegments(edges, lineMaterial);
        this.add(wireframe); // make it an integral part of the cube
    }

    get size() { return this._size;}
}

class SkyDome extends Group {
    constructor({
                    skyRadius = 5000,
                    starDensity = 5,
                    glowStarCount = 2000,
                    pointSize = 4,
                    blinkSpeed = 5
                } = {}) {
        super();

        this._stars = this.#createStars(skyRadius / starDensity); // Non-blinking stars
        this._stars.forEach(star => { star.renderOrder = -1; this.add(star); });
        this._glowStars = this.#createGlowStars(skyRadius, glowStarCount, pointSize, blinkSpeed); // Blinking stars
        this._glowStars.renderOrder = -10; // Sky dome is "infinitely" far away
        this.add(this._glowStars);
    }

    #createGlowStars(skyRadius, starCount, pointSize, blinkSpeed) {
        const positions = new Float32Array(starCount * 3);
        const randomPhases = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = skyRadius;

            positions[3 * i + 0] = r * Math.sin(phi) * Math.cos(theta);
            positions[3 * i + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[3 * i + 2] = r * Math.cos(phi);

            randomPhases[i] = Math.random(); // unieke fase voor fonkelen
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(positions, 3));
        geometry.setAttribute("aRandom", new BufferAttribute(randomPhases, 1));

        const material = new ShaderMaterial({
            transparent: true,
            depthTest: true,
            depthWrite: false,
            blending: AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                pointSize: { value: pointSize },
                blinkSpeed: { value: blinkSpeed }
            },
            vertexShader: `
                attribute float aRandom;
                varying float vRandom;
                uniform float uTime;
                uniform float blinkSpeed;
                void main() {
                    vRandom = aRandom;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 4.0 + 2.0 * sin(uTime * blinkSpeed + vRandom * 6.2831);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    float halo = exp(-dist * dist * 8.0);

                    // fonkelen
                    float alpha = halo;
                    gl_FragColor = vec4(vec3(1.0), alpha);
                }
            `
        });

        return new Points(geometry, material);
    }

    #createStars(radius) {
        const layers = [
            { count: 250, size: 2, color: 0x555555 },
            { count: 1500, size: 1, color: 0x333333 }
        ];

        const starGroups = [];

        for (let layer = 0; layer < layers.length; layer++) {
            const { count, size, color } = layers[layer];
            const positions = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const vector = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
                    .normalize()
                    .multiplyScalar(radius);

                positions[3 * i + 0] = vector.x;
                positions[3 * i + 1] = vector.y;
                positions[3 * i + 2] = vector.z;
            }

            const geometry = new BufferGeometry();
            geometry.setAttribute("position", new BufferAttribute(positions, 3));

            const material = new PointsMaterial({
                color,
                size,
                sizeAttenuation: false,
                depthWrite: false,
                depthTest: false
            });

            for (let i = 10; i < 30; i++) {
                const stars = new Points(geometry, material);
                stars.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                stars.updateMatrix();
                stars.matrixAutoUpdate = false;
                starGroups.push(stars.clone());
            }
        }

        return starGroups;
    }

    update(time, camera) {
        this.quaternion.copy(camera.quaternion);
        this._glowStars.material.uniforms.uTime.value = time * 1e-3;
        this.position.copy(camera.position);
    }
}