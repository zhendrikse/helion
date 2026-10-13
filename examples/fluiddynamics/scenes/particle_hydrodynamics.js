import {
    Button, Circle, Colour, DropdownMenu, MathPhysicsModelBehavior, Range, Registry, Simulation, Slider, Vec2, Vec3
} from '../../../src/index.js';

//
// https://github.com/mjwatkins2/WebGL-SPH
//

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
let rho0 = 0;
let mu = 3;
let gravity = new Vec2(0, -20);

class Particle {
    constructor(xmin, xmax, ymin, ymax) {
        this.position = new Vec2(Math.random() * (xmax - xmin) + xmin, Math.random() * (ymax - ymin) + ymin);
        this.velocity = new Vec2(Math.random() - 0.5, Math.random() - 0.5);
        this.force = new Vec2(0, 0);

        this.rho = 0;
        this.P = 0;
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
            for (let j = 0; j < ny; j++) {
                const c = this.cells[i + j * nx];
                this.computeNeighbors(i, j, c);
            }
    }

    computeNeighbors(i, j, c) {
        const idx = i + j * this.nx;
        if (i !== this.nx - 1)
            c.halfNeighbors.push(this.cells[idx + 1]);
        if (j !== this.ny - 1) {
            for (let i2 = Math.max(0, i - 1); i2 <= Math.min(this.nx - 1, i + 1); i2++)
                c.halfNeighbors.push(this.cells[idx + this.nx + i2 - i]);
        }
    }

    reset() {
        for (const c of this.cells)
            c.numParticles = 0;
    }

    hardreset() {
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

function Wvisc_lapl(r) {
    return Wvisc_lapl_coeff * (1 - r / h);
}

function dist2(p1, p2) {
    const dx = p2.position.x - p1.position.x;
    const dy = p2.position.y - p1.position.y;
    return dx * dx + dy * dy;
}

function addDensity(p1, p2) {
    const r2 = dist2(p1, p2);
    if (r2 < h2) {
        const temp = mass * Wpoly6(r2);
        p1.rho += temp;
        p2.rho += temp;
    }
}

function addForces(p1, p2) {
    const r2 = dist2(p1, p2);
    if (r2 < h2) {
        const r = Math.sqrt(r2) + 1e-6;
        const temp1 = mass * (p2.P + p1.P) / (2 * p2.rho) * Wspiky_grad2(r);
        const force = new Vec2(temp1 * (p2.position.x - p1.position.x), temp1 * (p2.position.y - p1.position.y));
        const temp2 = mu * mass * Wvisc_lapl(r) / p2.rho;
        force.x += temp2 * (p2.velocity.x - p1.velocity.x);
        force.y += temp2 * (p2.velocity.y - p1.velocity.y);
        p1.force.add(force);
        p2.force.sub(force);
    }
}

function addWallForces(p1, xmin, xmax, ymin, ymax) {
    if (p1.position.x < xmin + h) {
        const r = p1.position.x - xmin;
        p1.force.x -= mass * p1.P / p1.rho * Wspiky_grad2(r) * r;
    } else if (p1.position.x > xmax - h) {
        const r = xmax - p1.position.x;
        p1.force.x += mass * p1.P / p1.rho * Wspiky_grad2(r) * r;
    }
    if (p1.position.y < ymin + h) {
        const r = p1.position.y - ymin;
        p1.force.y -= mass * p1.P / p1.rho * Wspiky_grad2(r) * r;
    } else if (p1.position.y > ymax - h) {
        const r = ymax - p1.position.y;
        p1.force.y += mass * p1.P / p1.rho * Wspiky_grad2(r) * r;
    }
}

class Engine {
    constructor() {
        this.particles = [];
        this.grid = new Grid();
        this.xmin = 0;
        this.xmax = 0;
        this.ymin = 0;
        this.ymax = 0;
        this.xlimit = 0;
        this.ylimit = 0;
        this.lastTime = performance.now();
        this.forceVelocityOn = false;
        this.forceVelocityCell = null;
        this.forceVelocity = new Vec2(0, 0);
    }

    init(width, height, left, right, bottom, top) {
        while (left >= width)
            width += width;

        this.xlimit = width / domainScale;
        this.xmin = left / domainScale;
        this.xmax = right / domainScale;

        this.ylimit = height / domainScale;
        this.ymin = bottom / domainScale;
        this.ymax = top / domainScale;

        const numGridCellsX = Math.floor(this.xlimit / gridCellSize);
        const numGridCellsY = Math.floor(this.ylimit / gridCellSize);
        this.grid.init(numGridCellsX, numGridCellsY, this.xlimit, this.ylimit);

        this.particles = [];
    }

    resize(left, right, bottom, top) {
        this.xmin = Math.max(left / domainScale, 0);
        this.xmax = Math.min(right / domainScale, this.xlimit);
        this.ymin = Math.max(bottom / domainScale, 0);
        this.ymax = Math.min(top / domainScale, this.ylimit);
    }

    setNumParticles(n) {
        let i0 = 0;

        if (n < this.particles.length) {
            this.grid.hardreset();
            this.particles.length = n;
        }
        i0 = this.particles.length;

        for (let i = i0; i < n; i++) {
            this.particles[i] = new Particle(this.xmin, this.xmax, this.ymin, this.ymax);
            this.particles[i].rho = mass * Wpoly6(0);
        }
    }

    calcDensity() {
        for (const cell of this.grid.cells) {
            for (let i = 0; i < cell.numParticles; i++) {
                const p1 = cell.particles[i];
                for (let j = i + 1; j < cell.numParticles; j++) {
                    const p2 = cell.particles[j];
                    addDensity(p1, p2);
                }
                for (const neighbor of cell.halfNeighbors) {
                    for (let j = 0; j < neighbor.numParticles; j++) {
                        const p2 = neighbor.particles[j];
                        addDensity(p1, p2);
                    }
                }
                p1.P = Math.max(k * (p1.rho - rho0), 0);
            }
        }
    }

    calcForces() {
        for (const cell of this.grid.cells) {
            for (let i = 0; i < cell.numParticles; i++) {
                const p1 = cell.particles[i];
                for (let j = i + 1; j < cell.numParticles; j++)
                    addForces(p1, cell.particles[j]);

                for (const neighbor of cell.halfNeighbors) {
                    for (let j = 0; j < neighbor.numParticles; j++)
                        addForces(p1, neighbor.particles[j]);
                }
                addWallForces(p1, this.xmin, this.xmax, this.ymin, this.ymax);
            }
        }
    }

    calcForcedVelocity() {
        if (!this.forceVelocityOn || this.forceVelocityCell == null)
            return;
        for (let i = 0; i < this.forceVelocityCell.numParticles; i++) {
            const p = this.forceVelocityCell.particles[i];
            p.velocity.copy(this.forceVelocity);
            p.force.set(0, 0);
        }
        this.forceVelocityOn = false;
    }

    updatePosition(dT) {
        for (const p of this.particles) {
            const ax = p.force.x / p.rho + gravity.x;
            const ay = p.force.y / p.rho + gravity.y;

            p.velocity.x += ax * dT;
            p.velocity.y += ay * dT;

            p.position.x += (p.velocity.x + 0.5 * ax * dT) * dT;
            p.position.y += (p.velocity.y + 0.5 * ay * dT) * dT;

            if (p.position.x < this.xmin) {
                p.position.x = this.xmin + 1e-6;
                p.velocity.x *= -0.5;
            } else if (p.position.x > this.xmax) {
                p.position.x = this.xmax - 1e-6;
                p.velocity.x *= -0.5;
            }
            if (p.position.y < this.ymin) {
                p.position.y = this.ymin + 1e-6;
                p.velocity.y *= -0.5;
            } else if (p.position.y > this.ymax) {
                p.position.y = this.ymax - 1e-6;
                p.velocity.y *= -0.5;
            }

            this.grid.addParticleToCell(p);
            p.reset();
        }
    }

    doPhysics() {
        this.calcDensity();
        this.calcForces();
        this.calcForcedVelocity();
        this.grid.reset();
        const now = performance.now();
        const dT = now - this.lastTime;
        this.lastTime = now;
        this.updatePosition(dT * 0.001);
    }

    unpause() {
        this.lastTime = performance.now();
    }

    getParticlePosition(i, position) {
        const p = this.particles[i];
        position.x = p.position.x * domainScale;
        position.y = p.position.y * domainScale - this.ymin;
    }

    forceVelocity(x, y, Vx, Vy) {
        this.forceVelocityOn = true;
        this.forceVelocityCell = this.grid.getCellFromLocation(x / domainScale, this.ymax - y / domainScale);
        this.forceVelocity.set(Vx, -Vy);
    }

    setGravity(gravityX, gravityY) {
        gravity.set(gravityX, gravityY);
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

const simulation = Simulation
    .with({
        htmlDivId: 'sphHydrodynamicsContainer',
        viewport: { aspectRatio: '2/3', parameterMenuCollapsed: true },
        camera: {
            position: new Vec3(0, 0, WORLD_HEIGHT),
            orthographic: true,
            controls: false
        },
        scene: { backgroundColor: new Colour(0x1a1a1a), scale: 1 },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>💧 Smoothed Particle Hydrodynamics</strong><br/>' +
                'A particle-based fluid model using density, pressure, viscosity and a Verlet-style integrator.<br/>' +
                'Drag the sliders to explore how the parameters affect the fluid.'
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep(() => engine.doPhysics())
    .onFrame(synchronizeParticlePositions)
    .onReset(initializeEngine);

const engine = new Engine();
const particlePosition = new Vec2();
const particleModels = [];
const particleViews = [];
let particleCount = DEFAULT_PARTICLE_COUNT;
let particleColor = new Colour(0x00ff00);

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
            borderColor: Colour.Black,
            borderWidth: 0.05,
            segments: 8
        });

        particleModels.push(model);
        particleViews.push(view);
        view.visible = i < particleCount;
        simulation.bind(model.alwaysWith(view));
    }
}

initializeEngine();
createParticleViews();

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
        .withValue(0.5)
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
        .onInput(value => engine.setGravity(value, gravity.y)),
    gravityY: new Slider('Gravity Y')
        .withRange(new Range(-100, 100, 10))
        .withValue(-20)
        .onInput(value => engine.setGravity(gravity.x, value))
};

function updateFluidProperties() {
    engine.setFluidProperties(mass, k, rho0, mu);
}

const colorRegistry = new Registry({
    label: 'Particle color',
    entries: {
        Green: '#00ff00',
        Cyan: '#00ffff',
        Blue: '#3388ff',
        Orange: '#ff9900',
        White: '#ffffff'
    }
});

const colorControl = new DropdownMenu()
    .for(colorRegistry)
    .withValue('Green')
    .onChange(name => {
        particleColor = new Colour(Number.parseInt(colorRegistry.get(name).slice(1), 16));
        for (const view of particleViews)
            view.fillColor = particleColor;
    });

simulation
    .append(controls.particleCount)
    .append(controls.mass)
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
            rho0 = 0.5;
            mu = 3;
            engine.setGravity(0, -20);
            controls.particleCount.withValue(DEFAULT_PARTICLE_COUNT);
            controls.mass.withValue(1);
            controls.gasConstant.withValue(120);
            controls.restDensity.withValue(0.5);
            controls.viscosity.withValue(3);
            controls.gravityX.withValue(0);
            controls.gravityY.withValue(-20);
            colorControl.withValue('Green');
            particleColor = new Colour(0x00ff00);
            for (const view of particleViews)
                view.fillColor = particleColor;
            engine.setNumParticles(particleCount);
            updateFluidProperties();
            synchronizeParticlePositions();
        }));

updateFluidProperties();
simulation.appendStartStopResetUI().start();
