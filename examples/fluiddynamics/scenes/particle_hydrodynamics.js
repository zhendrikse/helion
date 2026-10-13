import {
    Button, Circle, Colour, DropdownMenu,
    Interval, MathPhysicsModelBehavior, Range, Registry, Simulation, Slider, Vec2, Vec3
} from '../../../src/index.js';

const DEFAULT_PARTICLE_COUNT = 1000;
const MAX_PARTICLE_COUNT = 5000;
const WORLD_HEIGHT = 20;
const PARTICLE_RADIUS_IN_PIXELS = 5;

const domainScale = 30;
const gridCellSize = 1;
const INIT_MAX_PARTICLES_IN_CELL = 50;

const h = 1;
const h2 = h * h;
const h5 = Math.pow(h, 5);
const h6 = Math.pow(h, 6);
const h9 = Math.pow(h, 9);
const Wpoly6_coeff = 315.0 / (64 * Math.PI * h9);
const Wspiky_grad_coeff = -45.0 / (Math.PI * h6);
const Wvisc_lapl_coeff = 45.0 / (Math.PI * h5);

let mass = 1.0;
let k = 120;
let rho0 = 2.75;
let mu = 3;
let gravity = new Vec2(0, -20);

class Particle {
    /**
     * @param {Interval} xRange
     * @param {Interval} yRange
     */
    constructor(xRange, yRange) {
        this.position = new Vec2(Math.random() * xRange.range + xRange.min, Math.random() * yRange.range + yRange.min);
        this.velocity = new Vec2(Math.random() - 0.5, Math.random() - 0.5);
        this.force = new Vec2(0, 0);

        this.rho = 0;
        this.P = 0;

        this._acceleration = new Vec2();
    }

    integrate(dt) {
        this._acceleration.set(this.force.x, this.force.y).multiplyScalar(1 / this.rho);
        this._acceleration.add(gravity);
        this.velocity.addScaledVector(this._acceleration, dt);
        this.position.addScaledVector(this.velocity, dt);
        this.position.addScaledVector(this._acceleration, .5 * dt * dt);
    }

    reset() {
        this.force.set(0, 0);
        this.rho = mass * Wpoly6(0);
    }
}

class Cell {
    constructor() {
        this.particles = new Array(INIT_MAX_PARTICLES_IN_CELL);
        this.halfNeighbors = [];
        this.numParticles = 0;
    }
}

class Grid {
    constructor() {
        /** @type {Cell[]} */
        this.cells = [];
        this.nx = 0;
        this.ny = 0;
        this.w = 0;
        this.h = 0;
    }

    init(nx, ny, w, h) {
        this.nx = nx;
        this.ny = ny;
        this.w = w;
        this.h = h;
        const numCells = nx * ny;
        this.cells = new Array(numCells);
        for (let i = 0; i < numCells; i++)
            this.cells[i] = new Cell();

        for (let i = 0; i < nx; i++)
            for (let j = 0; j < ny; j++)
                this._computeNeighbors(i, j, this.cells[i + j * nx]);
    }

    _computeNeighbors(i, j, cell) {
        const idx = i + j * this.nx;
        if (i !== this.nx - 1)
            cell.halfNeighbors.push(this.cells[idx + 1]);
        if (j !== this.ny - 1) {
            for (let i2 = Math.max(0, i - 1); i2 <= Math.min(this.nx - 1, i + 1); i2++)
                cell.halfNeighbors.push(this.cells[idx + this.nx + i2 - i]);
        }
    }

    reset() {
        for (const cell of this.cells)
            cell.numParticles = 0;
    }

    hardReset() {
        for (const cell of this.cells) {
            cell.numParticles = 0;
            cell.particles = new Array(INIT_MAX_PARTICLES_IN_CELL);
        }
    }

    getCellFromLocation(x, y) {
        const i = Math.floor(this.nx * x / this.w);
        const j = Math.floor(this.ny * y / this.h);
        return this.cells[i + j * this.nx];
    }

    addParticleToCell(particle) {
        const cell = this.getCellFromLocation(particle.position.x, particle.position.y);
        if (cell != null)
            cell.particles[cell.numParticles++] = particle;
        else
            console.log("Undefined grid cell!");
    }
}

function Wpoly6(r2) {
    const temp = h2 - r2;
    return Wpoly6_coeff * temp * temp * temp;
}

function Wspiky_grad2(r) {
    const temp = h - r;
    return Wspiky_grad_coeff * temp * temp / r;
}

const Wvisc_lapl= (r) => Wvisc_lapl_coeff * (1 - r / h);

class Engine {
    constructor() {
        this.particles = [];
        this.grid = new Grid();
        this._xRange = new Interval(0, 1);
        this._yRange = new Interval(0, 1);

        this.xlimit = 0;
        this.ylimit = 0;
        this.lastTime = performance.now();
        this.forceVelocityOn = false;
        this.forceVelocityCell = null;
        this.forceVelocity = new Vec2(0, 0);

        this._positionVector = new Vec2();
        this._velocityVector = new Vec2();
        this._forceVector = new Vec2();
    }

    init(width, height, left, right, bottom, top) {
        while (left >= width)
            width += width;

        this.xlimit = width / domainScale;
        this.ylimit = height / domainScale;

        this._xRange = new Interval(left / domainScale, right / domainScale);
        this._yRange = new Interval(bottom / domainScale, top / domainScale);

        const numGridCellsX = Math.floor(this.xlimit / gridCellSize);
        const numGridCellsY = Math.floor(this.ylimit / gridCellSize);
        this.grid.init(numGridCellsX, numGridCellsY, this.xlimit, this.ylimit);

        this.particles = [];
    }

    resize(left, right, bottom, top) {
        this._xRange = new Interval(Math.max(left / domainScale, 0), Math.min(right / domainScale, this.xlimit));
        this._yRange = new Interval(Math.max(bottom / domainScale, 0), Math.min(top / domainScale, this.ylimit));
    }

    setNumParticles(n) {
        let i0 = 0;

        if (n < this.particles.length) {
            this.grid.hardReset();
            this.particles.length = n;
        }
        i0 = this.particles.length;

        for (let i = i0; i < n; i++) {
            this.particles[i] = new Particle(this._xRange, this._yRange);
            this.particles[i].rho = mass * Wpoly6(0);
        }
    }

    _calcDensity() {
        for (const cell of this.grid.cells) {
            for (let i = 0; i < cell.numParticles; i++) {
                const particle = cell.particles[i];
                for (let j = i + 1; j < cell.numParticles; j++)
                    this._addDensity(particle, cell.particles[j]);

                for (const neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++)
                        this._addDensity(particle, neighbor.particles[j]);

                particle.P = Math.max(k * (particle.rho - rho0), 0);
            }
        }
    }

    _addDensity(particle1, particle2) {
        this._positionVector.copy(particle2.position).sub(particle1.position);
        const r2 = this._positionVector.dot(this._positionVector);
        if (r2 >= h2)
            return;

        const temp = mass * Wpoly6(r2);
        particle1.rho += temp;
        particle2.rho += temp;
    }

    _addForces(particle1, particle2) {
        this._positionVector.copy(particle2.position).sub(particle1.position);
        const r2 = this._positionVector.dot(this._positionVector);
        if (r2 >= h2)
            return;

        const r = Math.sqrt(r2) + 1e-6;
        const temp1 = mass * (particle2.P + particle1.P) / (2 * particle2.rho) * Wspiky_grad2(r);
        const temp2 = mu * mass * Wvisc_lapl(r) / particle2.rho;
        this._positionVector.copy(particle2.position);
        this._velocityVector.copy(particle2.velocity);
        this._forceVector.copy(this._positionVector.sub(particle1.position).multiplyScalar(temp1));
        this._forceVector.add(this._velocityVector.sub(particle1.velocity).multiplyScalar(temp2));
        particle1.force.add(this._forceVector);
        particle2.force.sub(this._forceVector);
    }

    _calcForces() {
        for (const cell of this.grid.cells)
            for (let i = 0; i < cell.numParticles; i++) {
                const particle = cell.particles[i];
                for (let j = i + 1; j < cell.numParticles; j++)
                    this._addForces(particle, cell.particles[j]);

                for (const neighbor of cell.halfNeighbors)
                    for (let j = 0; j < neighbor.numParticles; j++)
                        this._addForces(particle, neighbor.particles[j]);

                this._addWallForces(particle);
            }
    }

    _addWallForces(particle) {
        if (particle.position.x < this._xRange.min + h) {
            const r = particle.position.x - this._xRange.min;
            particle.force.x -= mass * particle.P / particle.rho * Wspiky_grad2(r) * r;
        } else if (particle.position.x > this._xRange.max - h) {
            const r = this._xRange.max - particle.position.x;
            particle.force.x += mass * particle.P / particle.rho * Wspiky_grad2(r) * r;
        }
        if (particle.position.y < this._yRange.min + h) {
            const r = particle.position.y - this._yRange.min;
            particle.force.y -= mass * particle.P / particle.rho * Wspiky_grad2(r) * r;
        } else if (particle.position.y > this._yRange.max - h) {
            const r = this._yRange.max - particle.position.y;
            particle.force.y += mass * particle.P / particle.rho * Wspiky_grad2(r) * r;
        }
    }

    _calcForcedVelocity() {
        if (!this.forceVelocityOn || this.forceVelocityCell == null)
            return;
        for (let i = 0; i < this.forceVelocityCell.numParticles; i++) {
            const particle = this.forceVelocityCell.particles[i];
            particle.velocity.copy(this.forceVelocity);
            particle.force.set(0, 0);
        }
        this.forceVelocityOn = false;
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

    _updatePosition(dt) {
        for (const particle of this.particles) {
            particle.integrate(dt);
            this._boxBounce(particle);
            this.grid.addParticleToCell(particle);
            particle.reset();
        }
    }

    step() {
        this._calcDensity();
        this._calcForces();
        this._calcForcedVelocity();
        this.grid.reset();
        const now = performance.now();
        const dT = now - this.lastTime;
        this.lastTime = now;
        this._updatePosition(dT * 0.001);
    }

    unpause() {
        this.lastTime = performance.now();
    }

    getParticlePosition(i, position) {
        position.copy(this.particles[i].position).multiplyScalar(domainScale);
        position.y -= this._yRange.min;
    }

    forceVelocity(x, y, Vx, Vy) {
        this.forceVelocityOn = true;
        this.forceVelocityCell = this.grid.getCellFromLocation(x / domainScale, this._yRange.max - y / domainScale);
        this.forceVelocity.set(Vx, -Vy);
    }

    setFluidProperties(mass_, gasConstant, restDensity, viscosity) {
        mass = mass_;
        k = gasConstant;
        rho0 = restDensity;
        mu = viscosity;
    }
}

class ParticleRenderModel extends MathPhysicsModelBehavior {
    constructor(radius) {
        super();
        this.position = new Vec2();
        this.radius = radius;
    }

    updatePosition(x, y) {
        this.position.set(x, y);
    }
}

const controls = {
    particleCount: new Slider('Num particles')
        .withRange(new Range(0, MAX_PARTICLE_COUNT, 10))
        .withValue(DEFAULT_PARTICLE_COUNT)
        .onChange(value => {
            particleCount = Math.round(value / 10) * 10;
            createParticleViews(particleCount);
            engine.setNumParticles(particleCount);
            synchronizeParticlePositions();
        }),
    mass: new Slider('Particle mass')
        .withRange(new Range(1, 1000, 1))
        .withValue(1)
        .onInput(value => {
            mass = value;
            updateFluidProperties();
        }),
    gasConstant: new Slider('Gas constant')
        .withRange(new Range(1, 1000, 1))
        .withValue(120)
        .onInput(value => {
            k = value;
            updateFluidProperties();
        }),
    restDensity: new Slider('Rest density')
        .withRange(new Range(0, 10, 0.1))
        .withValue(2.75)
        .onInput(value => {
            rho0 = value;
            updateFluidProperties();
        }),
    viscosity: new Slider('Viscosity')
        .withRange(new Range(0, 10, 0.1))
        .withValue(3)
        .onInput(value => {
            mu = value;
            updateFluidProperties();
        }),
    gravityX: new Slider('Gravity X')
        .withRange(new Range(-100, 100, 10))
        .withValue(0)
        .onInput(value => gravity.set(value, gravity.y)),
    gravityY: new Slider('Gravity Y')
        .withRange(new Range(-100, 100, 10))
        .withValue(-20)
        .onInput(value => gravity.set(gravity.x, value))
};

const colorRegistry = new Registry({
    label: 'Particle color',
    entries: {
        Green: Colour.Green,
        Cyan: Colour.Cyan,
        Blue: Colour.LightBlue,
        Orange: Colour.Orange,
        White: Colour.White
    }
});

const colorControl = new DropdownMenu()
    .for(colorRegistry)
    .withValue('Blue')
    .onChange(name => {
        particleColor = colorRegistry.get(name);
        for (const view of particleViews)
            view.fillColor = particleColor;
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
                '©️  Hydrodynamics based on <a href="https://github.com/mjwatkins2/WebGL-SPH">Smoothed Particle Hydrodynamics Fluid Simulation with WebGL</a>'
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_clock, dt) => {
        engine.step();
        synchronizeParticlePositions();
    })
    .onReset(initializeEngine)
    .append(controls.particleCount)
    // .append(controls.mass) TODO SEEMS TO BE INCORRECT
    .append(controls.gasConstant)
    .append(controls.restDensity)
    .append(controls.viscosity)
    .append(controls.gravityX)
    .append(controls.gravityY)
    .append(colorControl)
    .append(new Button('Defaults')
        .withText('Set defaults')
        .onClick(() => {
            particleCount = DEFAULT_PARTICLE_COUNT;
            mass = 1;
            k = 120;
            rho0 = 2.75;
            mu = 3;
            gravity.set(0, -20);
            controls.particleCount.withValue(DEFAULT_PARTICLE_COUNT);
            controls.mass.withValue(1);
            controls.gasConstant.withValue(120);
            controls.restDensity.withValue(2.75);
            controls.viscosity.withValue(3);
            controls.gravityX.withValue(0);
            controls.gravityY.withValue(-20);
            colorControl.withValue('Blue');
            particleColor = colorRegistry.get('Blue');
            for (const view of particleViews)
                view.fillColor = particleColor;
            engine.setNumParticles(particleCount);
            updateFluidProperties();
            synchronizeParticlePositions();
        }));

const engine = new Engine();
const particlePosition = new Vec2();
const particleModels = [];
const particleViews = [];
let particleCount = DEFAULT_PARTICLE_COUNT;
let particleColor = colorRegistry.get('Blue');

const updateFluidProperties = () => engine.setFluidProperties(mass, k, rho0, mu);

function initializeEngine() {
    const width = simulation.width;
    const height = simulation.height;

    engine.init(width, height, 0, width, 0, height);
    engine.setNumParticles(particleCount);
    engine.unpause();
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
        engine.getParticlePosition(i, particlePosition);
        particleModels[i].updatePosition(
            particlePosition.x / width * worldWidth - worldWidth / 2,
            particlePosition.y / height * WORLD_HEIGHT - WORLD_HEIGHT / 2
        );
        particleModels[i].radius = radius;
    }
}

function createParticleViews(count = particleCount) {
    for (let i = particleModels.length; i < count; i++) {
        const model = new ParticleRenderModel(PARTICLE_RADIUS_IN_PIXELS * WORLD_HEIGHT / simulation.height);
        const view = new Circle({
            fillColor: particleColor,
            borderColor: new Colour(0x131313),
            borderWidth: 0.15,
            segments: 16
        });

        particleModels.push(model);
        particleViews.push(view);
        view.visible = i < particleCount;
        simulation.bind(model.alwaysWith(view));
    }
}

initializeEngine();
createParticleViews();
updateFluidProperties();
synchronizeParticlePositions();
