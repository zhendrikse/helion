import {
    Group, Vector3, BufferAttribute, TorusGeometry,
    MeshStandardMaterial, SphereGeometry, Mesh, BufferGeometry, LineBasicMaterial, Line, TubeGeometry,
    CylinderGeometry, ConeGeometry, BoxGeometry, Color, Curve, Quaternion
} from "three";

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
        this._previousPosition = null;
    }

    attachTo(body) {
        this._body = body;
        this._previousPosition = body.position.clone();
        this._renew();
    }

    reset() {
        this.dispose();
        this._renew();
    }

    render(increment = 1) {
        if (this._previousPosition.x === this._body.position.x &&
            this._previousPosition.y === this._body.position.y &&
            this._previousPosition.z === this._body.position.z)
            return; // When body's position remains unchanged, do NOT update the trail

        this._trailAccumulator += increment;
        if (this._trailAccumulator >= this._trailStep) {
            this._trail.addPoint(this._body.position);
            this._previousPosition.copy(this._body.position);
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
        this.visible = visible;
        this.castShadow = castShadow;
    }

    attachTo(body) {
        // Sanity checks
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
    }

    render() {
        this.position.copy(this._body.position);
        this.scale.setScalar(this._body.radius);
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
    static UP = new Vector3(0, 1, 0);
    static FORWARD = new Vector3(0, 0, 1);

    static ShaftGeometryRound = new CylinderGeometry(1, 1, 1, 16).translate(0, 0.5, 0);
    static ShaftGeometrySquare = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    static HeadGeometryRound = new ConeGeometry(1, 1, 16).translate(0, 0.5, 0);
    static HeadGeometrySquare = new ConeGeometry(1, 1, 4).translate(0, 0.5, 0);

    constructor({
        color = 0xff0000,
        size = 1,
        opacity = 1,
        round = false,
        visible = true,
        castShadow = false,
        magnitudeMap = magnitude => Math.max(magnitude, 0.1),
        colorMap = null
    } = {}) {
        super();

        const shaftGeometry = round
            ? Arrow.ShaftGeometryRound
            : Arrow.ShaftGeometrySquare;

        const headGeometry = round
            ? Arrow.HeadGeometryRound
            : Arrow.HeadGeometrySquare;

        this._material = new MeshStandardMaterial({
            color,
            roughness: 0.25,
            metalness: 0.35,
            emissive: new Color(0x333333),
            emissiveIntensity: 0.2,
            envMapIntensity: 1.2,
            transparent: true,
            opacity
        });

        this._shaft = new Mesh(shaftGeometry, this._material);
        this._head = new Mesh(headGeometry, this._material);

        this._shaft.castShadow = castShadow;
        this._head.castShadow = castShadow;

        if (!round)
            this._head.rotation.y = Math.PI / 4;

        this.add(this._shaft, this._head);
        this.visible = visible;
        this._body = null;
        this._size = size;
        this._shaftRadius = 0.3 * size;
        this._headRadius = 0.75 * size;
        this._headLength = size;
        this._magnitudeMap = magnitudeMap;
        this._colorMap = colorMap;
        this._tempAxis = new Vector3();
    }

    attachTo(body) {
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");

        this._body = body;
    }

    render() {
        if (!this._body)
            return;

        this.position.copy(this._body.position);
        this._tempAxis.copy(this._body.axis);
        const magnitude = this._tempAxis.length();

        if (magnitude < 1e-12) {
            this._shaft.scale.set(0, 0, 0);
            this._head.scale.set(0, 0, 0);
            return;
        }

        this.visible = true;
        const shaftLength = this._magnitudeMap(magnitude);

        if (this._colorMap) {
            const color = this._colorMap(this._tempAxis, magnitude);
            this._material.color.copy(color);
        }

        this.quaternion.setFromUnitVectors(Arrow.UP, this._tempAxis.normalize());
        this._shaft.scale.set(this._shaftRadius, shaftLength, this._shaftRadius);

        this._head.scale.set(this._headRadius, this._headLength, this._headRadius);
        this._head.position.y = shaftLength;
    }

    dispose() {
        this._material?.dispose();

        this.remove(this._shaft);
        this.remove(this._head);

        this._shaft = null;
        this._head = null;
        this._material = null;

        this.clear();
    }

    get body() { return this._body; }
    set opacity(opacity) { this._material.opacity = opacity; }
    set color(color) { this._material.color.set(color); }
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
        this._direction = new Vector3();
    }

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
    }

    render() {
        this.position.copy(this._body.position);
        this._direction.copy(this._body.axis);

        const length = this._direction.length();
        this.scale.set(this._body.radius, this._direction.length(), this._body.radius);
        this.quaternion.setFromUnitVectors(Arrow.UP, this._direction.normalize());
        this.position.add(this._direction.multiplyScalar(length * .5));
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
        this._body = null;
    }

    attachTo(body) {
        // Sanity checks
        if (!body.size || body.size.x === undefined)
            throw new Error("Body does not have size (vector), hence it cannot be attached to this view.");

        this._body = body;
    }

    render() {
        this.position.copy(this._body.position);
        this.scale.copy(this._body.size);
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

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
        this._direction = new Vector3();
    }

    render() {
        this.position.copy(this._body.position);

        this.scale.setScalar(this._body.radius);

        this._direction.copy(this._body.axis);
        this._direction.normalize();
        this.quaternion.setFromUnitVectors(Arrow.FORWARD, this._direction);
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
        this._axis = new Vector3();
    }

    attachTo(body) {
        // Sanity checks
        if (!body.axis)
            throw new Error("Body does not have an axis, hence it cannot be attached to this view.");
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to this view.");

        this._body = body;
    }

    #regenerateTube() {
        this.geometry.dispose();
        this.geometry = new TubeGeometry(this._curve, this._tubularSegments, this._thickness, this._radialSegments, false);
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

    render() {
        this.position.copy(this._body.position);
        this._curve.radius = this._body.radius;

        this._axis.copy(this._body.axis);
        this._curve.updateAxis(this._axis);
        this._longitudinalOscillation ?
            this.#updateWithLongitudinal() :
            this.#updateWithoutLongitudinal();
    }
}
