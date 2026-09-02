import {ArrowField, Simulation, VectorField, Range, Vec3} from "../../../src/index.js";


const VectorFields = Object.freeze({
    FIELD_1: "Vector field 1",
    FIELD_2: "Vector field 2"
});

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
        this.meta = "$$\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}$$";
    }

    sample(position, target) {
        target.copy(position);
    }
}

const vectorField1 = new VectorField1();
const vectorField2 = new VectorField2();
const arrowField = new ArrowField({
    xRange: new Range(-1, 0.8, .2),
    yRange: new Range(-1, 0.8, .1),
    zRange: new Range(-1, 0.8, .2),
    scaleFactor: .15,
});

Simulation.with({
        htmlDivId: "vectorFieldsContainer",
        camera: {
            position: new Vec3(10, 10, 10)
        }
    })
    .bind(vectorField1.alwaysWith(arrowField))
    .provideAxesAround(arrowField)
    .frameSceneOn(arrowField, {
        padding: 1.1,
        viewDirection: new Vec3(.5, 0.3, 1)
    })
    .setLatexTitle(vectorField1.meta)
