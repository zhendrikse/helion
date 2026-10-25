import {
    VectorField, Range, Cylinder, ArrowField, Sphere, RadialSymmetricBody, Vec3,
    Arrow, Ring, Checkbox, Simulation, AxialSymmetricBody, Colour, ModelObjectsCollection, ViewsCollection
} from '../../../src/index.js';

const loopSegments = 10;
const loopRadius = 0.5;   // pas aan voor visual scale
const loopZs = [-2, -1, 0, 1, 2];       // kun je uitbreiden naar meerdere lagen
const dBdtMax = 0.2; // maximale dB/dt
const zStart = -4;
const numCharges = 8;

const wire = new AxialSymmetricBody({
    position: new Vec3(0, 0, zStart),
    axis: new Vec3(0, 0, Math.abs(zStart) * 2),
    radius: 0.04
});

const magneticFieldPositions = [];
for (const z of loopZs) {
    magneticFieldPositions.push(
        new Vec3(0.25, 0, z),
        new Vec3(-0.25, 0, z),
        new Vec3(0, 0.25, z),
        new Vec3(0, -0.25, z)
    );
}

class FaradayField extends VectorField {
    sample(position, target) {
        const r = Math.hypot(position.x, position.y); // r = constant along z-dir!
        const thetaHat = new Vec3(-position.y / r, position.x / r, 0);
        target.copy(thetaHat.multiplyScalar(-dBdtMax / r));
    }
}

const faradayLoops = new ModelObjectsCollection();
const faradayLoopArrows = new ModelObjectsCollection();
for (const z of loopZs) {
    for (let i = 0; i < loopSegments; i++) {
        const theta = (i / loopSegments) * 2 * Math.PI;
        const tangent = new Vec3(-Math.sin(theta), Math.cos(theta), 0); // tangentiële direction (theta-hat)
        faradayLoopArrows.add(new AxialSymmetricBody({
            position: new Vec3(loopRadius * Math.cos(theta), loopRadius * Math.sin(theta), z + 0.5),
            axis: tangent.clone().multiplyScalar(0.25), // lengte van pijl
            radius: 0.01
        }));
    }

    faradayLoops.add(new AxialSymmetricBody({
        position: new Vec3(0, 0, z + .5),
        axis: new Vec3(0, 0, 1),
        radius: .5
    }));
}

const charges = new ModelObjectsCollection();
for (let i = 0; i < numCharges; i++)
    charges.add(new RadialSymmetricBody({ position: new Vec3(0, 0, i), radius: 0.055 }));

const magneticVectors = new ModelObjectsCollection();
for (const position of magneticFieldPositions)
    magneticVectors.add(new AxialSymmetricBody({ position }));

const faradayRings = ViewsCollection.of(Ring).with({ color: Colour.Green, thickness: 3e-2 });
const faradayArrows = ViewsCollection.of(Arrow).with({
    color: Colour.Green,
    size: 0.05,
    round: true
});
Simulation
    .with({
        htmlDivId: 'faradayLawContainer',
        camera: { position: new Vec3(3, 1, 4), fieldOfView: 45 },
        viewport: { aspectRatio: '19/12' }
    })
    .withMouseClickEventListener()
    .bind(wire.onceWith(new Cylinder({ color: Colour.Yellow })))
    .bind(charges.alwaysWith(ViewsCollection.of(Sphere).with({ color: Colour.Orange })))
    .bind(magneticVectors.alwaysWith(ViewsCollection.of(Arrow).with({
        color: Colour.Red,
        size: 7.5e-2,
        round: true
    })))
    .bind(new FaradayField().onceWith(new ArrowField({
        xRange: new Range(-1, 1, 0.25),
        yRange: new Range(-1, 1, 0.25),
        zRange: new Range(-2, 2, 1),
        scaleFactor: .4,
        magnitudeMap: m => .4 * Math.log(1 + m) / Math.log(1 + dBdtMax / 0.25),
        colorMap: () => new Colour(0x0066ff),
        round: true
    })))
    .bind(faradayLoops.onceWith(faradayRings))
    .bind(faradayLoopArrows.onceWith(faradayArrows))
    .runsEvery(1e-3)
    .advancesBy(.01)
    .substeps(10)
    .onStep((clock, dt) => {
        const fieldLength = (clock.simulatedTime % 20) / 25 + 0.001;
        magneticVectors.forEach(vector => vector.axis.set(0, 0, fieldLength));
        charges.forEach((charge, index) =>
            charge.position.z = zStart + ((index + (clock.simulatedTime % 20) / 25) % numCharges));
    })
    .append(new Checkbox('Show Faraday loop: ')
        .checked(true)
        .onChange(checked => {
            faradayRings.visible = checked;
            faradayArrows.visible = checked;
        })
    );

