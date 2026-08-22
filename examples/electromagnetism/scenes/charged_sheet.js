import { Color } from "three";
import {
    Block, RadialSymmetricBody, Range, Sphere, Trail, ArrowField,
    EC, Simulation, Vec3, CoulombForce, VectorField, Segments, BoxSegmentsView
} from "../../../src/index.js";

const K = 9e9;

class ChargedSheet {
    constructor({
        size = 0.5e-10,
        segments = 40,
        charge = EC
    } = {}) {
        this.size = size;
        this.charge = charge;
        this._segments = new Segments();

        const dx = size / segments;
        const dq = charge / (segments * segments);
        for (let i = 0; i < segments; i++)
            for (let j = 0; j < segments; j++)
                this._segments.push(new Block({
                    position: new Vec3(-0.5 * size + i * dx, -0.5 * size + j * dx, 0),
                    charge: dq,
                    size: new Vec3(3.25, 3.25, 1).multiplyScalar(dx * .25)
                }));
    }

    fieldAt(position) {
        const field = new Vec3();
        for (const segment of this._segments) {
            const r = segment.position.clone().sub(position);
            const r2 = r.lengthSq();

            if (r2 < 1e-24)
                continue; // avoid infinities close to sheet

            field.add(r.normalize().multiplyScalar(K * segment.charge / r2));
        }

        return field;
    }

    get segments() { return this._segments; }
}

class SheetElectricField extends VectorField {
    constructor(sheet) {
        super();
        this._sheet = sheet;
    }

    sample(position, target) {
        target.copy(this._sheet.fieldAt(position));
    }
}

//
// Physics objects
//
const sheetSize = 0.5e-10;
const sheet = new ChargedSheet({
    size: sheetSize,
    segments: 40
});

const electricField = new SheetElectricField(sheet);
const coulombForce = CoulombForce.in(electricField);
const electron = new RadialSymmetricBody({
    position: new Vec3((Math.random() - 0.5) * sheetSize, (Math.random() - 0.5) * sheetSize, sheetSize * 0.75),
    velocity: new Vec3(),
    mass: 9.11e-31,
    charge: EC,
    radius: sheetSize / 35
});

const electronSphere = new Sphere({ color: 0xffff00 });
const arrowField = new ArrowField({
    xRange: new Range(-sheetSize, sheetSize, sheetSize / 6),
    yRange: new Range(-sheetSize, sheetSize, sheetSize / 6),
    zRange: new Range(-sheetSize, sheetSize, sheetSize / 6),
    scaleFactor: 1e-16,
    magnitudeMap: magnitude => Math.sqrt(1 + magnitude * 1e-3),
    colorMap: (axis) =>
        axis.z > 0
            ? new Color(0xff4444)
            : new Color(0x4444ff),
    round: true
});

Simulation
    .with({
        htmlDivId: "chargedSheetContainer",
        camera: {
            position: new Vec3(12, 8, 16),
            fieldOfView: 20
        },
        scene: {
            scale: 5e10
        }
    })
    .withMouseClickEventListener()
    .bind(electricField.onceWith(arrowField))
    .bind(electron.alwaysWith(electronSphere))
    .bind(electron.alwaysWith(new Trail({ maxPoints: 250, color: electronSphere.color })))
    .bind(sheet.segments.onceWith(new BoxSegmentsView({ opacity: 0.6, colorMapper: (_, _1, target) => target.setRGB(.2, .8, .2) })))
    .runsEvery(3e-3)
    .substeps(5)
    .advancesBy(5e-20)
    .onStep((_, dt) => {
        electron
            .apply(coulombForce)
            .integrate(dt);
    });
