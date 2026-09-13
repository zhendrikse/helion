import {
    Simulation, Vec3, Sun, SunView, RadialSymmetricBody, Sphere, Trail, Renderable3D,
    LineSegment, Label, ThreeJsScene, LineSegmentView, HexValueColorMapper,
} from "../../../src/index.js";

const randomColour = () => Math.floor(Math.random() * 65536 * 256);
const randomVelocity = () => new Vec3(-(0.7 + 0.5 * Math.random()), 0, 0);
let colour = 0xffffff;
/** @type {Renderable3D[]} */
let views = [];

// Default velocity gives a satisfactory range of eccentricities
// velocity = -vector(0.984,0,0)   # gives period of 12.0 "months"
class Planet extends RadialSymmetricBody {
    constructor() {
        const poss = new Vec3(0, 1, 0);
        super({
            position: poss,
            radius: 0.05,
            velocity: randomVelocity()
        });
        this._lastPosition = new Vec3().copy(poss);
        this._revolveStep = 0;
        this._finished = false;
    }

    reset() {
        super.reset();
        this._revolveTime = 0;
        this._revolveStep = 0;
        this._finished = false;
        this.state.velocity.copy(randomVelocity());
        this._lastPosition.copy(this.position);
    }

    /** 
     * @param {Simulation} simulation 
     * @param {number} time 
     * @param {LineSegment} line
     * @param {number} dt 
     * @param {number} offset 
     * @param {number} whole 
     */
    monthStep(simulation, line, time, dt, offset=.6, whole=1) {
        const labelText = whole === 1 ?
            // end of 'month', printing twice time gives about 12 'months' in 'year'
            String(Math.floor(time * 2 + dt)) :
            'Period: ' + 
                Number(time * 2).toFixed(3) + ' "months", initial speed: ' + 
                Math.round(this.speed).toFixed(3);

        // oldColour fix: label krijgt huidige colour (vorig maand), daarna pas nieuwe random (py:32)
        const oldColour = colour;
        let labelColour;
        if (whole === 1) {
            labelColour = oldColour;
            colour = randomColour();
        } else {
            colour = 0xffffff;
            labelColour = colour;
        }
        const label = new Label({
            text: () => labelText,
            offset: () => this.position.clone().multiplyScalar(offset),
            color: "#" + labelColour.toString(16).padStart(6, '0')
        });
        views.push(label);
        simulation.bind(line.onceWith(label));
    }

    /**
     * @param {number} time
     * @param {Simulation} simulation 
     * @param {number} dt 
     */
    revolveOnePeriod(simulation, time, dt) {
        if (this._finished) return;

        const steps = 20;
        this.update(dt);

        this._revolveStep += 1;
        const lineView = new LineSegmentView({ colorMapper: new HexValueColorMapper() });
        views.push(lineView);
        let line;
        if (this._revolveStep === steps) {
            this._revolveStep = 0;
            line = new LineSegment(new Vec3(), this.position.clone(), 0xffffff);
            this.monthStep(simulation, line, time, dt);
        } else
            line = new LineSegment(new Vec3(), this.position.clone(), colour); // plot radius vector

        simulation.bind(line.onceWith(lineView));

        // complete orbit: last.x >0 && pos.x <0 
        if (this._lastPosition.x > 0 && this.position.x < 0) {
            this.monthStep(simulation, line, time, dt, 50, 0);
            this._finished = true;
        }
    }

    /** @param {number} dt */
    update(dt) {
        this._lastPosition.copy(this.position)  // construction vector(planet.pos) makes oldpos a varible in its own right
        const denominator = this.position.length() ** 3;
        this.state.velocity.addScaledVector(this.position, -dt / denominator); // inverse square law; force points toward sun
        this.state.position.addScaledVector(this.velocity, dt);
    }
}

const planet = new Planet();
const sun = new Sun({ radius: 0.12 });
const simulation = Simulation
    .with({
        htmlDivId: "keplersLawContainer",
        camera: { position: new Vec3(0, -3, -1).multiplyScalar(1.5), fieldOfView: 38 },
        scene: { background: ThreeJsScene.Background.STARS },
        viewport: { aspectRatio: "19/12"}
    })
    .withMouseClickEventListener()
    .bind(sun.alwaysWith(new SunView()))
    .bind(planet.alwaysWith(new Sphere({ color: 0x00ffff })))
    .bind(planet.alwaysWith(new Trail({ color: 0xff4444, maxPoints: 600 })))
    .advancesBy(0.025)
    .runsEvery(0.02)
    .onReset(() => {
        views.forEach(view => {
            view.visible = false;
            view.dispose();
        });
        views = [];
        planet.reset();
        colour = randomColour();
    })
    .onStep((clock, dt) => planet.revolveOnePeriod(simulation, clock.simulatedTime, dt));

