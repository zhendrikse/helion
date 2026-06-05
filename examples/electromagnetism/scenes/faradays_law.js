import { Color, Group } from "three";
import { VectorField, Range , Cylinder, ArrowField, Sphere, ThreeJsRenderer, 
    ThreeJsRenderOptions, Arrow, Ring, Canvas, EventController, HtmlControl, 
    HtmlDiv, Overlay, Simulation, AxialSymmetricBody, RadialSymmetricBody, Vec3
} from "../../../src/index.js";

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
        const r = Math.sqrt(position.x * position.x + position.y * position.y); // r = constant along z-dir!
        const thetaHat = new Vec3(-position.y / r, position.x / r, 0);
        target.copy(thetaHat.multiplyScalar(-dBdtMax / r));
    }
}

//
// Renderer en ArrowField view
//
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(3, 1, 4),
    fieldOfView: 45
});
const canvas= Canvas.withElementId("faradayLawCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv
        .withElementId("faradayLawCanvasWrapper")
        .containsBoth(canvas.and(Overlay.withElementId("faradayLawCanvasOverlay"))))
    .with(threeJsRendererOptions);

//
// Views that do not change in time: cylinder, Faraday loops and arrow field
//
const faradayLoopsGroup = new Group(); // Needed to toggle this group on and off via the GUI
faradayLoopsGroup.visible = false;
renderer.add(faradayLoopsGroup);

const dt = 0.05;
const simulation = Simulation
    .with(renderer)
    .synchronize(wire.onceWith(new Cylinder({color: new Color( "yellow" )})))
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => {
        const fieldLength = (simulatedTime % 20) / 25 + 0.001;

        for (const vec of magneticVectors)
            vec.axis.set(0, 0, fieldLength);

        for (const charge of charges)
            charge.position.z = zStart + ((charge.baseZ + simulatedTime * dt) % numCharges);
    }, 10);

function createFaradayLoops(faradayLoopsGroup) {
    for (const z of loopZs) {
        for (let i = 0; i < loopSegments; i++) {
            const theta = (i / loopSegments) * 2 * Math.PI;
            const tangent = new Vec3(-Math.sin(theta), Math.cos(theta), 0); // tangentiële direction (theta-hat)
            const body = new AxialSymmetricBody({
                position: new Vec3(loopRadius * Math.cos(theta), loopRadius * Math.sin(theta), z + 0.5),
                axis: tangent.clone().multiplyScalar(0.25), // lengte van pijl
                radius: 0.01
            });

            const arrow = new Arrow({
                color: new Color("green"),
                size: 0.05,
                round: true
            });
            simulation.synchronize(body.onceWith(arrow));
            faradayLoopsGroup.add(arrow);
        }

        const ring = new Ring({ color: new Color("green"), thickness: 3e-2 });
        simulation.synchronize(new AxialSymmetricBody({
            position: new Vec3(0, 0, z + .5),
            axis: new Vec3(0, 0, 1),
            radius: .5
        }).onceWith(ring));
        faradayLoopsGroup.add(ring);
    }
}
createFaradayLoops(faradayLoopsGroup);

simulation.synchronize(new FaradayField().onceWith(new ArrowField({
    xRange: new Range(-1, 1, 0.25),
    yRange: new Range(-1, 1, 0.25),
    zRange: new Range(-2, 2, 1),
    scaleFactor: .4,
    magnitudeMap: m => {
        const max = dBdtMax / 0.25;
        return Math.log(1 + m) / Math.log(1 + max);
    },
    colorMap: () => new Color(0x0066ff),
    round: true
})));

const charges = [];
for (let i = 0; i < numCharges; i++) {
    const charge = new RadialSymmetricBody({ position: new Vec3(0, 0, i), radius: 0.055 });
    charge.baseZ = i;
    charges.push(charge);
    simulation.synchronize(charge.alwaysWith(new Sphere({ color: new Color("yellow") })));
}

const magneticVectors = [];
for (const position of magneticFieldPositions) {
    const body = new AxialSymmetricBody({position});
    magneticVectors.push(body);
    simulation.synchronize(body.alwaysWith(new Arrow({
        color: new Color("red"),
        size: 7.5e-2,
        round: true
    })));
}

const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);
eventController.attach(HtmlControl
    .withElementId("faradayLoopButton")
    .forType("click")
    .to(faradayLoopsGroup)
    .withProperty("visible"));