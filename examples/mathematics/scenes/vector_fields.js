import {ArrowField, Simulation, VectorField, Range, Vec3 } from "../../../src/index.js";

const X_RANGE = new Range(-.8, 0.8, .2);
const Y_RANGE = new Range(-.8, 0.8, .15);
const Z_RANGE = new Range(-.8, 0.8, .2);

class VectorField1 extends VectorField {
    constructor() {
        super();
        this.meta = "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix} =" +
            "\\begin{pmatrix} \\sin(\\pi x)\\cos(\\pi y)\\cos(\\pi z) \\\\ " +
            "-\\cos(\\pi  x)\\sin(\\pi y)\\cos(\\pi z) \\\\" +
            " (\\sqrt{(2 / 3)} \\cos(\\pi x)\\cos(\\pi y)\\sin(\\pi z)) \\end{pmatrix}";
    }

    sample(position, target) {
        const u = Math.sin(Math.PI * position.x) * Math.cos(Math.PI * position.y) * Math.cos(Math.PI * position.z);
        const v = -Math.cos(Math.PI * position.x) * Math.sin(Math.PI * position.y) * Math.cos(Math.PI * position.z);
        const w = Math.sqrt(2.0 / 3.0) * Math.cos(Math.PI * position.x) * Math.cos(Math.PI * position.y) * Math.sin(Math.PI * position.z);
        target.set(u, v, w);
    }
}

class VectorField2 extends VectorField {
    constructor() {
        super();
        this.meta = "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}";
    }

    sample(position, target) { target.copy(position); }
}

const animatedVectorField = new VectorField1({
    xRange: X_RANGE,
    yRange: Y_RANGE,
    zRange: Z_RANGE
});

const arrowField = new ArrowField({
    xRange: X_RANGE,
    yRange: Y_RANGE,
    zRange: Z_RANGE,
    magnitudeMap: _m => .15
});

const target = new Vec3();
Simulation
    .with({ htmlDivId: "vectorFieldsContainer" })
    .bind(animatedVectorField.alwaysWith(arrowField))
    .provideAxesAround(arrowField)
    .frameSceneOn(arrowField, {
        padding: 1.1,
        viewDirection: new Vec3(.5, 0.3, 1)
    })
    .setLatexTitle(animatedVectorField.meta)
    .runsEvery(1/30)
    .advancesBy(1/125)
    .onStep(((_, dt) => {
        for (const position of arrowField.positions) {
            animatedVectorField.sample(position, target);
            position.addScaledVector(target, dt);
        }
    }))
    .withMouseClickEventListener();
