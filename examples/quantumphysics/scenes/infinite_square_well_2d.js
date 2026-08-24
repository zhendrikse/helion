import {DisplayWithClocks, Mouse, Wave2D} from "./2d-quantum-extensions.js"

const theCanvas = document.getElementById("infiniteSquareWellCanvas2D");
const theContext = theCanvas.getContext("2d");
theContext.fillStyle = "transparent";
theCanvas.style.touchAction = "none";

export class InfiniteWellWave2D extends Wave2D {
    constructor(iMax) {
        super(iMax, 7);
    }

    _initEigenStates() {
        for (let n=0; n <= this._nMax; n++)
            this._eigenPsi[n] = new Array(this._iMax+1);

        for (let i = 0; i <= this._iMax; i++)
            for (let n = 0; n <= this._nMax; n++)
                this._eigenPsi[n][i] = Math.sin((n + 1) * Math.PI * i / this._iMax);
    }

    updatePhase(speed) {
        for (let n = 0; n <= this._nMax; n++) {
            this._phase[n] -= (n + 1) * (n + 1) * speed;	// energies proportional to n^2
            if (this._phase[n] < 0)
                this._phase[n] += 2 * Math.PI;
        }
    }
}

const display = new DisplayWithClocks(theCanvas, theContext);
const mouse = new Mouse(theCanvas, display);
let psi = new InfiniteWellWave2D(theCanvas.clientWidth);
let running = true;

// Add mouse/touch handlers; down/start must be inside the canvas but drag can go outside it:
theCanvas.addEventListener('mousedown', mouseDown, false);
document.body.addEventListener('mousemove', mouseMove, false);
document.body.addEventListener('mouseup', mouseUp, false);
theCanvas.addEventListener('touchstart', touchStart, false);
document.body.addEventListener('touchmove', touchMove, false);
document.body.addEventListener('touchend', mouseUp, false);

function nextFrame() {
    psi.updatePhase(Number(speedSlider.value));
    psi.build();
    display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock);
    if (running) requestAnimationFrame(nextFrame);
}

function mouseUp(e) { mouse.mouseUp(); display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock); }
function mouseDown(e) { mouse.mouseOrTouchStart(e.clientX, e.clientY, e, psi); }
function touchStart(e) { mouse.mouseOrTouchStart(e.targetTouches[0].clientX, e.targetTouches[0].clientY, e, psi); }
function mouseMove(e) { mouse.mouseOrTouchMove(e.clientX, e.clientY, e, psi); }
function touchMove(e) { mouse.mouseOrTouchMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY, e, psi); }

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;

    const width  = theCanvas.clientWidth;
    const height = theCanvas.clientHeight;

    theCanvas.style.width  = width + "px";
    theCanvas.style.height = height + "px";

    theCanvas.width  = Math.floor(width * dpr);
    theCanvas.height = Math.floor(height * dpr);

    theContext.setTransform(dpr, 0, 0, dpr, 0, 0);

    psi = new InfiniteWellWave2D(theCanvas.clientWidth);
    display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock);
}
window.addEventListener("resize", () => resizeCanvas());

// --- GUI wiring ---
const pauseButton = document.getElementById("pauseButton");
function startStop() {
    running = !running;
    if (running) {
        pauseButton.innerHTML = "Pause";
        nextFrame();
    } else
        pauseButton.innerHTML = "Resume";
}

function zero() {
    psi.setAmplitudesTo(0);
    psi.build();
    display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock);
}

function normalizePsi() {
    psi.normalise();
    psi.build();
    display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock);
}

const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const realImag = document.getElementById("realImag");
const zeroButton = document.getElementById("zeroButton");
const normalizeButton = document.getElementById("normalizeButton");
const densityPhase = document.getElementById("densityPhase");

pauseButton.addEventListener("click", () => startStop());
realImag.addEventListener("change", () => display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock));
densityPhase.addEventListener("change", () => display.paintCanvas(psi, realImag.checked, mouse.mouseIsDown, mouse.mouseClock));
zeroButton.addEventListener("click", () => zero());
normalizeButton.addEventListener("click", () => normalizePsi());

function updateSpeedDisplay() {
    speedValue.textContent = Number(speedSlider.value).toFixed(3);
}
speedSlider.addEventListener("input", updateSpeedDisplay);
updateSpeedDisplay(); // Initial display sync
resizeCanvas();
nextFrame();