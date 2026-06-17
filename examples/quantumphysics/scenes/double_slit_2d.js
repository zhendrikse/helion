import {
    ComplexScalarFieldRaster, DiscreteComplexField, Simulation, Vec3, Slider, Range, DiscreteScalarField, Registry,
    DropdownMenu, SchrodingerSolver, GaussianImpulseComplex2D, ScalarFieldIntensityPixelRaster
} from "../../../src/index.js";

const theCanvas = document.getElementById("doubleSlit2dContainer");
document.getElementById("barrierType").addEventListener("click", () => potential.adjust());
document.getElementById("bSizeSlider").addEventListener("input", () => potential.adjust());
document.getElementById("bSoftnessSlider").addEventListener("input", () => potential.adjust());

let xMax = Number(theCanvas.width);
let xMaxm1 = xMax - 1;
const dt = 0.24;		// anything less than 0.25 seems to be stable

class PotentialField extends DiscreteScalarField {
    static Type = Object.freeze({
        Circle: "Circle",
        Square: "Square",
        Line: "Line",
        Step: "Step",
        SingleHole: "SingleHole",
        DoubleHole: "DoubleHole",
        Grating: "Grating"
    })

    static Shapes = new Registry({
        id: "surfaceShapeSelect",
        label: "🟦 Shape ",
        entries: PotentialField.Type
    });

    constructor(size, potentialType = PotentialField.Type.DoubleHole) {
        super({
            nx: size,
            ny: size
        })
        this._potentialType = potentialType;
    }

    get shapeSelector() {
        return new DropdownMenu()
            .for(PotentialField.Shapes)
            .withValue(this._potentialType)
            .addEventListener("change", event => {
                    this._potentialType = event.target.value;
                    this.adjust();
                }
            );
    }

    _setPotentialFor(size, energy) {
        const max = this.nx;
        switch (this._potentialType) {
            case PotentialField.Type.Circle:
                const rSquared = size * size/4.0;
                for (let y=0; y<max; y++)
                    for (let x=0; x<max; x++)
                        if ((x-max/2)**2 + (y-max/2)**2 < rSquared)
                            this._data[y*max+x] = energy;
                break;
            case PotentialField.Type.Square:
                const edge = Math.round(max/2 - size/2);
                for (let y=edge; y<edge+size; y++)
                    for (let x=edge; x<edge+size; x++)
                        this._data[y*max+x] = energy;
                break;
            case PotentialField.Type.Line:
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2); x<Math.floor(max/2)+size; x++)
                        this._data[y*max+x] = energy;
                break;
            case PotentialField.Type.Step:
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2); x<max; x++)
                        this._data[y*max+x] = energy;
                break;
            case PotentialField.Type.SingleHole:
                const holeEdge = Math.round(max/2 - size/2);
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y <= holeEdge || y > holeEdge+size)
                            this._data[y*max+x] = energy;
                break;
            case PotentialField.Type.DoubleHole:
                const dhEdge = Math.round(max/2 - size/2);
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y <= dhEdge-10 || y > dhEdge+size+10 || (y>dhEdge && y<=dhEdge+size))
                            this._data[y*max+x] = energy;
                break;
            case PotentialField.Type.Grating:
                for (let y=Math.floor(max/4); y<Math.floor(3*max/4); y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y % size < size/2)
                            this._data[y*max+x] = energy;
                break;
            default:
                throw new Error(`Unknown potential type "${this._potentialType}"`);
        }
    }

    _softenEdges(softness) {
        const max = this.nx;
        for (let s=0; s<softness; s++) {
            const oldV = this._data.slice();
            for (let y=1; y<max-1; y++)
                for (let x=1; x<max-1; x++) {
                    const i = y*max + x;
                    this._data[i] = (oldV[i + 1] + oldV[i - 1] + oldV[i + max] + oldV[i - max]) * .25;
                }
        }
    }

    adjust() {
        const bEnergy = Number(document.getElementById("bEnergySlider").value);
        const bSize = Number(document.getElementById("bSizeSlider").value);
        const softness = Number(document.getElementById("bSoftnessSlider").value);

        document.getElementById("bSoftnessReadout").innerText = "" + softness;
        document.getElementById("bEnergyReadout").innerText = bEnergy.toFixed(3).replace("-", "−");
        document.getElementById("bSizeReadout").innerText = "" + bSize;

        this._data.fill(0);
        this._setPotentialFor(bSize, bEnergy);
        this._softenEdges(softness);
    }
}

xMax = 400;
xMaxm1 = xMax - 1;
const potential = new PotentialField(xMax);
potential.adjust();

const psi = new DiscreteComplexField({ nx: xMax, ny: xMax });
const solver = new SchrodingerSolver(psi, potential);
solver.initialize(dt)
const gaussianImpulse = new GaussianImpulseComplex2D();
psi.apply(gaussianImpulse);

const waveFunctionRaster = new ComplexScalarFieldRaster({
    width: xMax,
    height: xMax
});

function reset() {
    psi.reset();
    solver.initialize(dt)
    psi.apply(gaussianImpulse);
    potential.adjust();
}

Simulation
    .with({
        htmlDivId: "simContainer",
        controls: false,
        headUpDisplay: true,
        cameraPosition: new Vec3(0, 0, xMax)
    })
    .withMouseClickEventListener()
    .synchronize(psi.alwaysWith(waveFunctionRaster))
    .synchronize(potential.onceWith(new ScalarFieldIntensityPixelRaster({
        width: xMax,
        height: xMax
    })))
    .onReset(() => reset())
    .onClockTick(() => solver.step(dt), 15)
    .append(new Slider("🔆 Brightness ")
        .withRange(new Range(0.1, 2, 0.01))
        .withValue(1)
        .on(waveFunctionRaster)
        .withProperty("brightness")
    )
    .append(new Slider("🏭 Packet energy ")
        .on(psi)
        .withProperty("wavePacketEnergy")
        .withValue(0.050)
        .withRange(new Range(0.001, 0.1, 0.001))
        .addEventListener("change", () => reset())
    )
    .append(potential.shapeSelector);
