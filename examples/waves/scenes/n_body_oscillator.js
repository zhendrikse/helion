import { Vector2 } from "three";
import {
    RadialSymmetricBody, Vec3, Simulation, Sphere, Helix, Floor, Bond, SwitchableBondView, RadioGroup, RadioButton
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

//
// Physics model
//
function createBallsAndSprings(numBalls = 5, k = 300) {
    const balls = [];
    const bonds = [];

    for (let i = 0; i < numBalls; i++) {
        balls.push(new RadialSymmetricBody({
            position: new Vec3(i * 10 - 30, 3, 0),
            radius: 1,
            mass: 1.5
        }));
        if (i !== 0)
            bonds.push(Bond.between(balls[i - 1].and(balls[i]), k, 0.5));
    }

    return { balls, bonds };
}

function initialDisturbance(displacement = 5) {
    balls[0].position.add(new Vec3(displacement, 0, 0));
    bonds[0].synchronize();
}

const { balls, bonds } = createBallsAndSprings();
initialDisturbance(7);

const simulation = Simulation
    .with({
        htmlDivId: "oscillatorContainer",
        cameraPosition: new Vec3(17, 6, 17),
        shadowsEnabled: true,
        fieldOfView: 45,
        background: Simulation.Background.FOG,
        headUpDisplay: true,
        parameterMenuCollapsed: false
    })
    .withMouseClickEventListener()
    .runsEvery(1e-3)
    .addObject3D(new Floor({
        type: Floor.Type.WOOD_WICKER,
        planeSizeXy: new Vector2(200, 200),
        granularity: 5
    }))
    .setupGraphWith({
            dataDefinition: [
                { label: "t" },
                { label: "ball1", color: "blue" },
                { label: "ball2", color: "red" },
                { label: "ball3", color: "red" },
                { label: "ball4", color: "red" },
                { label: "ball5", color: "blue" },
            ],
            title: "Kinetic Energy vs Time",
            xLabel: "Time [s]",
            yLabel: "Displacement"
        }
    )
    .onStep((clock, dt) => {
        const damping = 0.2;

        for (let i = 0; i < balls.length - 1; i++) {
            const relativeVelocity = balls[i].velocity.clone().sub(balls[i + 1].velocity);
            const dampingForce = relativeVelocity
                .projectOnVector(bonds[i].axis.clone().normalize())
                .multiplyScalar(damping);
            const force = bonds[i].force.add(dampingForce);

            balls[i].apply(force.clone().negate(), dt);
            balls[i + 1].apply(force, dt);
            bonds[i].synchronize();
        }

        if (!simulation.isRunning)
            return;

        const plotData = [clock.clockTime];
        for (let i = 0; i < balls.length; i++)
            plotData.push(balls[i].position.x);
        simulation.plot(plotData);
    })
    .onReset(() => {
        initialDisturbance(7);
        const plotData = [0];
        for (let i = 0; i < balls.length; i++)
            plotData.push(balls[i].position.x);
        simulation.plot(plotData);
    });

// Attach spheres and helices to balls and springs
const bondViews = [];
for (let i = 0; i < balls.length; i++) {
    const color = i === 0 || i === balls.length - 1 ? 0x3333ff : 0xff0000;
    const sphere = new Sphere({ color, castShadow: true });
    simulation.bind(balls[i].alwaysWith(sphere));
    if (i === 0)
        continue;

    const bondView = new SwitchableBondView({
        thickness: 0.075,
        coils: 30,
        color: 0xffff4d,
        castShadow: true
    });
    simulation.bind(bonds[i - 1].alwaysWith(bondView));
    bondViews.push(bondView);
}

simulation.append(new RadioGroup(
    new RadioButton("Springs ")
        .checked(true)
        .addEventListener("change", event => {
            for (const bondView of bondViews)
                bondView.bondType = SwitchableBondView.Type.Spring;
    }),
    new RadioButton("Cylinders")
        .addEventListener("change", event => {
            for (const bondView of bondViews)
                bondView.bondType = SwitchableBondView.Type.Cylinder;
    })
))

