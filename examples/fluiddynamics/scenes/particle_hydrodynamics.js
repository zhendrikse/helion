import {
    RadialSymmetricBody, Button, Circle, ColorMappers, Colour, DropdownMenu, FixedIntervalNormalizer,
    Interval, Range, Registry, Simulation, Slider, Vec2, Vec3
} from '../../../src/index.js';
import { LinearSRGBColorSpace} from "three";

const DEFAULT_PARTICLE_COUNT = 1000;
const MAX_PARTICLE_COUNT = 5000;
const WORLD_HEIGHT = 20;
const PARTICLE_RADIUS_IN_PIXELS = 5;
const COLOR_UPDATE_INTERVAL = 10;
const SPEED_COLOR_MAX = 30;

const domainScale = 30;
const gridCellSize = 1;
const INIT_MAX_PARTICLES_IN_CELL = 50;

class Particle {
    /**
     * @param {{
     * position?: Vec2
     * velocity?: Vec2
     * }} options
     */
    constructor({
        position = new Vec2(),
        velocity = new Vec2(),
    } = {}) {
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.force = new Vec2(0, 0);

        this.rho = 0;
        this.P = 0;

        this._acceleration = new Vec2();
    }

    integrate(gravity, dt) {
        this._acceleration.set(this.force.x, this.force.y).multiplyScalar(1 / this.rho);
        this._acceleration.add(gravity);
        this.velocity.addScaledVector(this._acceleration, dt);
        this.position.addScaledVector(this.velocity, dt);
        this.position.addScaledVector(this._acceleration, .5 * dt * dt);
    }

    get speed() { return Math.hypot(this.velocity.x, this.velocity.y); }
}

class Cell {
    constructor() {
        this._particles = new Array(INIT_MAX_PARTICLES_IN_CELL);
        /** @type {Cell[]} */
        this.halfNeighbors = [];
        this.numParticles = 0;
    }

    reset() {
        this.numParticles = 0;
        this._particles = new Array(INIT_MAX_PARTICLES_IN_CELL);
    }
}

class Grid {
    constructor() {
        /** @type {Cell[]} */
        this._cells = [];
        this._nx = 0;
        this._ny = 0;
        this._width = 0;
        this._height = 0;
    }
    
    /** @returns {ArrayIterator<Cell>} */
    [Symbol.iterator]() {
        return this._cells[Symbol.iterator]();
    }

    init() {
        const xlimit = simulation.width / domainScale;
        const ylimit = simulation.height / domainScale;

        this._nx = Math.floor(xlimit / gridCellSize);
        this._ny = Math.floor(ylimit / gridCellSize);
        this._width = xlimit;
        this._height = ylimit;
        const numCells = this._nx * this._ny;
        this._cells = new Array(numCells);
        for (let i = 0; i < numCells; i++)
            this._cells[i] = new Cell();

        for (let i = 0; i < this._nx; i++)
            for (let j = 0; j < this._ny; j++)
                this._computeNeighbors(i, j, this._cells[i + j * this._nx]);
    }

    /**
     * References are stored to half of the neighboring cells of center cell C:
     * ^ y
     * |
     * |___________
     * |_1_|_2_|_3_|
     * |___|_C_|_0_|
     * |___|___|___| --> x
     */
    _computeNeighbors(i, j, cell) {
        const idx = i + j * this._nx;
        if (i !== this._nx - 1)
            cell.halfNeighbors.push(this._cells[idx + 1]);
        if (j !== this._ny - 1) {
            for (let i2 = Math.max(0, i - 1); i2 <= Math.min(this._nx - 1, i + 1); i2++)
                cell.halfNeighbors.push(this._cells[idx + this._nx + i2 - i]);
        }
    }

    reset() {
        for (const cell of this._cells)
            cell.numParticles = 0;
    }

    hardReset() {
        for (const cell of this._cells) 
            cell.reset();
    }

    /** @param {Vec2} position */
    getCellFromLocation(position) {
        const i = Math.floor(this._nx * position.x / this._width);
        const j = Math.floor(this._ny * position.y / this._height);
        return this._cells[i + j * this._nx];
    }

    addParticleToCell(particle) {
        const cell = this.getCellFromLocation(particle.position);
        if (cell === null)
            console.warn("Undefined grid cell!");
        else
            cell._particles[cell.numParticles++] = particle;
    }

    evolve(solver, dt) { solver.step(this, dt); }
}

const grid = new Grid();

class SPHSolver {
    static Wpoly6(hSquared, rSquared, coefficient) {
        const temp = hSquared - rSquared;
        return coefficient * temp * temp * temp;
    }

    static Wvisc_lapl = (h, r, coefficient) => coefficient * (1 - r / h);

    static Wspiky_grad2(smoothingLength, r, coefficient) {
        const temp = smoothingLength - r;
        return coefficient * temp * temp / r;
    }

    constructor({
        gravity = new Vec2(0, -20),
        restDensity = 4.5,
        smoothingLength = 1,
        viscosity = 3,
        gasConstant = 120,
        mass = 1
    } = {}) {
        this._gravity = gravity;
        this._rho_0 = restDensity;
        this._mu = viscosity;
        this._k = gasConstant;
        this._mass = mass;

        this._h = smoothingLength;
        this._hSquared = smoothingLength * smoothingLength;
        this._Wpoly6_coeff = 315.0 / (64 * Math.PI * Math.pow(smoothingLength, 9));
        this._Wspiky_grad_coeff = -45.0 / (Math.PI * Math.pow(smoothingLength, 6));
        this._Wvisc_lapl_coeff = 45.0 / (Math.PI * Math.pow(smoothingLength, 5));

        /** @type {Particle[]} */
        this._particles = [];
        this._xRange = new Interval(0, 1);
        this._yRange = new Interval(0, 1);

        // For interaction with mouse movements
        this.forceVelocityOn = false;
        this.forceVelocityCell = null;
        this.forceVelocityVector = new Vec2(0, 0);

        // Scratch vectors
        this._positionVector = new Vec2();
        this._velocityVector = new Vec2();
        this._forceVector = new Vec2();
    }

    get gravity() { return this._gravity; }
    set restDensity(value) { this._rho_0 = value; }
    set viscosity(value) { this._mu = value; }
    set gasConstant(value) {this._k = value; }

    /** @returns {ArrayIterator<[number, Particle]>} */
    entries() { return this._particles.entries(); }

    initialize() {
        const left = 0;
        const bottom = 0;
        const xlimit = simulation.width / domainScale;
        const ylimit = simulation.height / domainScale;
        this._xRange = new Interval(left / domainScale, xlimit);
        this._yRange = new Interval(bottom / domainScale, ylimit);

        this._particles = [];
        this.setNumParticles(grid, particleCount);
    }

    resize(left, right, bottom, top) {
        const xlimit = simulation.width / domainScale;
        const ylimit = simulation.height / domainScale;
        this._xRange = new Interval(Math.max(left / domainScale, 0), Math.min(right / domainScale, xlimit));
        this._yRange = new Interval(Math.max(bottom / domainScale, 0), Math.min(top / domainScale, ylimit));
    }

    setNumParticles(grid, n) {
        if (n < this._particles.length) {
            grid.hardReset();
            this._particles.length = n;
        }
        const i0 = this._particles.length;

        for (let i = i0; i < n; i++) {
            this._particles[i] = new Particle({
                position: new Vec2(Math.random() * this._xRange.range + this._xRange.min, Math.random() * this._yRange.range + this._yRange.min),
                velocity: new Vec2(Math.random() - 0.5, Math.random() - 0.5)
            });
            this._particles[i].rho = this._mass * SPHSolver.Wpoly6(this._hSquared, 0, this._Wpoly6_coeff);
        }
    }

    _calcDensity(grid) {
        for (const cell of grid)
            for (let i = 0; i < cell.numParticles; i++) {
                const particle = cell._particles[i];
                for (let j = i + 1; j < cell.numParticles; j++)
                    this._addDensity(particle, cell._particles[j]);

                for (const neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++)
                        this._addDensity(particle, neighbor._particles[j]);

                particle.P = Math.max(this._k * (particle.rho - this._rho_0), 0);
            }
    }

    _addDensity(particle1, particle2) {
        this._positionVector.copy(particle2.position).sub(particle1.position);
        const rSquared = this._positionVector.dot(this._positionVector);
        if (rSquared >= this._hSquared)
            return;

        const temp = this._mass * SPHSolver.Wpoly6(this._hSquared, rSquared, this._Wpoly6_coeff);
        particle1.rho += temp;
        particle2.rho += temp;
    }

    _addForces(particle1, particle2) {
        this._positionVector.copy(particle2.position).sub(particle1.position);
        const rSquared = this._positionVector.dot(this._positionVector);
        if (rSquared >= this._hSquared)
            return;

        const r = Math.sqrt(rSquared) + 1e-6;
        const temp1 = this._mass * (particle2.P + particle1.P) / (2 * particle2.rho) *
            SPHSolver.Wspiky_grad2(this._h, r, this._Wspiky_grad_coeff);
        const temp2 = this._mu * this._mass * SPHSolver.Wvisc_lapl(this._h, r, this._Wvisc_lapl_coeff) / particle2.rho;
        this._positionVector.copy(particle2.position);
        this._velocityVector.copy(particle2.velocity);
        this._forceVector.copy(this._positionVector.sub(particle1.position).multiplyScalar(temp1));
        this._forceVector.add(this._velocityVector.sub(particle1.velocity).multiplyScalar(temp2));
        particle1.force.add(this._forceVector);
        particle2.force.sub(this._forceVector);
    }

    _calcForces(grid) {
        for (const cell of grid)
            for (let i = 0; i < cell.numParticles; i++) {
                const particle = cell._particles[i];
                for (let j = i + 1; j < cell.numParticles; j++)
                    this._addForces(particle, cell._particles[j]);

                for (const neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++)
                        this._addForces(particle, neighbor._particles[j]);

                this._addWallForces(particle);
            }
    }

    _addWallForces(particle) {
        const h = this._h;
        const c = this._Wspiky_grad_coeff;
        if (particle.position.x < this._xRange.min + h) {
            const r = particle.position.x - this._xRange.min;
            particle.force.x -= this._mass * particle.P / particle.rho * SPHSolver.Wspiky_grad2(h, r, c) * r;
        } else if (particle.position.x > this._xRange.max - h) {
            const r = this._xRange.max - particle.position.x;
            particle.force.x += this._mass * particle.P / particle.rho * SPHSolver.Wspiky_grad2(h, r, c) * r;
        }
        if (particle.position.y < this._yRange.min + h) {
            const r = particle.position.y - this._yRange.min;
            particle.force.y -= this._mass * particle.P / particle.rho * SPHSolver.Wspiky_grad2(h, r, c) * r;
        } else if (particle.position.y > this._yRange.max - h) {
            const r = this._yRange.max - particle.position.y;
            particle.force.y += this._mass * particle.P / particle.rho * SPHSolver.Wspiky_grad2(h, r, c) * r;
        }
    }

    _calcForcedVelocity() {
        if (!this.forceVelocityOn || this.forceVelocityCell == null)
            return;
        for (let i = 0; i < this.forceVelocityCell.numParticles; i++) {
            const particle = this.forceVelocityCell._particles[i];
            particle.velocity.copy(this.forceVelocityVector);
            particle.force.set(0, 0);
        }
        this.forceVelocityOn = false;
    }

    forceVelocity(grid, x, y, Vx, Vy) {
        this.forceVelocityOn = true;
        this._positionVector.set(x / domainScale, this._yRange.max - y / domainScale);
        this.forceVelocityCell = grid.getCellFromLocation(this._positionVector);
        this.forceVelocityVector.set(Vx, -Vy);
    }

    _boxBounce(particle) {
        if (particle.position.x < this._xRange.min) {
            particle.position.x = this._xRange.min + 1e-6;
            particle.velocity.x *= -0.5;
        } else if (particle.position.x > this._xRange.max) {
            particle.position.x = this._xRange.max - 1e-6;
            particle.velocity.x *= -0.5;
        }
        if (particle.position.y < this._yRange.min) {
            particle.position.y = this._yRange.min + 1e-6;
            particle.velocity.y *= -0.5;
        } else if (particle.position.y > this._yRange.max) {
            particle.position.y = this._yRange.max - 1e-6;
            particle.velocity.y *= -0.5;
        }
    }

    _updatePosition(grid, dt) {
        for (const particle of this._particles) {
            particle.integrate(this._gravity, dt);
            this._boxBounce(particle);
            grid.addParticleToCell(particle);
            particle.force.set(0, 0);
            particle.rho = this._mass * SPHSolver.Wpoly6(this._hSquared, 0, this._Wpoly6_coeff);
        }
    }

    step(grid, dt) {
        this._calcDensity(grid);
        this._calcForces(grid);
        this._calcForcedVelocity();
        grid.reset();
        this._updatePosition(grid, dt);
    }

    getParticlePosition(i, position) {
        position.copy(this._particles[i].position).multiplyScalar(domainScale);
        position.y -= this._yRange.min;
    }
}

const solver = new SPHSolver();
const controls = {
    particleCount: new Slider('Num particles')
        .withRange(new Range(0, MAX_PARTICLE_COUNT, 10))
        .withValue(DEFAULT_PARTICLE_COUNT)
        .onChange(value => {
            particleCount = Math.round(value / 10) * 10;
            createParticleViews(particleCount);
            solver.setNumParticles(grid, particleCount);
            synchronizeParticlePositions();
        }),
    mass: new Slider('Particle mass')
        .withRange(new Range(1, 1000, 1))
        .withValue(1)
        .onInput(value => solver.mass = value),
    gasConstant: new Slider('Gas constant')
        .withRange(new Range(1, 1000, 1))
        .withValue(120)
        .onInput(value => solver.gasConstant = value),
    restDensity: new Slider('Rest density')
        .withRange(new Range(0, 10, 0.1))
        .withValue(3.75)
        .onInput(value => solver.restDensity = value),
    viscosity: new Slider('Viscosity')
        .withRange(new Range(0, 10, 0.1))
        .withValue(3)
        .onInput(value => solver.viscosity = value),
    gravityX: new Slider('Gravity X')
        .withRange(new Range(-100, 100, 10))
        .withValue(0)
        .onInput(value => solver.gravity.set(value, solver.gravity.y)),
    gravityY: new Slider('Gravity Y')
        .withRange(new Range(-100, 100, 10))
        .withValue(-20)
        .onInput(value => solver.gravity.set(solver.gravity.x, value))
};

const colorRegistry = new Registry({
    label: 'Particle color',
    entries: {
        Green: Colour.Green,
        Cyan: Colour.Cyan,
        Blue: Colour.LightBlue,
        Orange: Colour.Orange,
        White: Colour.White,
        Speed: Colour.LightBlue
    }
});

const colorControl = new DropdownMenu()
    .for(colorRegistry)
    .withValue('Speed')
    .onChange(name => {
        speedColoring = name === 'Speed';
        colorUpdateCounter = 0;

        if (speedColoring)
            updateParticleColors();
        else {
            particleColor = colorRegistry.get(name);
            for (const view of particleViews)
                view.fillColor = particleColor;
        }
    });

const simulation = Simulation
    .with({
        htmlDivId: 'sphHydrodynamicsContainer',
        viewport: { aspectRatio: '5/6', parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 0, WORLD_HEIGHT * 1.025),
            orthographic: true,
            controls: false
        },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>💧 Smoothed Particle Hydrodynamics</strong><br/>' +
                '📌 A particle-based fluid model using density, pressure, viscosity and a Verlet-style integrator.<br/>' +
                '©️  Hydrodynamics based on <a href="https://github.com/mjwatkins2/WebGL-SPH">Smoothed Particle Hydrodynamics Fluid Simulation with WebGL</a><br/>' +
                '👉 Particles colors indicate speed.'
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_clock, dt) => {
        grid.evolve(solver, dt);
        synchronizeParticlePositions();
        if (speedColoring && ++colorUpdateCounter % COLOR_UPDATE_INTERVAL === 0)
            updateParticleColors();
    })
    .onMouse("mousemove", (x, y, e) => {
        // Simulation.onMouse supplies normalized canvas coordinates in [-0.5, 0.5].
        // Engine.forceVelocity expects canvas pixels, with the origin at the top-left.
        const pointerX = Math.max(0, Math.min(simulation.width - 1, (x + 0.5) * simulation.width));
        const pointerY = Math.max(0, Math.min(simulation.height - 1, (0.5 - y) * simulation.height));
        solver.forceVelocity(grid, pointerX, pointerY, e.movementX, e.movementY);
    })
    .onReset(() => {
        solver.initialize();
        grid.init();
    })
    .append(controls.gravityX)
    .append(controls.gravityY)
    .append(controls.particleCount)
    // .append(controls.mass) TODO SEEMS TO BE INCORRECT
    .append(controls.gasConstant)
    .append(controls.restDensity)
    .append(controls.viscosity)
    .append(colorControl)
    .append(new Button('Defaults')
        .withText('Set defaults')
        .onClick(() => {
            particleCount = DEFAULT_PARTICLE_COUNT;
            solver.gravity.set(0, -20);
            controls.particleCount.withValue(DEFAULT_PARTICLE_COUNT);
            controls.mass.withValue(1);
            controls.gasConstant.withValue(120);
            controls.restDensity.withValue(3.75);
            controls.viscosity.withValue(3);
            controls.gravityX.withValue(0);
            controls.gravityY.withValue(-20);
            colorControl.withValue('Speed');
            speedColoring = true;
            colorUpdateCounter = 0;
            for (const view of particleViews)
                view.fillColor = particleColor;

            solver.setNumParticles(grid, particleCount);
            solver.restDensity = 4.5;
            solver.viscosity = 3;
            solver.gasConstant = 120;
            solver.mass = 1;
            synchronizeParticlePositions();
        }));

const particlePosition = new Vec2();
/** @type {RadialSymmetricBody[]} */
const particleModels = [];
/** @type {Circle[]} */
const particleViews = [];
let particleCount = DEFAULT_PARTICLE_COUNT;
let particleColor = colorRegistry.get('Blue');
let speedColoring = true;
let colorUpdateCounter = 0;

const normalizer = new FixedIntervalNormalizer(new Interval(0, SPEED_COLOR_MAX));
const colorMapper = ColorMappers.get(ColorMappers.Scientific, {colorSpace: LinearSRGBColorSpace});
const colour = new Colour();
function updateParticleColors() {
    let i, particle;
    for ([i, particle] of solver.entries()) {
        colorMapper.map(normalizer.normalize(particle.speed), colour)
        particleViews[i].fillColor = colour;
    }
}

function synchronizeParticlePositions() {
    const width = simulation.width;
    const height = simulation.height;
    const worldWidth = WORLD_HEIGHT * width / height;
    const radius = PARTICLE_RADIUS_IN_PIXELS * WORLD_HEIGHT / height;

    for (let i = 0; i < particleModels.length; i++) {
        const visible = i < particleCount;
        particleViews[i].visible = visible;
        if (!visible)
            continue;
        solver.getParticlePosition(i, particlePosition);
        particleModels[i].position.set(
            particlePosition.x / width * worldWidth - worldWidth / 2,
            particlePosition.y / height * WORLD_HEIGHT - WORLD_HEIGHT / 2
        );
        particleModels[i].radius = radius;
    }
}

function createParticleViews(count = particleCount) {
    for (let i = particleModels.length; i < count; i++) {
        const model = new RadialSymmetricBody({
            radius: PARTICLE_RADIUS_IN_PIXELS * WORLD_HEIGHT / simulation.height
        });
        const view = new Circle({
            fillColor: particleColor,
            borderColor: new Colour(0x131313),
            borderWidth: 0.15,
            segments: 10
        });

        particleModels.push(model);
        particleViews.push(view);
        view.visible = i < particleCount;
        simulation.bind(model.alwaysWith(view));
    }
}

solver.initialize();
grid.init();
createParticleViews();
synchronizeParticlePositions();
