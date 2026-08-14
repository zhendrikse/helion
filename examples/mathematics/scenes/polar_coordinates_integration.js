import { Box3, MathUtils } from "three";
import {
    Simulation, Vec3, Block, toCartesian, BlockSegments, BoxSegmentsView, Slider, Range
} from "../../../src/index.js";

const R = 1, da = 0.05;
const functionToIntegrate = (theta, phi) => theta * theta * (phi - Math.PI) * (phi - Math.PI);

class SegmentedSphere extends BlockSegments {
    constructor() {
        super();
        this._thetaPhi = [];
        this._thetaMin = 0;
        this._thetaMax = 180;
        this._phiMin = 0;
        this._phiMax = 360;

        const values = [];
        for (let theta = 0; theta <= Math.PI; theta += da)
            for (let phi = 0; phi <= 2 * Math.PI; phi += da)
                this.#createCell(theta, phi, values);
        this._minF = Math.min(...values);
        this._maxF = Math.max(...values);
    }

    #createCell(theta, phi, values) {
        const val = functionToIntegrate(theta, phi);
        values.push(val);
        this.push(new Block({
            position: toCartesian(R, theta, phi),
            size: new Vec3(da, da, da)
        }));
        this._thetaPhi.push({theta:theta, phi:phi});
    }

    segmentVisibleAt(index) {
        const t = this._thetaPhi[index].theta;
        const p = this._thetaPhi[index].phi;
        return (
            t >= MathUtils.degToRad(this._thetaMin) &&
            t <= MathUtils.degToRad(this._thetaMax) &&
            p >= MathUtils.degToRad(this._phiMin) &&
            p <= MathUtils.degToRad(this._phiMax)
        );
    }

    set thetaMin(value) {
        this._thetaMin = value;
        console.log(this.integrate(functionToIntegrate));
    }

    integrate(func) {
        let sum = 0;
        for (let index = 0; index < this.count; index++) {
            const {theta, phi} = this.thetaPhiAt(index);
            if (this.segmentVisibleAt(index))
                sum += func(theta, phi) * Math.sin(this._thetaPhi[index].theta);
        }
        return sum * R * R * da * da;
    }

    get minF() { return this._minF; }
    get maxF() { return this._maxF; }

    thetaPhiAt(index) { return this._thetaPhi[index]; }
}
const sphere = new SegmentedSphere();

const updateIntegral = () =>
    document.getElementById("integral-title").textContent = "Integral evaluates to: " + sphere.integrate(views).toFixed(2);

const sphereView = new BoxSegmentsView({
    opacity: 0.35,
    colorMapper: (segment, index, targetColor) => {
        const {theta, phi} = sphere.thetaPhiAt(index);
        const value = functionToIntegrate(theta, phi);
        const t = (value - sphere.minF) / (sphere.maxF - sphere.minF);
        targetColor.setRGB(1 - t, t, 0);
    },
    visibilityMapper: (segment, index) => sphere.segmentVisibleAt(index)
});


const simulation = Simulation
    .with({
        htmlDivId: "polarCoordinatesIntegration",
    })
    .bind(sphere.onceWith(sphereView))
    .append(new Slider("θ_min")
        .on(sphere)
        .withProperty("thetaMin")
        .withValue(0)
        .withRange(new Range(0, 180, 1))
    );

// TODO
const boundingBox = new Box3();
boundingBox.setFromObject( sphereView );
simulation.provideAxesAround({boundingBox: boundingBox})
simulation.frameSceneOn({boundingBox: boundingBox}, {padding: 1})
