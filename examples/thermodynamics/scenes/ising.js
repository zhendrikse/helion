import {
    Simulation, Vec3, Slider, Range, Button, ColorMapper, Interval, TiledPlane, DiscreteScalarField
} from '../../../src/index.js';

class IsingField extends DiscreteScalarField {
    /** @param {number} latticeSize */
    constructor(latticeSize = 200) {
        super({ nx: latticeSize, ny: latticeSize });
        this.randomize();
    }

    randomize() {
        for (let i = 0; i < this.nx; i++)
            for (let j = 0; j < this.ny; j++)
                this.setValueAt(i, j, Math.random() < 0.5 ? 1 : -1);
        return this;
    }

    /**
     * @param {number} i 
     * @param {number} j 
     * @returns {number}
     */
    deltaU(i, j) {
        const s = this.valueAt(i, j);
        const left = this.valueAt(i === 0 ? this.nx - 1 : i - 1, j);
        const right = this.valueAt(i === this.nx - 1 ? 0 : i + 1, j);
        const top = this.valueAt(i, j === 0 ? this.ny - 1 : j - 1);
        const bottom = this.valueAt(i, j === this.ny - 1 ? 0 : j + 1);
        return 2 * s * (left + right + top + bottom);
    }

    /**
     * Metropolis sweep
     * @param {number} T temperature
     * @param {number} steps 
     */
    metropolis(T, steps) {
        for (let k = 0; k < steps; k++) {
            const i = Math.floor(Math.random() * this.nx);
            const j = Math.floor(Math.random() * this.ny);
            const dU = this.deltaU(i, j);
            if (dU <= 0 || Math.random() < Math.exp(-dU / T)) {
                this.setValueAt(i, j, -this.valueAt(i, j));
            }
        }
    }

    // TiledPlane calls rangeAt() for normalizer; keep fixed [-1,1] so #8000ff/#1a1a1a stay stable
    rangeAt() {
        return new Interval(-1, 1);
    }
}

class IsingColorMapper extends ColorMapper {
    map(normalized, target) {
        // normalized 0 => -1 (dark), 1 => +1 (purple #8000ff)
        if (normalized > 0.5) 
            target.setRGB(0x80 / 255, 0, 1);
    }
}

let latticeSize = 200;
let stepsPerFrame = 10000;

const field = new IsingField(latticeSize);
const view = new TiledPlane({
    cellSize: 0.1,
    colorMapper: new IsingColorMapper(),
    opacityFunction: v => v > 0.5 ? 1 : 0.1,
});

let T = 2.27; // around critical temperature Tc≈2.27 voor J=1
const simulation = Simulation
    .with({
        htmlDivId: 'isingSpingCanvasWrapper',
        camera: { position: new Vec3(0, 0, 15), orthographic: true, controls: false },
        parameterMenuCollapsed: false
    })
    .bind(field.alwaysWith(view))
    .runsEvery(0.01)
    .onStep((_clock, _dt) => field.metropolis(T, stepsPerFrame))
    .append(new Slider('Temperature')
        .withRange(new Range(0.1, 4, 0.01))
        .withValue(T)
        .onInput(event => T = Number(event.target.value)))
    .append(new Slider('Steps / frame')
        .withRange(new Range(1000, 50000, 1000))
        .withValue(stepsPerFrame)
        .onInput(event => stepsPerFrame = Number(event.target.value)))
    .append(new Button()
        .withText('Pause')
        .onClick(() => {
            if (simulation.isRunning) 
                simulation.stop();
            else 
                simulation.start();
    }))
    .onReset(() => field.randomize())
    .start();
