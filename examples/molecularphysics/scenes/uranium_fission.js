import {
    BindingsCollection, Colour, ModelObjectsCollection, RadialSymmetricBody, Simulation,
    Sphere, Trail, Vec3, ViewsCollection, Binding
} from '../../../src/index.js';

// Dimensionless coordinates keep the original VPython geometry and time step readable.
const cubeSide = 1;
const physicalCubeSide = 1.4e-7;
const cellCount = 4;
const side = cubeSide / cellCount;
const nucleusRadius = side / 3;
const oxideRadius = nucleusRadius * 0.7;
const uranium235Fraction = 0.055; // Increased from 0.035 to enlarge collision chance
const dt = 1e-12;
const neutronSpeed = 3200; // Initial neutron a bit faster, again to enlarge collision chance
const productSpeed = 500;
const fissionNeutronSpeed = 2200;

const COLOR_U238 = new Colour(0x2874a6);
const COLOR_U235 = new Colour(0xe74c3c);
const COLOR_PRODUCT = new Colour(0xf4d03f);
const COLOR_NEUTRON = new Colour(0xdddddd);

const nucleiModelViewBindings = new BindingsCollection();
const oxygenAtoms = new ModelObjectsCollection();
/** @type {RadialSymmetricBody[]} */
const neutrons = [];
const productBindings = new BindingsCollection();
/** @type {{ body: RadialSymmetricBody, view: Sphere, growthSpeed: number }[]} */
const flashes = [];

const simulation = Simulation
    .with({
        htmlDivId: 'uraniumFissionContainer',
        viewport: { aspectRatio: '1 / 1' },
        headUpDisplay: { enabled: false },
        camera: {
            position: new Vec3(5, 5, 7).multiplyScalar(.75),
            fieldOfView: 50,
        },
        infoPanel: {
            text: '<strong>☢️ Uranium fission</strong><br/>• <span style=\"color: green;\">Green</span> = oxide ions<br/>' +
                '• <span style=\"color: blue;\">Blue</span> = uranium 238 ions<br/>' +
                '• <span style="color: red;">Red</span> = uranium 235 ions<br/>' +
                '• <span style="color: yellow;">Yellow</span> = reaction product (Ba / Kr)<br/>' +
                '• <span style="color: gray;">Gray</span> = thermal neutron<br/>' +
                '• U235 nuclear collision cross-section exaggerated.'
        }
    })
    .runsEvery(1e-3)
    .onStep(update)

function randomDirection(speed) {
    const direction = new Vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (direction.length() < 1e-8)
        direction.set(1, 0, 0);
    return direction.normalize().multiplyScalar(speed);
}

class Nucleus extends RadialSymmetricBody {
    constructor(position, radius, isU235, view) {
        super({ position, radius });
        this.isU235 = isU235;
        this.fissioned = false;
    }
}

class Lattice {
    static oxygenOffsets = [
        [0, 0, 0], [1, 0, 0], [1, 0, 1], [.5, 0, .5], [0, 0, 1],
        [0, .5, .5], [.5, .5, 0], [1, .5, .5], [.5, .5, 1],
        [0, 1, 0], [1, 1, 0], [.5, 1, .5], [0, 1, 1]
    ];
    static uraniumOffsets = [
        [.25, .25, .25], [.25, .75, .25], [.75, .25, .25], [.75, .75, .25],
        [.25, .25, .75], [.25, .75, .75], [.75, .25, .75]
    ];

    constructor() {
        this._radioactiveRemaining = 0;
        this._nuclei = new ModelObjectsCollection();

        // Each conventional cell contains seven uranium nuclei and thirteen oxygen ions
        for (let ix = 0; ix < cellCount; ix++)
            for (let iy = 0; iy < cellCount; iy++)
                for (let iz = 0; iz < cellCount; iz++)
                    this._createLatticePointAt(ix, iy, iz);

        simulation.setBottomText(`Radioactive U-235 nuclei remaining: ${this._radioactiveRemaining}`);
    }

    get nuclei() { return this._nuclei; }

    fission() { this._radioactiveRemaining-- }

    _addNucleus(position) {
        const isU235 = Math.random() < uranium235Fraction;
        this._nuclei.add(new Nucleus(position, nucleusRadius, isU235));
        this._radioactiveRemaining += isU235 ? 1 : 0;
    }

    _createLatticePointAt(ix, iy, iz) {
        const offset = new Vec3(ix - 2, iy - 2, iz - 2);
        for (const [x, y, z] of Lattice.oxygenOffsets)
            oxygenAtoms.add(new RadialSymmetricBody({
                position: offset.clone().add(new Vec3(x, y, z)),
                radius: oxideRadius,
            }));

        for (const [x, y, z] of Lattice.uraniumOffsets)
            this._addNucleus(offset.clone().add(new Vec3(x, y, z)));
    }
}

function check(neutron) {
    nucleiModelViewBindings.forEach(nucleusBinding => {
        const nucleus = nucleusBinding.model;
        if (!nucleus.fissioned && nucleus.isU235 && neutron.position.distanceTo(nucleus.position) < nucleusRadius)
            fissionFor(nucleusBinding);
    });
}

function fissionFor(nucleusBinding) {
    const nucleus = nucleusBinding.model;
    if (nucleus.fissioned || !nucleus.isU235)
        return;

    nucleus.fissioned = true;
    nucleusBinding.view.visible = false;
    lattice.fission();
    simulation.setBottomText(`Radioactive U-235 nuclei remaining: ${lattice._radioactiveRemaining}`);
    createFlash(nucleus.position);
    createNeutron(nucleus.position);
    createNeutron(nucleus.position);

    const velocity = randomDirection(productSpeed * dt / physicalCubeSide);
    for (let i = 0; i < 2; i++) {
        const product = new RadialSymmetricBody({
            position: nucleus.position.clone(),
            velocity: i === 0 ? velocity : velocity.clone().negate(),
            radius: nucleusRadius
        });
        const binding = Binding.Empty();
        simulation.bind(product.alwaysWith(new Sphere({color: COLOR_PRODUCT, segments: 12}))
            .capture(binding));
        productBindings.add(binding);
    }
}

function createFlash(position) {
    const body = new RadialSymmetricBody({ position: position.clone(), radius: nucleusRadius * 0.01 });
    const view = new Sphere({ color: COLOR_PRODUCT, opacity: 0.6, segments: 12 });
    simulation.bind(body.alwaysWith(view));
    flashes.push({ body, view, growthSpeed: (2500 + Math.random() * 2500) * dt / physicalCubeSide });
}

function createNeutron(position, trailLength = 10, speed = fissionNeutronSpeed) {
    const neutron = new RadialSymmetricBody({
        position,
        velocity: randomDirection(speed * dt / physicalCubeSide),
        radius: nucleusRadius * 0.35,
    });
    simulation.bind(neutron.alwaysWith(new Sphere({
        segments: 12,
        color: COLOR_NEUTRON,
        trailLength
    })));
    simulation.bind(neutron.alwaysWith(new Trail({
        color: COLOR_NEUTRON,
        maxPoints: trailLength,
        trailStep: 2
    })));
    neutrons.push(neutron);
}

function update() {
    for (const neutron of neutrons) {
        check(neutron);

        const p = neutron.position;
        const v = neutron.velocity;
        if (p.x > 2 || p.x < -2) v.x *= -1;
        if (p.y > 2 || p.y < -2) v.y *= -1;
        if (p.z > 2 || p.z < -2) v.z *= -1;
        neutron.position.add(neutron.velocity);
    }

    for (const productBinding of productBindings) {
        productBinding.model.position.add(productBinding.model.velocity);
        productBinding.view.visible = productBinding.model.position.length() < 3;
    }

    for (const flash of flashes) {
        flash.body.radius += flash.growthSpeed;
        flash.view._mesh.material.opacity = Math.max(0, 1 - flash.body.radius / 2);
        flash.view.visible = flash.body.radius < 2;
        if (flash.body.radius > 2)
            flash.growthSpeed = 0;
    }
}

const lattice = new Lattice();
simulation
    .bind(lattice.nuclei.alwaysWith(ViewsCollection.of(Sphere).with({ segments: 12})).capture(nucleiModelViewBindings))
    .bind(oxygenAtoms.onceWith(ViewsCollection.of(Sphere).with({ segments: 12, color: new Colour(0x28b463) })))
    .start();

nucleiModelViewBindings.forEach(nucleusBinding =>
    nucleusBinding.view.color = nucleusBinding.model.isU235 ? COLOR_U235 : COLOR_U238);
createNeutron(new Vec3(), 15, neutronSpeed);
