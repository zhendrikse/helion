import {
    RadialSymmetricBody, Button, Circle, ColorMappers, Colour, DropdownMenu, FixedIntervalNormalizer,
    Interval, Range, Registry, Simulation, Slider, Vec2, Vec3, Force, PairForce, BindableCollection, ViewsCollection
} from '../../../src/index.js';
import { LinearSRGBColorSpace} from "three";

const DEFAULT_PARTICLE_COUNT = 1000;
const MAX_PARTICLE_COUNT = 4000;
const WORLD_HEIGHT = 20;
const PARTICLE_RADIUS_IN_PIXELS = 7.5;
const COLOR_UPDATE_INTERVAL = 10;
const SPEED_COLOR_MAX = 30;

const domainScale = 30;
const gridCellSize = 1;
let xRange = new Interval(0, 1);
let yRange = new Interval(0, 1);
let worldWidth = 0;
const INIT_MAX_PARTICLES_IN_CELL = 50;
const PI = Math.PI;

class SPHForce extends PairForce {
    constructor({mass = 1, viscosity = 3, smoothingLength = 1} = {}) {
        super();
        this.mass = mass;
        this.viscosity = viscosity;
        this._h = smoothingLength;
        this._hSquared = smoothingLength * smoothingLength;
        this._WspikyGradCoeff = -45.0 / (PI * Math.pow(smoothingLength, 6));
        this._WviscLaplCoeff = 45.0 / (PI * Math.pow(smoothingLength, 5));
        this._forceVector = new Vec2();
        this._positionVector = new Vec2();
        this._velocityVector = new Vec2();
    }

    /** @param {import('../../../src/model/phys/bodies.js').BodyPair} pair */
    _calculateForceOn(pair) {
        const particle1 = pair.body1;
        const particle2 = pair.body2;
        this._positionVector.copy(particle2.position).sub(particle1.position);
        const rSquared = this._positionVector.lengthSq();
        if (rSquared >= this._hSquared) {
            this._forceVector.set(0, 0);
            return;
        }

        const r = Math.sqrt(rSquared) + 1e-6;
        const pressureTerm = this.mass * (particle2.pressure + particle1.pressure) /
            (2 * particle2.rho) *
            SPHSolver.Wspiky_grad2(this._h, r, this._WspikyGradCoeff);
        const viscosityTerm = this.viscosity * this.mass *
            SPHSolver.Wvisc_lapl(this._h, r, this._WviscLaplCoeff) / particle2.rho;

        // PairForce applies -force to body1 and +force to body2. Negate the
        // original SPH vector so the resulting particle forces keep their signs.
        this._forceVector.copy(this._positionVector).multiplyScalar(pressureTerm);
        this._velocityVector.copy(particle2.velocity).sub(particle1.velocity);
        this._forceVector.add(this._velocityVector.multiplyScalar(viscosityTerm)).negate();
    }
}

class WallForce extends Force {
    constructor(smoothingLength, mass) {
        super();
        this._h = smoothingLength;
        this._mass = mass;
        this._WspikyGradCoeff = -45.0 / (PI * Math.pow(smoothingLength, 6));
    }

    /** @param {SPHParticle} particle */
    _calculateForceOn(particle) {
        const h = this._h;
        const c = this._WspikyGradCoeff;
        if (particle.position.x < xRange.min + h) {
            const r = particle.position.x - xRange.min;
            particle.force.x -= this._mass * particle.pressure / particle.rho *
                SPHSolver.Wspiky_grad2(h, r, c) * r;
        } else if (particle.position.x > xRange.max - h) {
            const r = xRange.max - particle.position.x;
            particle.force.x += this._mass * particle.pressure / particle.rho *
                SPHSolver.Wspiky_grad2(h, r, c) * r;
        }
        if (particle.position.y < yRange.min + h) {
            const r = particle.position.y - yRange.min;
            particle.force.y -= this._mass * particle.pressure / particle.rho *
                SPHSolver.Wspiky_grad2(h, r, c) * r;
        } else if (particle.position.y > yRange.max - h) {
            const r = yRange.max - particle.position.y;
            particle.force.y += this._mass * particle.pressure / particle.rho *
                SPHSolver.Wspiky_grad2(h, r, c) * r;
        }
    }
}

class SPHParticle extends RadialSymmetricBody {
    /** @param {{
     * position?: Vec2,
     * velocity?: Vec2,
     * mass?: number,
     * radius?: number
     * }} options */
    constructor({
        position = new Vec2(),
        velocity = new Vec2(),
        mass = 1,
        radius = PARTICLE_RADIUS_IN_PIXELS * WORLD_HEIGHT / (simulation.height * Math.min(window.devicePixelRatio || 1, 2))
    } = {}) {
        super({ position: position.clone(), velocity: velocity.clone(), mass, radius });
        this.rho = 0;
        this.pressure = 0;
        this._acceleration = new Vec2();
    }

    set mass(/** @type {number} */ value) { this._state.mass = value; }
    get speed() { return Math.hypot(this.velocity.x, this.velocity.y); }

    /**
     * @param {Vec2} gravity
     * @param {number} dt
     */
    integrate(gravity, dt) {
        this._acceleration.copy(this.force).multiplyScalar(1 / this.rho).add(gravity);
        this.velocity.addScaledVector(this._acceleration, dt);
        this.position.addScaledVector(this.velocity, dt);
        this.position.addScaledVector(this._acceleration, .5 * dt * dt);
    }

    reset() {
        this.force.set(0, 0);
        this.rho = 0;
        this.pressure = 0;
    }

    confineToBox() {
        if (this.position.x < xRange.min) {
            this.position.x = xRange.min + 1e-6;
            this.velocity.x *= -0.5;
        } else if (this.position.x > xRange.max) {
            this.position.x = xRange.max - 1e-6;
            this.velocity.x *= -0.5;
        }
        if (this.position.y < yRange.min) {
            this.position.y = yRange.min + 1e-6;
            this.velocity.y *= -0.5;
        } else if (this.position.y > yRange.max) {
            this.position.y = yRange.max - 1e-6;
            this.velocity.y *= -0.5;
        }
    }
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
    [Symbol.iterator] = () => this._cells[Symbol.iterator]();

    init() {
        this._nx = Math.floor(xRange.to / gridCellSize);
        this._ny = Math.floor(yRange.to / gridCellSize);
        this._width = xRange.to;
        this._height = yRange.to;
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
        if (i < 0 || i >= this._nx || j < 0 || j >= this._ny)
            return null;
        return this._cells[i + j * this._nx] ?? null;
    }

    addParticleToCell(particle) {
        const cell = this.getCellFromLocation(particle.position);
        if (cell) // cell can be null after the window has been resized
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
        this._k = gasConstant;
        this._mass = mass;

        // Precomputed smoothing-related constants
        this._hSquared = smoothingLength * smoothingLength;
        this._Wpoly6_coeff = 315.0 / (64 * Math.PI * Math.pow(smoothingLength, 9));

        this._particles = new BindableCollection();
        this._activeParticleCount = 0;
        this._wallForce = new WallForce(smoothingLength, mass);
        this._sphForce = new SPHForce({mass, viscosity, smoothingLength});

        // Scratch vectors
        this._positionVector = new Vec2();
    }

    get gravity() { return this._gravity; }
    get particleCount() { return this._activeParticleCount; }
    set mass(/** @type {number} */ value) { this._mass = value; }
    set restDensity(/** @type {number} */ value) { this._rho_0 = value; }
    set viscosity(/** @type {number} */ value) { this._sphForce.viscosity = value; }
    set gasConstant(/** @type {number} */ value) { this._k = value; }

    setNumParticles(grid, n, reset = false) {
        grid.hardReset();
        const previousCount = this._activeParticleCount;
        this._activeParticleCount = n;

        for (let i = this._particles.size; i < n; i++)
            this._particles._bindables.push(new SPHParticle({
                position: new Vec2(
                    Math.random() * xRange.range + xRange.min,
                    Math.random() * yRange.range + yRange.min
                ),
                velocity: new Vec2(Math.random() - 0.5, Math.random() - 0.5),
                mass: this._mass
            }));

        for (let i = 0; i < n; i++) {
            const particle = this._particles._bindables[i];
            if (reset || i >= previousCount) {
                particle.position.set(
                    Math.random() * xRange.range + xRange.min,
                    Math.random() * yRange.range + yRange.min
                );
                particle.velocity.set(Math.random() - 0.5, Math.random() - 0.5);
                particle.reset();
            }
            particle.mass = this._mass;
            particle.rho = this._mass * SPHSolver.Wpoly6(this._hSquared, 0, this._Wpoly6_coeff);
            grid.addParticleToCell(particle);
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

                particle.pressure = Math.max(this._k * (particle.rho - this._rho_0), 0);
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

    _calcForces(grid) {
        for (const cell of grid)
            for (let i = 0; i < cell.numParticles; i++) {
                const particle = cell._particles[i];
                for (let j = i + 1; j < cell.numParticles; j++)
                    particle.and(cell._particles[j]).apply(this._sphForce);

                for (const neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++)
                        particle.and(neighbor._particles[j]).apply(this._sphForce);

                particle.apply(this._wallForce);
            }
    }

    _updatePosition(grid, dt) {
        this._particles.forEach((particleBinding, index) => {
            if (index >= this._activeParticleCount)
                return;

            const particle = particleBinding.model;
            particle.integrate(this._gravity, dt);
            particle.confineToBox();
            grid.addParticleToCell(particle);
            particle.force.set(0, 0);
            particle.rho = this._mass * SPHSolver.Wpoly6(this._hSquared, 0, this._Wpoly6_coeff);
        });
    }

    step(grid, dt) {
        this._calcDensity(grid);
        this._calcForces(grid);
        grid.reset();
        this._updatePosition(grid, dt);
    }

    reset() {
        this.restDensity = 4.75;
        this.viscosity = 3;
        this.gasConstant = 120;
        this.mass = 1;
        this.gravity.set(0, -20);
    }
}

const scaledPositionVector = new Vec2();
class SPHParticleView extends Circle {
    synchronizeWith(particle) {
        const position = scaledPositionVector.set(
            particle.position.x * domainScale * WORLD_HEIGHT / simulation.height - worldWidth / 2,
            particle.position.y * domainScale * WORLD_HEIGHT / simulation.height - WORLD_HEIGHT / 2
        );
        super.synchronizeWith({ position, radius: particle.radius });
    }
}

class ParameterControls {
    static colorRegistry = new Registry({
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

    constructor(solver) {
        this.particleCount = new Slider('Num particles')
            .withRange(new Range(0, MAX_PARTICLE_COUNT, 10))
            .withValue(DEFAULT_PARTICLE_COUNT)
            .onChange(value => {
                particleCount = Math.round(value / 10) * 10;
                solver.setNumParticles(grid, particleCount);
                createParticleViews();
            });
        this.mass = new Slider('Particle mass')
            .withRange(new Range(1, 1000, 1))
            .withValue(1)
            .onInput(value => solver.mass = value);
        this.gasConstant = new Slider('Gas constant')
            .withRange(new Range(1, 1000, 1))
            .withValue(120)
            .onInput(value => solver.gasConstant = value);
        this.restDensity = new Slider('Rest density')
            .withRange(new Range(0, 10, 0.1))
            .withValue(4.75)
            .onInput(value => solver.restDensity = value);
        this.viscosity = new Slider('Viscosity')
            .withRange(new Range(0, 10, 0.1))
            .withValue(3)
            .onInput(value => solver.viscosity = value);
        this.gravityX = new Slider('Gravity X')
            .withRange(new Range(-100, 100, 10))
            .withValue(0)
            .onInput(value => solver.gravity.set(value, solver.gravity.y));
        this.gravityY = new Slider('Gravity Y')
            .withRange(new Range(-100, 100, 10))
            .withValue(-20)
            .onInput(value => solver.gravity.set(solver.gravity.x, value));
        this.colorControl = new DropdownMenu()
            .for(ParameterControls.colorRegistry)
            .withValue('Speed')
            .onChange(name => {
                speedColoring = name === 'Speed';
                colorUpdateCounter = 0;

                if (speedColoring)
                    updateParticleColors();
                else {
                    particleColor = ParameterControls.colorRegistry.get(name);
                    solver._particles.forEach(binding => binding.view.fillColor = particleColor);
                }
            });
    }

    reset() {
        this.particleCount.withValue(DEFAULT_PARTICLE_COUNT);
        this.mass.withValue(1);
        this.gasConstant.withValue(120);
        this.restDensity.withValue(4.75);
        this.viscosity.withValue(3);
        this.gravityX.withValue(0);
        this.gravityY.withValue(-20);
    }
}

let mouseMovedInLiquid = false;
let mousePosition = new Vec2();
let mouseVelocity = new Vec2();
let stirredCells = [];
function stirLiquid() {
    mousePosition.set(mousePosition.x / domainScale, yRange.max - mousePosition.y / domainScale);
    const cell = grid.getCellFromLocation(mousePosition);
    if (!cell) // cell can be null after the window has been resized
        return;

    stirredCells.push(cell);
    cell.halfNeighbors.forEach(neighborCell => stirredCells.push(neighborCell));

    for (const cell of stirredCells)
        for (let i = 0; i < cell.numParticles; i++) {
            const particle = cell._particles[i];
            particle.velocity.copy(mouseVelocity);
            particle.force.set(0, 0);
        }
    mouseMovedInLiquid = false;
    stirredCells = [];
}

function initScreenSize() {
    const xLimit = simulation.width / domainScale;
    const yLimit = simulation.height / domainScale;
    xRange = new Interval(0, xLimit);
    yRange = new Interval(0, yLimit);
    worldWidth = WORLD_HEIGHT * simulation.width / simulation.height;
}

const solver = new SPHSolver();
const controls = new ParameterControls(solver);
const simulation = Simulation
    .with({
        htmlDivId: 'sphHydrodynamicsContainer',
        viewport: { aspectRatio: '4/3', parameterMenuCollapsed: false },
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
                '👉 Move mouse or resize window to stir fluid.<br/>'
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_clock, dt) => {
        if (mouseMovedInLiquid)
            stirLiquid();
        grid.evolve(solver, dt);
        if (speedColoring && ++colorUpdateCounter % COLOR_UPDATE_INTERVAL === 0)
            updateParticleColors();
    })
    .onMouse("mousemove", (x, y, e) => {
        mousePosition.set(
            // Simulation.onMouse supplies normalized canvas coordinates in [-0.5, 0.5].
            // Engine.forceVelocity expects canvas pixels, with the origin at the top-left.
            Math.max(0, Math.min(simulation.width - 1, (x + 0.5) * simulation.width)),
            Math.max(0, Math.min(simulation.height - 1, (0.5 - y) * simulation.height))
        );
        mouseVelocity.set(e.movementX, -e.movementY);
        mouseMovedInLiquid = true;
    })
    .onReset(() => {
        initScreenSize();
        grid.init();
        solver.setNumParticles(grid, particleCount, true);
        createParticleViews();
    })
    .append(controls.gravityX)
    .append(controls.gravityY)
    .append(controls.particleCount)
    // .append(controls.mass) Possibly incorrect behavior? Behaves similarly to original though....
    .append(controls.gasConstant)
    .append(controls.restDensity)
    .append(controls.viscosity)
    .append(controls.colorControl)
    .append(new Button('Defaults')
        .withText('Set defaults')
        .onClick(() => {
            particleCount = DEFAULT_PARTICLE_COUNT;
            controls.reset();
            controls.colorControl.withValue('Speed');
            speedColoring = true;
            colorUpdateCounter = 0;
            createParticleViews();
            solver.setNumParticles(grid, particleCount);
            solver.reset();
        }));

let particleCount = DEFAULT_PARTICLE_COUNT;
let particleColor = ParameterControls.colorRegistry.get('Blue');
let speedColoring = true;
let colorUpdateCounter = 0;

const normalizer = new FixedIntervalNormalizer(new Interval(0, SPEED_COLOR_MAX));
const colorMapper = ColorMappers.get(ColorMappers.Scientific, {colorSpace: LinearSRGBColorSpace});
const colour = new Colour();
function updateParticleColors() {
    solver._particles.forEach(particleBinding => {
        colorMapper.map(normalizer.normalize(particleBinding.model.speed), colour)
        particleBinding.view.fillColor = colour;
    });
}

function createParticleViews() {
    simulation.bind(solver._particles.alwaysWith(ViewsCollection.of(SPHParticleView).with({
        fillColor: particleColor,
        borderColor: Colour.LightBlue,
        borderWidth: 0.2,
        segments: 8
    })));

    solver._particles.forEach((particleBinding, index) =>
        particleBinding.view.visible = index < solver.particleCount);
}

initScreenSize();
grid.init();
solver.setNumParticles(grid, particleCount, true);
createParticleViews();

window.addEventListener('resize', _ => {
    initScreenSize();
    solver._particles.forEach(particleBinding =>
        particleBinding.model.radius = PARTICLE_RADIUS_IN_PIXELS * WORLD_HEIGHT / (simulation.height * Math.min(window.devicePixelRatio || 1, 2)));
});
