import { Group, Vector3, Color, Scene, Box3 } from "three";
import { Arrow, AxesController, AxesParameters, Plot3DView, ThreeJsUtils } from '../js/three-js-extensions.js';
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const canvasContainer = document.getElementById("infiniteWellContainer");
const canvas = document.getElementById("infiniteWellCanvas");
const scene = new Scene();
const worldGroup = new Group();
scene.add(worldGroup);

const params = {
    groundState: 1,
    firstState: 1,
    secondState: 0,
    thirdState: 0
};

const axesParams = new AxesParameters({
    layoutType: 0,
    xyPlane: false,
    xzPlane: true,
    yzPlane: false,
    divisions: 10,
    axisLabels: ["x", "Im(Ψ)", "Re(Ψ)"],
    positiveXZ: true,
    annotations: true,
    tickLabels: false
});

class InfiniteWellWave extends Group {
    constructor(numPoints=40, L=20) {
        super();
        this._values = [];
        this._arrows = [];
        const dx = L / numPoints;
        for (let i = 0; i < numPoints; i++) {
            const x = i * dx;
            const arrow = new Arrow({
                position: new Vector3(x, 0, 0),
                axis: new Vector3(0, 1, 0),
                color: 0xff0000,
                shaftWidth: 0.05
            });
            this._arrows.push(arrow);
            this._values.push({real: 0, imag: 0});
            this.add(arrow);
        }

        this._weights = {ground: 1, first: 1, second: 0, third: 0};
        this._k = Math.PI / L;
        this._omega = Math.PI;
        this._amplitude = 4;
    }

    set weights(weights) { this._weights = weights; }

    _computePsiAt(x, t) {
        const k = this._k;
        const w = this._omega;

        function phaseFactor(n) { return -n * n * w * t; }
        function state(n) { return Math.sin((n + 1) * k * x); }

        const real = this._weights.ground * state(0) * Math.cos(phaseFactor(1))
            + this._weights.first  * state(1) * Math.cos(phaseFactor(2))
            + this._weights.second * state(2) * Math.cos(phaseFactor(3))
            + this._weights.third  * state(3) * Math.cos(phaseFactor(4));

        const imag = this._weights.ground * state(0) * Math.sin(phaseFactor(1))
            + this._weights.first  * state(1) * Math.sin(phaseFactor(2))
            + this._weights.second * state(2) * Math.sin(phaseFactor(3))
            + this._weights.third  * state(3) * Math.sin(phaseFactor(4));

        return {real, imag};
    }

    psiSquared() {
        const psiAbs = [];
        let psiSum = 0;
        for (const value of this._values) {
            const squareValue = value.real * value.real + value.imag * value.imag;
            psiAbs.push(squareValue);
            psiSum += squareValue;
        }
        return {psiAbs, psiSum};
    }

    updateValueFor(index, t) {
        const arrow = this._arrows[index];
        const {real, imag} = this._computePsiAt(arrow.position.x, t);
        arrow.axis = new Vector3(0, imag * this._amplitude, real * this._amplitude);
        this._values[index] = {real: real, imag: imag};

        const phase = Math.atan2(imag, real);
        const hue = 1 - ((phase + Math.PI) / (2 * Math.PI));
        arrow.color = new Color().setHSL(hue, 1.0, 0.5);
    }

    update(t) {
        for (let index = 0; index < this._arrows.length; index++)
            this.updateValueFor(index, t);

        const {psiAbs, psiSum} = this.psiSquared();
        let expectationX = 0;
        for (let index = 0; index < this._arrows.length; index++)
            expectationX += this._arrows[index].position.x * psiAbs[index] / psiSum;

        return expectationX;
    }
}

// GUI
const gui = new GUI({width: "100%", autoPlace: false});
gui
    .add(params, "groundState", 0, 1, 0.01)
    .name("Ground state").onChange(value => wave.weights = {...wave._weights, ground: value});
gui
    .add(params, "firstState", 0, 1, 0.01)
    .name("1st excited").onChange(value => wave.weights = {...wave._weights, first: value});
gui
    .add(params, "secondState", 0, 1, 0.01)
    .name("2nd excited").onChange(value => wave.weights = {...wave._weights, second: value});
gui
    .add(params, "thirdState", 0, 1, 0.01)
    .name("3rd excited").onChange(value => wave.weights = {...wave._weights, third: value});
document.getElementById("infiniteWellGui").appendChild(gui.domElement);

const axesController = new AxesController({
    parentGroup: worldGroup,
    canvasContainer,
    axesParameters: axesParams,
    scene
});

const wave = new InfiniteWellWave();
worldGroup.add(wave);

const boundingBox = new Box3();
boundingBox.setFromObject( worldGroup );
axesController.createFromBoundingBox(boundingBox);

const plot3D = new Plot3DView(scene, canvas, boundingBox);
plot3D.frame(ThreeJsUtils.scaleBox3(boundingBox, 0.6), {
    padding: 1.0
});

// Resizing for mobile devices
function resize() {
    ThreeJsUtils.resizeRendererToCanvas(plot3D.renderer, plot3D.camera);
    axesController.resize();
}
window.addEventListener("resize", resize);
resize();

const plotData = [
    [], // x-axis = time
    [] // Expectation
];

const plot = new uPlot({
    width: canvas.clientWidth,
    height: canvas.clientHeight * .5,
    title: "Probability finding the particle at x",
    scales: { x: { time: false }, y: { auto: true } },
    series: [
        {}, // x-axis
        { label: "Expectation", stroke: "yellow" }
    ],
    axes: [
        { stroke: "#fff", grid: { stroke: "rgba(255,255,255,0.2)" } },
        { stroke: "#fff", grid: { stroke: "rgba(255,255,255,0.2)" } }
    ],
    bg: "transparent"
}, plotData, document.getElementById("expectationPlot"));

let time = 0;
const dt = 0.01;
const maxPoints = 100;
function animate() {
    plotData[0].push(time); // x-axis = time
    plotData[1].push(wave.update(time));
    plot3D.render();
    axesController.render(plot3D.camera);
    time += dt;
    if (plotData[0].length > maxPoints)
        plotData.forEach(arr => arr.shift());
    plot.setData(plotData);
}

plot3D.renderer.setAnimationLoop(animate);