import { Integrators, RadialSymmetricBody, G, gravitationalForceBetween, Simulation, Canvas, Vec3,
    Overlay, HtmlDiv, EventController, Sphere, ThreeJsRenderOptions, ThreeJsRenderer, Trail
} from "helion";

//
// Physics model
//
const astronomical_unit = 1.49e11;
const mass = 1e30;

const radiusA = 0.1 * astronomical_unit;
const radiusB = radiusA / 0.8;
const velocityA = Math.sqrt(G * 0.8 * mass * radiusA) / (radiusA + radiusB);

const radius = 1.9e9;
const bodyA = new RadialSymmetricBody({
    position: new Vec3(radiusA, 0, 0),
    velocity: new Vec3(0, velocityA, 0),
    radius,
    mass
});

const bodyB = new RadialSymmetricBody({
    position: new Vec3(-radiusB, 0, 0),
    velocity: new Vec3(0, -velocityA / 0.8, 0),
    radius,
    mass: mass * 0.8
});

const bodyC = new RadialSymmetricBody({
    position: new Vec3(0, 0, radiusA),
    velocity: new Vec3(0, 0, 0),
    radius,
    mass: mass * 0.5
});

function updateForces(dt) {
    const force_BA = gravitationalForceBetween(bodyA.and(bodyB));
    const force_CB = gravitationalForceBetween(bodyB.and(bodyC));
    const force_AC = gravitationalForceBetween(bodyC.and(bodyA));

    bodyA.apply(force_BA.clone().sub(force_AC), dt / subSteps, Integrators.symplecticEulerStep);
    bodyB.apply(force_CB.clone().sub(force_BA), dt / subSteps, Integrators.symplecticEulerStep);
    bodyC.apply(force_AC.clone().sub(force_CB), dt / subSteps, Integrators.symplecticEulerStep);
}

//
// Attach view models
//
const canvas = new Canvas("threeBodyCanvas");
const overlay = new Overlay("overlayText");
const canvasWrapper = HtmlDiv.withElementId("threeBodyWrapper").containsBoth(canvas.and(overlay));
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(30, 30, 30)
});

const renderer = ThreeJsRenderer
    .on(canvasWrapper)
    .with(threeJsRendererOptions);

renderer.synchronize(bodyA.alwaysWith(new Sphere({ color: "yellow" })));
renderer.synchronize(bodyA.alwaysWith(new Trail({ maxPoints: 500, color: "yellow" })));
renderer.synchronize(bodyB.alwaysWith(new Sphere({ color: "cyan" })));
renderer.synchronize(bodyB.alwaysWith(new Trail({ maxPoints: 500, color: "cyan" })));
renderer.synchronize(bodyC.alwaysWith(new Sphere({ color: "magenta" })));
renderer.synchronize(bodyC.alwaysWith(new Trail({ maxPoints: 500, color: "magenta"})));

const dt = 5000;
const subSteps = 50;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt / subSteps)
    .onScale(1e-9)
    .onClockTick((clockTime, simulatedTime) => updateForces(dt), subSteps);

//
// Event controller
//
const eventController = new EventController(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas); // Controller passes event on to simulation and renderers
