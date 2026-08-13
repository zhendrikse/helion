import { Color, Group, Box3, MathUtils } from "three";
import {Simulation, Vec3, Block, toCartesian, Box, BlockSegments, BoxSegmentsView} from "../../../src/index.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const R = 1, da = 0.05;
const functionToIntegrate = (theta, phi) => theta * theta * (phi - Math.PI) * (phi - Math.PI);
const params = {
    thetaMin: 0,
    thetaMax: 180,
    phiMin: 0,
    phiMax: 360,
    opacity: 0.35
};
const views = [];

function updateVisibility() {
    for (let i = 0; i < sphere.count; i++) {
        const cell = sphere.cellAt(i);
        const t = sphere.userDataAt(i).theta;
        const p = sphere.userDataAt(i).phi;
        cell.visible = (
            t >= MathUtils.degToRad(params.thetaMin) &&
            t <= MathUtils.degToRad(params.thetaMax) &&
            p >= MathUtils.degToRad(params.phiMin) &&
            p <= MathUtils.degToRad(params.phiMax)
        );
    }
}

class ControlsGui {
    constructor() {
        const gui = new GUI({width: "100%", autoPlace: false});

        gui.add(params, "thetaMin", 0, 180, 1)
            .name("θ_min")
            .onChange(value => { updateVisibility(); updateIntegral(); });

        gui.add(params, "thetaMax", 0, 180, 1)
            .name("θ_max)")
            .onChange(value => { updateVisibility(); updateIntegral(); });

        gui.add(params, "phiMin", 0, 360, 1)
            .name("φ_min")
            .onChange(value => { updateVisibility(); updateIntegral(); });

        gui.add(params, "phiMax", 0, 360, 1)
            .name("φ_max")
            .onChange(value => { updateVisibility(); updateIntegral(); });

        gui.add(params, "opacity", 0, 1, .01)
            .name("Opacity")
            .onChange(value => { cells.forEach(cell => cell.material.opacity = parseFloat(value)); });

        // const axesFolder = gui.addFolder("Axes");
        // const dummyToggle = {gridPlanes: true};
        // axesFolder.add(params.axesParameters, 'frame')
        //     .name("Frame").onChange(value => axesController.updateSettings());
        // axesFolder.add(dummyToggle, 'gridPlanes')
        //     .name("Layout").onChange(value => {
        //     params.axesParameters.xyPlane = value;
        //     params.axesParameters.xzPlane = value;
        //     params.axesParameters.yzPlane = value;
        //     axesController.updateSettings();
        // });
        // axesFolder.add(params.axesParameters, 'annotations')
        //     .name("Annotations").onChange(value => axesController.updateSettings());
        // axesFolder.close();

        simulation._viewport.canvasWrapper.appendChild(gui.domElement);
    }
}

class SegmentedSphere extends BlockSegments {
    constructor() {
        super();
        this._userData = [];
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
        this._userData.push({theta:theta, phi:phi, val});
    }

    integrate(views) {
        let sum = 0;
        for (let i = 0; i < views.length; i++)
            if (views[i].visible)
                sum += this._userData[i].val * Math.sin(this._userData[i].theta);
        return sum * R * R * da * da;
    }

    get minF() { return this._minF; }
    get maxF() { return this._maxF; }

    userDataAt(index) { return this._userData[index]; }
}
const sphere = new SegmentedSphere();

const updateIntegral = () =>
    document.getElementById("integral-title").textContent = "Integral evaluates to: " + sphere.integrate(views).toFixed(2);

const color = new Color();
for (let i = 0; i < sphere.count; i++) {
    const t = (sphere.userDataAt(i).val - sphere.minF) / (sphere.maxF - sphere.minF);
    color.setRGB(1 - t, t, 0);
    const box = new Box({
        opacity: 0.35,
        color: color
    });
    views.push(box);
}

const sphereView = new BoxSegmentsView({count: sphere.count, opacity: 0.35});

const boundingBox = new Box3();
boundingBox.setFromObject( sphereView );
boundingBox.expandByScalar(.5 * R, .5 * R, .5 * R);

const simulation = Simulation
    .with({
        htmlDivId: "polarCoordinatesIntegration",
    })
    .provideAxesAround({boundingBox: boundingBox})
    .frameSceneOn({boundingBox: boundingBox}, {padding: 1})
    .bind(sphere.onceWith(sphereView));
