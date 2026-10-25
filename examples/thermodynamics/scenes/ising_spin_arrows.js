import {
    ArrowField, Range, Simulation, Vec3, VectorField, UPlotGraph, Colour
} from '../../../src/index.js';

const LATTICE_SIZE = 100;
const RELAX_SWEEPS = 50;
const MEASURE_SWEEPS = 100;
const MIN_TEMPERATURE = 0.1;
const MAX_TEMPERATURE = 4.9;
const TEMPERATURE_STEP = 0.075;

const temperatures = [];
for (let temperature = MIN_TEMPERATURE; temperature <= MAX_TEMPERATURE + 1e-9; temperature += TEMPERATURE_STEP)
    temperatures.push(Number(temperature.toFixed(1)));

/**
 * Two-dimensional Ising model with periodic boundary conditions.
 * Spins are ±1, with coupling J = 1 and Boltzmann constant kB = 1.
 */
class IsingLattice extends VectorField {
    constructor(size) {
        super();
        this._size = size;
        this._spins = new Int8Array(size * size);
        this.reset();
    }

    reset = () => this._spins.fill(1); // Start each temperature at low-energy, fully ordered state

    _index(row, column) {
        const wrappedRow = (row + this._size) % this._size;
        const wrappedColumn = (column + this._size) % this._size;
        return wrappedRow * this._size + wrappedColumn;
    }

    spinAt = (row, column) => this._spins[this._index(row, column)];

    flipAt = (row, column) => this._spins[this._index(row, column)] *= -1;

    neighborSum(row, column) {
        return this.spinAt(row - 1, column) +
            this.spinAt(row + 1, column) +
            this.spinAt(row, column - 1) +
            this.spinAt(row, column + 1);
    }

    sweep(temperature) {
        // One Monte Carlo sweep attempts an update at every lattice site.
        for (let row = 0; row < this._size; row++)
            for (let column = 0; column < this._size; column++) {
                const spin = this.spinAt(row, column);
                const deltaEnergy = 2 * spin * this.neighborSum(row, column);

                // Metropolis acceptance rule.
                if (deltaEnergy <= 0 || Math.random() < Math.exp(-deltaEnergy / temperature))
                    this.flipAt(row, column);
            }
    }

    meanAbsoluteMagnetization() {
        let total = 0;
        for (const spin of this._spins)
            total += spin;
        return Math.abs(total) / this._spins.length;
    }

    sample(position, target) {
        // ArrowField samples a regular x-z grid; spin vectors point along y.
        const column = Math.round(position.x + (this._size - 1) / 2);
        const row = Math.round(position.z + (this._size - 1) / 2);
        target.set(0, this.spinAt(row, column), 0);
    }
}

const lattice = new IsingLattice(LATTICE_SIZE);
const upColor = new Colour(0x00dfff);
const downColor = new Colour(0xffad00);

const spinView = new ArrowField({
    xRange: new Range(-(LATTICE_SIZE - 1) / 2, (LATTICE_SIZE - 1) / 2, 1),
    yRange: new Range(0, 0, 1),
    zRange: new Range(-(LATTICE_SIZE - 1) / 2, (LATTICE_SIZE - 1) / 2, 1),
    round: true,
    magnitudeMap: _magnitude => 2,
    centered: true,
    colorMap: direction => direction.y >= 0 ? upColor : downColor
});

const graph = new UPlotGraph({
    dataDefinition: [
        { label: 'Temperature' },
        { label: 'Mean |magnetization|', color: Colour.Cyan }
    ],
    height: 250,
    title: '2D Ising model: magnetization vs temperature',
    xLabel: 'Temperature (J/kB)',
    yLabel: 'Mean |magnetization| per spin',
    labelColor: Colour.White,
    yRange: { from: 0, to: 1 }
});

let temperatureIndex = 0;
let sweepIndex = 0;
let magnetizationSum = 0;
let measuredSweeps = 0;
let finished = false;
let simulation;

function updateReadout() {
    if (finished) {
        simulation.setHtmlTitle('Temperature sweep complete — press mouse for a new run.');
        return;
    }

    simulation.setHtmlTitle(`T = ${temperatures[temperatureIndex].toFixed(1)}`);
    simulation.setBottomText(`Sweep ${sweepIndex + 1}/${RELAX_SWEEPS + MEASURE_SWEEPS}`);
}

function resetSweep() {
    temperatureIndex = 0;
    sweepIndex = 0;
    magnetizationSum = 0;
    measuredSweeps = 0;
    finished = false;
    lattice.reset();
    graph.reset();
    updateReadout();
}

simulation = Simulation
    .with({
        htmlDivId: 'isingSpinArrowsContainer',
        camera: { position: new Vec3(0, 35, 125), fieldOfView: 30 },
        viewport: { aspectRatio: '19 / 12', parameterMenuCollapsed: false }
    })
    .withMouseClickEventListener()
    .addGraph(graph)
    .bind(lattice.alwaysWith(spinView))
    .runsEvery(1e-3)
    .onStep(() => {
        if (finished)
            return;

        const temperature = temperatures[temperatureIndex];
        lattice.sweep(temperature);

        // Discard the initial relaxation sweeps, then average measurements.
        if (sweepIndex >= RELAX_SWEEPS) {
            magnetizationSum += lattice.meanAbsoluteMagnetization();
            measuredSweeps++;
        }

        if (sweepIndex++ >= RELAX_SWEEPS + MEASURE_SWEEPS) {
            graph.push([temperature, magnetizationSum / measuredSweeps]);

            temperatureIndex++;
            if (temperatureIndex >= temperatures.length)
                finished = true;
            else {
                // Reinitialize once per temperature (not after every sweep).
                lattice.reset();
                sweepIndex = 0;
                magnetizationSum = 0;
                measuredSweeps = 0;
            }
        }

        if (sweepIndex % 10  === 0)
            updateReadout();
    })
    .onReset(resetSweep);
