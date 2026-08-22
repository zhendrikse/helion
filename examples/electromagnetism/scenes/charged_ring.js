import { Color } from "three";
import {
    RadialSymmetricBody, AxialSymmetricBody, Range, Simulation, EC,
    Sphere, CylinderSegmentsView, ArrowField, Vec3, Trail, VectorField, CoulombForce, Segments
} from "../../../src/index.js";

const K = 9e9;

class ChargedRing extends Segments {
    constructor({
        radius = 0.5e-10,
        segments = 60,
        charge = EC
    } = {}) {
        super();
        const points = this._createSegmentPositions(segments, radius);
        this._createSegments(segments, points, charge, radius);
    }

    _createSegments(segments, points, charge, radius) {
        for (let i = 0; i < segments; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const axis = p2.clone().sub(p1);
            this.push(new AxialSymmetricBody({
                position: p1.clone().add(p2).multiplyScalar(0.5),
                axis,
                radius: radius * 2.51e-2,
                charge: charge / segments
            }));
        }
    }

    _createSegmentPositions(segments, radius) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            points.push(new Vec3(radius * Math.cos(theta), radius * Math.sin(theta), 0));
        }
        return points;
    }

    fieldAt(position) {
        const field = new Vec3();

        for (const segment of this) {
            const r = segment.position.clone().sub(position);
            const r2 = r.lengthSq();
            if (r2 < 3e-23) // Cut off arrows that are too close to the ring, i.e. that are too big!
                continue;

            field.add(r.normalize().multiplyScalar(K * segment.charge / r2));
        }

        return field;
    }
}

//
// Physics
//
class RingElectricField extends VectorField {
    constructor(ring) {
        super();
        this._ring = ring;
        this._strength = 1;
    }

    sample(position, target) {
        target.copy(this._ring.fieldAt(position).multiplyScalar(this._strength));
    }

    set strength(value) { this._strength = value; }
}

const radius = 0.5e-10;
const ring = new ChargedRing({ radius, segments: 60 });
const electricField = new RingElectricField(ring);
const electricForce = CoulombForce.in(electricField);

const electron = new RadialSymmetricBody({
    position: new Vec3(
        (Math.random() - 0.5) * radius * 3,
        (Math.random() - 0.5) * radius * 3,
        radius + (Math.random() - 0.5) * radius * 3
    ),
    mass: 9.1093837e-31,
    charge: EC,
    radius: radius / 20
});

//
// View model
//
const electronSphere = new Sphere({ color: "yellow" });
const arrowField = new ArrowField({
    xRange: new Range(-radius * 1.5, radius * 1.5, radius / 4),
    yRange: new Range(-radius * 1.5, radius * 1.5, radius / 4),
    zRange: new Range(-radius * 1.5, radius * 1.5, radius / 6),
    scaleFactor: 2.5e-16,
    magnitudeMap: magnitude => Math.sqrt(1 + 1e-3 * magnitude),
    colorMap: (axis, magnitude) => {
        const radial = axis.clone().normalize();
        const t = Math.min(Math.sqrt(1 + magnitude) * 1.25e-6, 1);
        return radial.z > 0
            ? new Color().setHSL(0.0, 1, -0.5 * t + 1)
            : new Color().setHSL(0.66, 1, -0.5 * t + 1);
    },
    // colorMap: (axis, magnitude) => new Color().setHSL(Math.min(Math.sqrt(1 + magnitude) * 5e-7, 1), 1, 0.5),
    round: true
});

Simulation
    .with({
        htmlDivId: "chargedRingContainer",
        camera: {
            position: new Vec3(15, 5, 20),
            fieldOfView: 22,
        },
        scene: {
            scale: 5e10,
        }
    })
    .withMouseClickEventListener()
    .bind(electron.alwaysWith(electronSphere))
    .bind(electron.alwaysWith(new Trail({ maxPoints: 150, color: electronSphere.color })))
    .bind(electricField.onceWith(arrowField))
    .bind(ring.onceWith(new CylinderSegmentsView()))
    .runsEvery(3e-3)
    .advancesBy(3e-19)
    .substeps(5)
    .onStep((_, dt) => {
        electron
            .apply(electricForce)
            .integrate(dt);
    });


