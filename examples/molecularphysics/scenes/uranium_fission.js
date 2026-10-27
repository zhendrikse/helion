import {
    Colour, ModelObjectsCollection, RadialSymmetricBody, Simulation, Sphere, Trail, Vec3, ViewsCollection
} from '../../../src/index.js';

// Dimensionless coordinates keep the original VPython geometry and time step readable.
const cubeSide = 1;
const physicalCubeSide = 1.4e-7;
const cellCount = 4;
const side = cubeSide / cellCount;
const nucleusRadius = side / 3;
const oxideRadius = nucleusRadius * 0.7;
const uranium235Fraction = 0.055; // TODO set back to 0.035?
const dt = 1e-12;
const neutronSpeed = 3200;
const productSpeed = 500;
const fissionNeutronSpeed = 2200;

const COLOR_OXIDE = new Colour(0x28b463);
const COLOR_U238 = new Colour(0x2874a6);
const COLOR_U235 = new Colour(0xe74c3c);
const COLOR_PRODUCT = new Colour(0xf4d03f);
const COLOR_NEUTRON = new Colour(0xdddddd);

const nuclei = new ModelObjectsCollection();
const nucleiViews = ViewsCollection.of(Sphere).with({ segments: 12});
const oxygenAtoms = new ModelObjectsCollection();
/** @type {RadialSymmetricBody[]} */
const neutrons = [];
const products = [];
const flashes = [];
let radioactiveRemaining = 0;

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

function createParticle({ position, velocity, radius, color }) {
    const body = new RadialSymmetricBody({
        position: position.clone(),
        velocity: velocity.clone(),
        radius
    });
    const view = new Sphere({ color, segments: 12 });
    simulation.bind(body.alwaysWith(view));
    return { body, view };
}

class Nucleus extends RadialSymmetricBody {
    constructor(position, radius, isU235, view) {
        super({ position, radius });
        this.isU235 = isU235;
        this.fissioned = false;
    }
}

function addNucleus(position) {
    const isU235 = Math.random() < uranium235Fraction;
    nuclei.add(new Nucleus(position, nucleusRadius, isU235));
    radioactiveRemaining += isU235 ? 1 : 0;
}

const oxygenOffsets = [
    [0, 0, 0], [1, 0, 0], [1, 0, 1], [.5, 0, .5], [0, 0, 1],
    [0, .5, .5], [.5, .5, 0], [1, .5, .5], [.5, .5, 1],
    [0, 1, 0], [1, 1, 0], [.5, 1, .5], [0, 1, 1]
];
const uraniumOffsets = [
    [.25, .25, .25], [.25, .75, .25], [.75, .25, .25], [.75, .75, .25],
    [.25, .25, .75], [.25, .75, .75], [.75, .25, .75]
];
function initializeLattice() {
    // Each conventional cell contains seven uranium nuclei and thirteen oxygen ions,
    // matching the arrangement in the supplied VPython source.
    for (let ix = 0; ix < cellCount; ix++)
        for (let iy = 0; iy < cellCount; iy++)
            for (let iz = 0; iz < cellCount; iz++) {
                const offset = new Vec3(ix - 2, iy - 2, iz - 2);
                for (const [x, y, z] of oxygenOffsets)
                    oxygenAtoms.add(new RadialSymmetricBody({
                        position: offset.clone().add(new Vec3(x, y, z)),
                        radius: oxideRadius,
                    }));

                for (const [x, y, z] of uraniumOffsets)
                    addNucleus(offset.clone().add(new Vec3(x, y, z)));
            }

    simulation.setBottomText(`Radioactive U-235 nuclei remaining: ${radioactiveRemaining}`);
}

function createFlash(position) {
    const body = new RadialSymmetricBody({ position: position.clone(), radius: nucleusRadius * 0.01 });
    const view = new Sphere({ color: COLOR_PRODUCT, opacity: 0.6, segments: 12 });
    simulation.bind(body.alwaysWith(view));
    flashes.push({ body, view, growthSpeed: (5000 + Math.random() * 5000) * dt / physicalCubeSide });
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

function fission(nucleus, index) {
    if (nucleus.fissioned || !nucleus.isU235)
        return;

    nucleus.fissioned = true;
    nucleiViews.viewAt(index).visible = false;
    radioactiveRemaining--;
    simulation.setBottomText(`Radioactive U-235 nuclei remaining: ${radioactiveRemaining}`);
    createFlash(nucleus.position);
    createNeutron(nucleus.position);
    createNeutron(nucleus.position);

    const velocity = randomDirection(productSpeed * dt / physicalCubeSide);
    products.push(createParticle({
        position: nucleus.position,
        velocity,
        radius: nucleusRadius,
        color: COLOR_PRODUCT
    }));
    products.push(createParticle({
        position: nucleus.position,
        velocity: velocity.clone().negate(),
        radius: nucleusRadius,
        color: COLOR_PRODUCT
    }));
}

function update() {
    for (const neutron of neutrons) {
        const p = neutron.position;
        const v = neutron.velocity;
        if (p.x > 2 || p.x < -2) v.x *= -1;
        if (p.y > 2 || p.y < -2) v.y *= -1;
        if (p.z > 2 || p.z < -2) v.z *= -1;

        nuclei.forEach((nucleus, index) => {
            if (!nucleus.fissioned && nucleus.isU235 && p.distanceTo(nucleus.position) < nucleusRadius)
                fission(nucleus, index);
        });
        neutron.position.add(neutron.velocity);
    }

    for (const product of products) {
        product.body.position.add(product.body.velocity);
        if (product.body.position.length() > 3)
            product.view.visible = false;
    }

    for (const flash of flashes) {
        flash.body.radius += flash.growthSpeed;
        flash.view._mesh.material.opacity = Math.max(0, 1 - flash.body.radius / 2);
        if (flash.body.radius > 2) {
            flash.view.visible = false;
            flash.growthSpeed = 0;
        }
    }
}

initializeLattice();
simulation
    .bind(nuclei.alwaysWith(nucleiViews))
    .bind(oxygenAtoms.onceWith(ViewsCollection.of(Sphere).with({ segments: 12, color: COLOR_OXIDE })))
    .start();

nuclei.forEach((nucleus, index) =>
    nucleiViews.viewAt(index).color = nucleus.isU235 ? COLOR_U235 : COLOR_U238);
createNeutron(new Vec3(), 15, neutronSpeed);

