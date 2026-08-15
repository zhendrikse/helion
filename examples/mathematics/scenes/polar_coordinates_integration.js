import { Box3, MathUtils } from "three";
import {
    Simulation, Vec3, Block, toCartesian, BlockSegments, BoxSegmentsView, Slider, Range, Interval
} from "../../../src/index.js";

const functionToIntegrate = (theta, phi) => theta * theta * (phi - Math.PI) * (phi - Math.PI);
const integralValueDiv = document.createElement("div");

class SegmentedSphere extends BlockSegments {
    constructor(radius = 1, da = 0.05) {
        super();
        this._thetaPhi = [];
        this._thetaMin = 0;
        this._phiMin = 0;
        this._thetaMax = 180;
        this._phiMax = 360;
        this._radius = radius;
        this._da = da;

        const values = [];
        for (let theta = 0; theta <= Math.PI; theta += da)
            for (let phi = 0; phi <= 2 * Math.PI; phi += da)
                this.#createCell(theta, phi, values);
        this._interval = new Interval(Math.min(...values), Math.max(...values));
    }

    updateIntegral = (value) =>
        integralValueDiv.textContent = "Integral evaluates to: " + Number(value).toFixed(2);

    #createCell(theta, phi, values) {
        const val = functionToIntegrate(theta, phi);
        values.push(val);
        this.push(new Block({
            position: toCartesian(this._radius, theta, phi),
            size: new Vec3(this._da, this._da, this._da)
        }));
        this._thetaPhi.push({theta:theta, phi:phi});
    }

    segmentVisibleAt(index) {
        const {theta, phi} = this.thetaPhiAt(index);
        return (
            theta >= MathUtils.degToRad(this._thetaMin) &&
            theta <= MathUtils.degToRad(this._thetaMax) &&
            phi >= MathUtils.degToRad(this._phiMin) &&
            phi <= MathUtils.degToRad(this._phiMax)
        );
    }

    normalize = (value) => this._interval.normalize(value);

    set thetaMax(value) {
        this._thetaMax = value;
        this.updateIntegral(this.integrate(functionToIntegrate));
    }

    set phiMin(value) {
        this._phiMin = value;
        this.updateIntegral(this.integrate(functionToIntegrate));
    }

    set phiMax(value) {
        this._phiMax = value;
        this.updateIntegral(this.integrate(functionToIntegrate));
    }

    set thetaMin(value) {
        this._thetaMin = value;
        this.updateIntegral(this.integrate(functionToIntegrate));
    }
    get phiMin() { return this._phiMin; }
    get phiMax() { return this._phiMax; }
    get thetaMin() { return this._thetaMin; }
    get thetaMax() { return this._thetaMax; }

    integrate(func) {
        let sum = 0;
        for (let index = 0; index < this.count; index++) {
            const {theta, phi} = this.thetaPhiAt(index);
            if (this.segmentVisibleAt(index))
                sum += func(theta, phi) * Math.sin(theta);
        }
        return sum * this._radius * this._radius * this._da * this._da;
    }

    thetaPhiAt(index) { return this._thetaPhi[index]; }
}

const sphere = new SegmentedSphere();
const sphereView = new BoxSegmentsView({
    opacity: 0.75,
    colorMapper: (segment, index, targetColor) => {
        const {theta, phi} = sphere.thetaPhiAt(index);
        const value = functionToIntegrate(theta, phi);
        const t = sphere.normalize(value);
        targetColor.setRGB(.2 - t, t, t * .25);
    },
    visibilityMapper: (segment, index) => sphere.segmentVisibleAt(index)
});

const simulation = Simulation
    .with({
        htmlDivId: "polarCoordinatesIntegration",
    })
    .bind(sphere.onceWith(sphereView))
    .provideAxesAround(sphereView)
    .frameSceneOn(sphereView, {padding: 1, translationY: -1.5})
    .append(new Slider("θ_min")
        .on(sphere)
        .withProperty("thetaMin")
        .withRange(new Range(0, 180, 1))
        .withValue(sphere.thetaMin)
    )
    .append(new Slider("θ_max")
        .on(sphere)
        .withProperty("thetaMax")
        .withRange(new Range(0, 180, 1))
        .withValue(sphere.thetaMax)
    )
    .append(new Slider("φ_min")
        .on(sphere)
        .withProperty("phiMin")
        .withRange(new Range(0, 360, 1))
        .withValue(sphere.phiMin)
    )
    .append(new Slider("φ_max")
        .on(sphere)
        .withProperty("phiMax")
        .withRange(new Range(0, 360, 1))
        .withValue(sphere.phiMax)
    );

simulation._viewport.controlsDiv.append(integralValueDiv);
sphere.updateIntegral(sphere.integrate(functionToIntegrate));
