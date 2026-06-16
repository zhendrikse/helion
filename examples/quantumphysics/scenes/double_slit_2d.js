import { hsvToRgb, Simulation} from "../../../src/index.js";
import {Field} from "../../../src/model/math/fields.js";

const theCanvas = document.getElementById("doubleSlit2dContainer");
const theContext = theCanvas.getContext("2d");
const vCanvas = document.getElementById("vCanvas");
const pauseButton = document.getElementById("pauseButton");
const speedSlider = document.getElementById("speedSlider");
const brightnessSlider = document.getElementById("brightnessSlider");
const eSlider = document.getElementById("eSlider");
const eReadout = document.getElementById("eReadout");
const spsReadout = document.getElementById("spsReadout");
document.getElementById("resetButton").addEventListener("click", () => reset());
document.getElementById("pauseButton").addEventListener("click", () => startStop());
document.getElementById("barrierType").addEventListener("click", () => barrier.adjust());
speedSlider.addEventListener("input", () => resetTimer());
brightnessSlider.addEventListener("input", () => paintCanvas(psi, imgData));
eSlider.addEventListener("input", () => wpEnergyAdjust());
document.getElementById("bEnergySlider").addEventListener("input", () => barrier.adjust());
document.getElementById("bSizeSlider").addEventListener("input", () => barrier.adjust());
document.getElementById("bSoftnessSlider").addEventListener("input", () => barrier.adjust());

const TWO_PI = 2 * Math.PI;
const PHASE_STEPS = 256;
const hsvTable = new Array(PHASE_STEPS);
for (let i = 0; i < PHASE_STEPS; i++)
    hsvTable[i] = hsvToRgb(i / PHASE_STEPS, 1.0, 1.0); // V=1, saturation=1

let xMax = Number(theCanvas.width);
let xMaxm1 = xMax - 1;

const pWidth = 48;	// initial wavepacket width
// Here are the wavefunction arrays.  Note that times are staggered, with the imaginary parts always
// one time step behind the corresponding real parts.  This is admittedly confusing.
// Also note that these are 1D arrays, with index i = y*xMax + x, for efficiency.
const dt = 0.24;		// anything less than 0.25 seems to be stable
let running = false;
let startTime, stepCount;

class Barrier {
    constructor(size, context) {
        this._xMax = size;
        this._context = context;
        this._v = new Array(size * size).fill(0);
        this._vImage = context.createImageData(size, size);
    }

    at = (i) => this._v[i];
    _clear = () => this._v.fill(0);

    _setPotentialFor(barrierType, bSize, bEnergy) {
        const max = this._xMax;
        switch (barrierType) {
            case "circle":
                const rSquared = bSize*bSize/4.0;
                for (let y=0; y<max; y++)
                    for (let x=0; x<max; x++)
                        if ((x-max/2)**2 + (y-max/2)**2 < rSquared)
                            this._v[y*max+x] = bEnergy;
                break;
            case "square":
                const edge = Math.round(max/2 - bSize/2);
                for (let y=edge; y<edge+bSize; y++)
                    for (let x=edge; x<edge+bSize; x++)
                        this._v[y*max+x] = bEnergy;
                break;
            case "line":
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2); x<Math.floor(max/2)+bSize; x++)
                        this._v[y*max+x] = bEnergy;
                break;
            case "step":
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2); x<max; x++)
                        this._v[y*max+x] = bEnergy;
                break;
            case "singleHole":
                const holeEdge = Math.round(max/2 - bSize/2);
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y <= holeEdge || y > holeEdge+bSize)
                            this._v[y*max+x] = bEnergy;
                break;
            case "doubleHole":
                const dhEdge = Math.round(max/2 - bSize/2);
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y <= dhEdge-10 || y > dhEdge+bSize+10 || (y>dhEdge && y<=dhEdge+bSize))
                            this._v[y*max+x] = bEnergy;
                break;
            case "grating":
                for (let y=Math.floor(max/4); y<Math.floor(3*max/4); y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y % bSize < bSize/2)
                            this._v[y*max+x] = bEnergy;
                break;
        }
    }

    _softenEdges(softness) {
        const max = this._xMax;
        for (let s=0; s<softness; s++) {
            const oldV = this._v.slice();
            for (let y=1; y<max-1; y++)
                for (let x=1; x<max-1; x++) {
                    const i = y*max + x;
                    this._v[i] = (oldV[i + 1] + oldV[i - 1] + oldV[i + max] + oldV[i - max]) * .25;
                }
        }
    }

    _draw() {
        const max = this._xMax;
        for (let y=0; y<max; y++)
            for (let x=0; x<max; x++) {
                const i = y*max+x;
                const imageIndex = (x + (max-y-1)*max)*4;
                this._vImage.data[imageIndex] = 255;
                this._vImage.data[imageIndex+1] = 255;
                this._vImage.data[imageIndex+2] = 255;
                this._vImage.data[imageIndex+3] = Math.round(Math.abs(128 * this.at(i) * 10));
            }
        this._context.putImageData(this._vImage, 0, 0);
    }

    adjust() {
        const barrierType = document.getElementById("barrierType").value;
        const bEnergy = Number(document.getElementById("bEnergySlider").value);
        const bSize = Number(document.getElementById("bSizeSlider").value);
        const softness = Number(document.getElementById("bSoftnessSlider").value);

        document.getElementById("bSoftnessReadout").innerText = "" + softness;
        document.getElementById("bEnergyReadout").innerText = bEnergy.toFixed(3).replace("-", "−");
        document.getElementById("bSizeReadout").innerText = "" + bSize;

        this._clear();
        this._setPotentialFor(barrierType, bSize, bEnergy);
        this._softenEdges(softness);
        this._draw();
    }
}
let barrier;
let psi;

function startStop() {
    running = !running;
    if (running) {
        resetTimer();
        pauseButton.innerHTML = "Pause";
        nextFrame();
    } else
        pauseButton.innerHTML = "Resume";
}

function resetTimer() {
    stepCount = 0;
    startTime = (new Date()).getTime();
}

// Respond to user adjusting wavepacket energy:
// (Uncertainty code is left over from 1D version and is commented out for now.)
function wpEnergyAdjust() {
    const e = Number(eSlider.value);
    //const a = 1 / (pWidth * pWidth);						// so envelope is exp(-ax^2)
    //const sigma = Math.sqrt(2*energy*a + a*a/2) + a/2;	// uncertainty in energy (more or less)
    // The square root term is the actual sigma and dominates for most energy values;
    // the a/2 term is the offset between the k^2/2 and the actual average energy.
    eReadout.innerHTML = Number(e).toFixed(3);
    //+ " &plusmn; " + Number(sigma).toFixed(3);
    if (!running) reset();
}

function nextFrame() {
    const stepsPerFrame = Number(speedSlider.value);
    for (let step=0; step < stepsPerFrame; step++)
        psi.doStep(dt, barrier);
    stepCount += stepsPerFrame;

    paintCanvas(psi, imgData);
    const currentTime = (new Date()).getTime();
    spsReadout.innerHTML = "" + Math.round(1000 * stepCount / (currentTime-startTime));
}

class Psi2D extends Field {
    constructor(xMax) {
        super({});
        this._xMax = xMax;
        this._psi = {
            re: new Float32Array(xMax*xMax),
            im: new Float32Array(xMax*xMax)
        };
        this._psiNext = {
            re: new Float32Array(xMax*xMax),
            im: new Float32Array(xMax*xMax)
        };
    }

    // Integrate the TDSE for a double time step (centered-difference time integration):
    // (Remember that psi.im is one time step earlier than psi.re; same for psiNext.im and psiNext.re.)
    doStep(dt, barrier) {
        const re = this._psi.re;
        const im = this._psi.im;
        const reNext = this._psiNext.re;
        const imNext = this._psiNext.im;
        const vmax = barrier._v;
        const w = this._xMax;

        for (let y=1; y < xMaxm1; y++)
            for (let x=1; x < xMaxm1; x++) {
                const i = y * w + x;
                imNext[i] = im[i] - dt * (-re[i+1] - re[i-1] - re[i+w] - re[i-w] + 2*(2+vmax[i])*re[i]);
            }

        for (let y=1; y < xMaxm1; y++)
            for (let x=1; x < xMaxm1; x++) {
                const i = y * w + x;
                reNext[i] = re[i] + dt * (-imNext[i+1] - imNext[i-1] - imNext[i+w] - imNext[i-w] + 2*(2+vmax[i])*imNext[i]);
            }

        for (let y=1; y < w - 1; y++)
            for (let x=1; x < xMaxm1; x++) {
                const i = y * w + x;
                re[i] = reNext[i];
                im[i] = imNext[i];
            }
    }

    squaredAt = (i) => this._psi.re[i] * this._psi.re[i] + this._psi.im[i] * this._psi.im[i];
    phaseAt = (i) => Math.atan2(this._psi.im[i], this._psi.re[i]) / TWO_PI;

    // Initialize the wavefunction to a Gaussian wavepacket:
    reset() {
        const centerX = Math.floor(xMax*0.22);
        const centerY = xMax/2;
        const e = Number(eSlider.value);
        const kx = Math.sqrt(2*e);
        const ky = 0;
        for (let y=0; y<xMax; y++)
            for (let x=0; x<xMax; x++) {
                const i = y*xMax + x;
                const envelope = Math.exp(-(x-centerX)*(x-centerX)/(pWidth*pWidth)) *
                    Math.exp(-(y-centerY)*(y-centerY)/(pWidth*pWidth));
                this._psi.re[i] = envelope * (Math.cos(kx*x)*Math.cos(ky*y) - Math.sin(kx*x)*Math.sin(ky*y));
                this._psi.im[i] = envelope * (Math.cos(kx*x)*Math.sin(ky*y) + Math.sin(kx*x)*Math.cos(ky*y));
                this._psiNext.re[i] = 0.0;
                this._psiNext.im[i] = 0.0;	// These lines may not be needed but edges must be zero
            }

        // Now bump the imaginary part of psi back by one time step:
        for (let y=1; y<xMax-1; y++)
            for (let x=1; x<xMax-1; x++) {
                const i = y*xMax + x;
                this._psi.im[i] = this._psi.im[i] + 0.5 * dt *
                    (-this._psi.re[i+1] - this._psi.re[i-1] - this._psi.re[i+xMax] - this._psi.re[i-xMax] + 2*(2+barrier.at(i))*this._psi.re[i]);
            }
    }
}

// Initialize the wavefunction to a Gaussian wavepacket:
function reset() {
    psi.reset();
    paintCanvas(psi, imgData);
    if (!running) pauseButton.innerHTML = "Run";
}

function paintCanvas(psi, imageData) {
    const brightSetting = Number(brightnessSlider.value);
    const size = xMax; // use actual canvas size

    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const i = y * size + x;
            let brightness = Math.sqrt(psi.squaredAt(i)) * brightSetting;
            if (brightness > 1.0) brightness = 1.0;

            let phaseIndex = Math.floor(PHASE_STEPS * psi.phaseAt(i) );
            if (phaseIndex < 0) phaseIndex += PHASE_STEPS;
            if (phaseIndex >= PHASE_STEPS) phaseIndex = PHASE_STEPS-1;

            const rgb = hsvTable[phaseIndex];
            const imageIndex = (x + (size - y - 1) * size) * 4;
            imageData.data[imageIndex] = Math.round(rgb.r * brightness);
            imageData.data[imageIndex + 1] = Math.round(rgb.g * brightness);
            imageData.data[imageIndex + 2] = Math.round(rgb.b * brightness);
            imageData.data[imageIndex + 3] = Math.round(brightness * 255); // alpha based on brightness
        }

    theContext.putImageData(imgData, 0, 0);
}

let imgData;
function setupArrays() {
    imgData = theContext.createImageData(xMax, xMax);
    psi = new Psi2D(xMax);
}

function initSimulation(size) {
    xMax = size;
    xMaxm1 = xMax - 1;

    setupArrays();
    barrier = new Barrier(xMax, vCanvas.getContext("2d"));
    barrier.adjust();
    reset();
}

function resizeCanvas() {
    const rect = theCanvas.getBoundingClientRect();
    const size = Math.floor(rect.width);

    theCanvas.width = size;
    theCanvas.height = size;
    vCanvas.width = size;
    vCanvas.height = size;

    initSimulation(size);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

Simulation
    .with({
        htmlDivId: "simContainer",
        controls: false,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .onReset(() => reset())
    .onClockTick(() => nextFrame());
