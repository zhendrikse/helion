import {
    Simulation, PointCloud, PointCloudView, PointCloudMaterial,
    Slider, Range, Button, Colour, Vec3
} from '../../../src/index.js';

const TOTAL_POINTS = 200000;
let iterationsPerFrame = 200;
class BarnsleyFern3D extends PointCloud {
    constructor() {
        super({
            positions: new Array(TOTAL_POINTS).fill(null).map(() => new Vec3()),
            colors: new Array(TOTAL_POINTS).fill(null).map(() => Colour.Green),
            sizes: new Array(TOTAL_POINTS).fill(0.02)
        });
        this._positionVec = new Vec3();
        this._pointIndex = 0;
        this._completed = false;
    }

    reset() {
        this._positionVec.set(0.5, 0.0, -0.2);
        this._pointIndex = 0;
        this._completed = false;
        for (let i = 0; i < this._positions.length; i++)
            this._positions[i].set(0, 0, 0);
    }

    transform() {
        const r = Math.random();
        let transformedVec = new Vec3();
        const position = this._positionVec;
        if (r <= 0.1)
            transformedVec.set(0.0, 0.18 * position.y, 0.0);
        else if (r <= 0.7)
            transformedVec.set(0.85 * position.x, 0.85 * position.y + 0.1 * position.z + 1.6, -0.1 * position.y + 0.85 * position.z);
        else if (r <= 0.85)
            transformedVec.set(0.2 * position.x - 0.2 * position.y, 0.2 * position.x + 0.2 * position.y + 0.8, 0.3 * position.z);
        else
            transformedVec.set(-0.2 * position.x + 0.2 * position.y, 0.2 * position.x + 0.2 * position.y + 0.8, 0.3 * position.z);

        return transformedVec;
    }

    apply() {
        if (this._completed) return;

        const newPosition = new Vec3();
        for (let i = 0; i < iterationsPerFrame; i++) {
            this._positionVec.copy(this.transform());
            newPosition.set(4.0 * this._positionVec.x, 2.0 * this._positionVec.y - 7, this._positionVec.z);

            if (this._pointIndex >= this._positions.length) {
                this._completed = true;
                break;
            }
            this._positions[this._pointIndex].copy(newPosition);
            this._pointIndex++;
        }
    }
}

const fern3D = new BarnsleyFern3D();
let pointsCounter = 0;
const simulation = Simulation
    .with({
        htmlDivId: 'barnsleyFernContainer',
        camera: {
            position: new Vec3(15, 5, 7).multiplyScalar(2.05),
            fieldOfView: 30
        },
        viewport: { parameterMenuCollapsed: false },
        headUpDisplay: { enabled: false },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🌿 3D Barnsley Fern</strong><br/>' +
                'Iterated Function System in 3D — four affine transformations with probabilities 10%, 60%, 15%, 15%.'
        }
    })
    .bind(fern3D.alwaysWith(new PointCloudView({
        material: PointCloudMaterial.stars()
    })))
    .onReset(() => pointsCounter = 0)
    .runsEvery(0.01)
    .onStep(() => {
        if (pointsCounter >= TOTAL_POINTS)
            return;
        fern3D.apply();
        pointsCounter += iterationsPerFrame;
        simulation.setBottomText(`Points: ${pointsCounter} (${100 * pointsCounter / TOTAL_POINTS} %)`)
    })
    .append(new Slider('Iterations/frame')
        .withRange(new Range(50, 500, 1))
        .withValue(iterationsPerFrame)
        .onInput(value => iterationsPerFrame = value))
    .append(new Button('Reset')
        .withText('Reset')
        .onClick(() => fern3D.reset()))
    .start();