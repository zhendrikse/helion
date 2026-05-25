import {
    Group, Vector3, BufferAttribute, TorusGeometry,
    MeshStandardMaterial, SphereGeometry, Mesh, BufferGeometry, LineBasicMaterial, Line, TubeGeometry,
    CylinderGeometry, ConeGeometry, BoxGeometry, Color, Curve, Quaternion, Points, ShaderMaterial,
    AdditiveBlending
} from "three";

import { VectorFieldVector } from "../../../math/math.js";

/*************
 * V I E W S *
 *************/

//
// Point cloud
//
export class PointCloudView extends Points {
    constructor() {
        super();
    }

    attachTo(pointCloud) {
        // Sanity checks
        if (!pointCloud.positionAt || !pointCloud.colorAt || !pointCloud.sizeAt)
            throw new Error("Body does not behave like a point cloud, hence it cannot be attached to this view.");

        const N = pointCloud.length;
        const positionAttr = new BufferAttribute(new Float32Array(3 * N), 3);
        const colorAttr = new BufferAttribute(new Float32Array(3 * N), 3);
        const sizeAttr = new BufferAttribute(new Float32Array(N), 1);

        for (let i = 0; i < N; i++) {
            const p = pointCloud.positionAt(i);
            const c = pointCloud.colorAt(i);

            positionAttr.setXYZ(i, p.x, p.y, p.z);
            colorAttr.setXYZ(i, c.r, c.g, c.b);
            sizeAttr.setX(i, pointCloud.sizeAt?.(i) ?? 1.0);
        }

        this.material = PointCloudView.defaultMaterial();
        this.geometry.setAttribute('position', positionAttr);
        this.geometry.setAttribute('color', colorAttr);
        this.geometry.setAttribute('size', sizeAttr);
    }

    render(transform) {
        // TODO: So far we do not have any dynamic point clouds
    }

    static defaultMaterial() {
        return new ShaderMaterial({
            vertexColors: true,
            transparent: true,
            depthTest: false,
            blending: AdditiveBlending,

            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(position);

                    vAlpha = 1.0 - smoothstep(0.0, 600.0, dist);
                    gl_PointSize = size * (1500.0 / length(mvPosition.xyz));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,

            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    float alpha = exp(-d * d * 10.0) * vAlpha;
                    if(alpha < 0.01)
                        discard;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `
        });
    }
}

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

