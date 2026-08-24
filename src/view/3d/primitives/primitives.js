import {
    Vector3, BufferAttribute, TorusGeometry, LineBasicMaterial, Line, TubeGeometry,
    MeshStandardMaterial, SphereGeometry, Mesh, BufferGeometry,
    CylinderGeometry, ConeGeometry, BoxGeometry, Color, Curve, Quaternion
} from "three";
import { Renderable3D } from "../../renderer.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import {Vec3} from "../../../model/math/math.js";
import {ColorMappers} from "../../colormappers.js";

export class VisibleWhen extends Renderable3D {
    constructor(view, predicate) {
        super();

        this._view = view;
        this._predicate = predicate;

        this.add(view);
    }

    canBindTo(model) {
        return this._view.canBindTo(model);
    }

    synchronizeWith(model) {
        this.visible = this._predicate(model);

        if (this.visible)
            this._view.synchronizeWith(model);
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

export class Trail extends Renderable3D {
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
        this._previousPosition = null;
    }

    initialize(body) {
        this._previousPosition = body.position.clone();
        this._renew();
        this.startAt(body.position);
    }

    canBindTo(model) {
        if (!model.position)
            throw new Error("Trail can only bind to bodies with a position.");
        return true;
    }

    reset() {
        this.dispose();
        this._renew();
    }

    startAt(position) {
        this._trailAccumulator = 0;
        this._previousPosition.copy(position);
        this._trail.addPoint(position);
    }

    synchronizeWith(body) {
        if (this._previousPosition.x === body.position.x &&
            this._previousPosition.y === body.position.y &&
            this._previousPosition.z === body.position.z)
            return; // When body's position remains unchanged, do NOT update the trail

        this._trailAccumulator++;
        if (this._trailAccumulator >= this._trailStep) {
            this._trail.addPoint(body.position);
            this._previousPosition.copy(body.position);
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

    set color(value) {
        this._color = value;

        if (this._trail?._line?.material)
            this._trail._line.material.color.set(value);
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
export class Sphere extends Renderable3D {
    constructor({
        color = 0xffff00,
        opacity = 1,
        wireframe = false,
        visible = true,
        material = new MeshStandardMaterial({
            color: color,
            opacity: opacity,
            transparent: true,
            wireframe: wireframe,
            visible: visible,
            roughness: 0.2,
            metalness: 0.8
        }),
        segments = 24,
        castShadow = false,
    } = {}) {
        super();
        this._mesh = new Mesh(new SphereGeometry(1, segments, segments), material);
        this._mesh.castShadow = castShadow;
        this.add(this._mesh);
        this.visible = visible;
    }

    canBindTo(body) {
        if (!body.position || !body.radius)
            throw new Error("Sphere can only bind to bodies with a position and a radius.");
        return true;
    }

    synchronizeWith(body) {
        this.position.copy(body.position);
        this.scale.setScalar(body.radius);
    }

    get radius() { return this._radius; }
    get color() { return this._mesh.material.color; }

    set radius(newRadius) { this._radius = newRadius; }
    set color(newColor) { this._mesh.material.color.set(newColor); }
}

/**
 * Arrow is a 3D view of the axis property of a body.
 * It uses an Arrow to represent the vector, with the arrow's position at the body's position,
 * and the arrow's direction and length determined by the vector property.
 *
 * origin
 *    │
 *    │ shaft
 *    │
 *    ├─────────┐
 *    │         │ head
 *    │         ▼
 *    └─────────●  ← exact arrowLength
 *
 * The arrow's color and size can be customized, and the arrow can be made visible or invisible.
 * The vector property is a function that takes a body and returns a Vec3 representing the vector.
 * The magnitude of the vector can be mapped to a different scale using the magnitudeMap function.
 * The color of the arrow can be mapped to a different color using the colorMap function.
 */
export class Arrow extends Renderable3D {
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
        material = new MeshStandardMaterial({
            roughness: 0.5,
            metalness: 0.35,
            emissive: new Color(0x888888),
            emissiveIntensity: 0.2,
            envMapIntensity: 1.2,
            transparent: true,
        })} = {}) {
        super();

        const shaftGeometry = round
            ? Arrow.ShaftGeometryRound
            : Arrow.ShaftGeometrySquare;

        const headGeometry = round
            ? Arrow.HeadGeometryRound
            : Arrow.HeadGeometrySquare;

        this._material = material;
        this._material.color.set(color);
        this._material.opacity = opacity;
        this._shaft = new Mesh(shaftGeometry, this._material);
        this._head = new Mesh(headGeometry, this._material);

        this._shaft.castShadow = castShadow;
        this._head.castShadow = castShadow;

        if (!round)
            this._head.rotation.y = Math.PI / 4;

        this.add(this._shaft, this._head);
        this.visible = visible;
        this._size = size;
        this._shaftRadius = 0.3 * size;
        this._headRadius = 0.75 * size;
        this._headLength = size;
        this._magnitudeMap = magnitudeMap;
        this._tempAxis = new Vector3();
    }

    canBindTo(body) {
        if (!body.position || !body.axis)
            throw new Error("Arrow can only bind to bodies with a position and an axis.");
        return true;
    }

    synchronizeWith(body) {
        this.setVector(body.position, body.axis);
    }

    setVector(position, vector) {
        this.position.copy(position);
        this._tempAxis.copy(vector);
        const magnitude = this._tempAxis.length();

        if (magnitude < 1e-12) {
            this._shaft.scale.set(0, 0, 0);
            this._head.scale.set(0, 0, 0);
            return;
        }

        const arrowLength = this._magnitudeMap(magnitude);
        const shaftLength = Math.max(arrowLength - this._headLength, 0);

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

    set opacity(opacity) { this._material.opacity = opacity; }
    set color(color) { this._material.color.set(color); }
}

/**
 * VectorView is a 3D view of a vector property of a body (other than axis),
 * such as velocity or acceleration. It passes this property on to the Arrow class,
 * as if it had an axis property.
 */
export class VectorView extends Renderable3D {
    constructor({
        vectorProperty = body => body.velocity,
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

        this._vectorPropertyOf = vectorProperty;
        this._arrow = new Arrow({ color,size, opacity, round, visible, castShadow, magnitudeMap, colorMap });
        this.add(this._arrow);
    }

    canBindTo(body) {
        if (!body.position || !this._vectorPropertyOf)
            throw new Error("VectorView can only bind to bodies with a position and a vector property.");
        return true;
    }

    synchronizeWith(body) {
        this._arrow.visible = this.visible;
        this._arrow.setVector(body.position, this._vectorPropertyOf(body));
    }
}

//
// Cylinder
//
export class Cylinder extends Renderable3D {
    constructor({
        color = 0xffff00,
        opacity = 1,
        segments = 24,
        castShadow = false,
        material = new MeshStandardMaterial({
            color,
            opacity,
            transparent: opacity < 1
        }),
        radiusFunction = body => body.radius
    } = {}) {
        super();
        const geometry = new CylinderGeometry(1, 1, 1, segments);
        this._mesh = new Mesh(geometry, material);
        this._mesh.castShadow = castShadow;
        this.add(this._mesh);
        this._direction = new Vector3();
        this._radiusFunction = radiusFunction;
    }

    canBindTo(body) {
        if (!body.position || !body.axis)
            throw new Error("Cylinder can only bind to bodies with a position and an axis.");
        return true;
    }

    synchronizeWith(body) {
        this.position.copy(body.position);
        this._direction.copy(body.axis);

        const length = this._direction.length();
        const scale = this._radiusFunction(body);
        this.scale.set(scale, length, scale);
        this.quaternion.setFromUnitVectors(Arrow.UP, this._direction.normalize());
        this.position.add(this._direction.multiplyScalar(length * .5));
    }
}

//
// Box
//
export class Box extends Renderable3D {
    constructor({
        color = 0xff0000,
        opacity = 1,
        visible = true,
        castShadow = false
    } = {}) {
        super();
        this._mesh = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshStandardMaterial({
                color: color,
                transparent: true,
                opacity: opacity,
                depthTest: true
            }));
        this.add(this._mesh);
        this._mesh.castShadow = castShadow;
        this.visible = visible;
    }

    canBindTo(body) {
        if (!body.position || !body.size || !body.size.x || !body.orientation)
            throw new Error("Box can only bind to bodies with a position, size, and orientation.");
        return true;
    }

    synchronizeWith(body) {
        this.position.copy(body.position);
        this.scale.copy(body.size);
        this.rotation.set(body.orientation.x, body.orientation.y, body.orientation.z);
    }
}

//
// Ring
//
export class Ring extends Renderable3D {
    constructor({
        color = 0xffff00,
        thickness = 0.1,
        radialSegments = 16,
        tubularSegments = 32
    } = {}) {
        super();
        const geometry = new TorusGeometry(1, thickness, radialSegments, tubularSegments);
        const material = new MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.75
        });
        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);
        this._direction = new Vector3();
    }

    canBindTo(body) {
        if (!body.position || !body.axis || !body.radius)
            throw new Error("Ring can only bind to bodies with a position, axis, and radius.");
        return true;
    }

    synchronizeWith(body) {
        this.position.copy(body.position);
        this.scale.setScalar(body.radius);
        this._direction.set(body.axis.x, body.axis.y, body.axis.z);
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

        this._quaternion = new Quaternion();
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
        this._quaternion.setFromUnitVectors(Arrow.FORWARD, this._direction);
        point.applyQuaternion(this._quaternion);

        return point.add(this.start);
    }
}

export class Helix extends Renderable3D {
    static up = new Vector3(0, 0, 1);
    constructor({
        color = 0x00ffff,
        coils = 20,
        longitudinalOscillation = false,
        tubularSegments = 400,
        radialSegments = 16,
        thickness = 0.05, // Percentage of the spring radius
        visible = true,
        radiusFunction = pair => .75 * Math.min(pair.body1.radius, pair.body2.radius),
        castShadow = false
    } = {}) {
        super();
        this._longitudinalOscillation = longitudinalOscillation;
        this._tubularSegments = tubularSegments;
        this._radialSegments = radialSegments;
        this._thickness = thickness;
        this._coils = coils;
        this._color = color;
        this._castShadow = castShadow;
        this._radiusFunction = radiusFunction;
        this.visible = visible;

        // Reusable math objects
        this._targetDir = new Vector3();
        this._curve = null;
        this._restLength = 1;
        this._radius = 1;
    }

    initialize(bodyPair) {
        this._restLength = bodyPair.axis.length();
        this._radius = this._radiusFunction(bodyPair);
        this._curve = new Coils(
            new Vector3(0, 0, 0),
            new Vector3(0, 0, bodyPair.axis.length()),
            this._coils,
            this._radius,
            0
        );

        const geometry = new TubeGeometry(
            this._curve,
            this._tubularSegments,
            this._radius * this._thickness,
            this._radialSegments,
            false
        );

        const material = new MeshStandardMaterial({
            color: this._color, metalness: 0.3, roughness: 0.4
        });
        this._mesh = new Mesh(geometry, material);
        this._mesh.castShadow = this._castShadow;
        this.add(this._mesh);
    }

    canBindTo(body) {
        if (!body.position || !body.axis)
            throw new Error("Helix can only bind to bodies with a position and an axis.");
        return true;
    }

    #regenerateTube() {
        this._mesh.geometry.dispose();
        this._mesh.geometry = new TubeGeometry(this._curve, this._tubularSegments, this._radius * this._thickness, this._radialSegments, false);
    }

    synchronizeWith(body) {
        this.position.copy(body.position);

        if (this._longitudinalOscillation) {
            this._curve.radius = this._radius;
            this._curve.updateAxis(body.axis);

            // Longitudinal wave amplitude coupled to spring elongation
            this._curve.wavePhase = body.time * 4;
            const displacement = body.axis.y - this._curve.start.y;
            this._curve.waveAmp = Math.min(Math.abs(displacement) / 10, 0.3); // max amplitude 0.3
            this.#regenerateTube();
        } else {
            // Rotate mesh so local +Z aligns with bond axis
            this._targetDir.copy(body.axis).normalize();
            this.quaternion.setFromUnitVectors(Helix.up, this._targetDir)
            this.scale.set(1, 1, body.axis.length() / this._restLength);
        }
    }
}

export class Label extends Renderable3D {
    constructor({
        text = model => "" ,
        offset = model => new Vec3(),
        color = "#ffff00",
        fontSize = "16px",
        visible = true
    } = {}) {
        super();

        this._element = document.createElement("div");
        this._element.className = "helionLabel";

        Object.assign(this._element.style, {
            color,
            fontSize,
            margin: "0",
            padding: "0",
            lineHeight: "normal",
            whiteSpace: "nowrap"
        });

        this._label = new CSS2DObject(this._element);
        this._label.center.set(0.5, 0.5);
        this._text = text;
        this._offset = offset;
        this._position = new Vec3();
        this.add(this._label);
        this.visible = visible;
    }

    canBindTo(model) {
        if(model.position === undefined)
            throw new Error("A label can only bind to bodies with a position");
        return true;
    }

    initialize(model) {
        this._position = model.position.clone();
    }

    synchronizeWith(model) {
        this._position.copy(model.position.clone().add(this._offset(model)));
        this._label.position.set(this._position.x, this._position.y, this._position.z ? this._position.z : 0);
        this._element.textContent = this._text(model);
    }

    dispose() {
        this.remove(this._label);
        this._label = null;
        this._element = null;

        this.clear();
    }
}