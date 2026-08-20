import { MeshBasicMaterial } from "three";

import {
    Segments,
    LineSegment,
    LineSegmentsView,
    Simulation,
    Vec3,
    Slider,
    Range,
    Arrow,
    Label,
    Matrix2D,
    VectorModel,
    ColorMappers
} from "../../../src/index.js";

const size = 5;
const originalCircleRadius = 3;

/*
 * A symmetric matrix
 *
 *             [ a  b ]
 *     A =     [ b  d ]
 *
 * The spectral theorem states that:
 *
 *             A = Q Λ Qᵀ
 *
 * where Q is an orthogonal matrix whose columns are the
 * normalized eigenvectors of A, and Λ is the diagonal
 * matrix containing the eigenvalues.
 */
const transformation = new Matrix2D(
    2, 1,
    1, 2
);


/*
 * A circle represented by line segments.
 */
class Circle extends Segments {
    constructor({
        radius = originalCircleRadius,
        segments = 96,
        color = 0xffaa55
    } = {}) {
        super();

        this._color = color;
        this._points = [];

        for (let i = 0; i < segments; i++) {
            const t1 = 2 * Math.PI * i / segments;
            const t2 = 2 * Math.PI * (i + 1) / segments;

            this._points.push({
                from: new Vec3(radius * Math.cos(t1), radius * Math.sin(t1), 0),
                to: new Vec3(radius * Math.cos(t2), radius * Math.sin(t2), 0)
            });
        }

        this._points.forEach(segment => this.push(new LineSegment(segment.from.clone(), segment.to.clone(), color)));
    }

    apply(matrix) {
        this.clear();

        for (const segment of this._points) {
            const from = segment.from.clone();
            const to = segment.to.clone();

            matrix.applyTo(from);
            matrix.applyTo(to);

            this.push(new LineSegment(from, to, this._color));
        }

        return this;
    }
}

const circle = new Circle({
    radius: originalCircleRadius,
    segments: 128,
    color: 0xffaa55
});

const transformedCircle = new Circle({
    radius: originalCircleRadius,
    segments: 128,
    color: 0x44aaff
});

transformedCircle.apply(transformation);

// Eigenvectors.
// The vectors themselves are normalized. Their length in the
// visualization is determined by the corresponding eigenvalue.
const eigenvector1 = new VectorModel();
const eigenvector2 = new VectorModel();

const simulation = Simulation
    .with({
        htmlDivId: "spectralTheoremContainer",
        cameraPosition: new Vec3(0, 0, 4 * (size + 0.1)),
        parameterMenuCollapsed: false,
        controls: false
    });

function updateEigenVectors() {
    const eigenvectors = transformation.eigenvectors();

    // A real symmetric 2x2 matrix always has two real, orthogonal eigenvectors.
    if (eigenvectors.length === 2) {
        eigenvector1.axis
            .copy(eigenvectors[0].vector)
            .multiplyScalar(eigenvectors[0].value);

        eigenvector2.axis
            .copy(eigenvectors[1].vector)
            .multiplyScalar(eigenvectors[1].value);
    }
    else {
        eigenvector1.axis.set(0, 0, 0);
        eigenvector2.axis.set(0, 0, 0);
    }

    updateTitle(eigenvectors);
}


// Construct the live mathematical expression A = Q Λ Qᵀ showing the actual numerical matrices.
function updateTitle(eigenvectors) {
    if (eigenvectors.length !== 2)
        return;

    const [e1, e2] = eigenvectors;

    const a = transformation.a.toFixed(2);
    const b = transformation.b.toFixed(2);
    const d = transformation.d.toFixed(2);

    const q11 = e1.vector.x.toFixed(2);
    const q21 = e1.vector.y.toFixed(2);
    const q12 = e2.vector.x.toFixed(2);
    const q22 = e2.vector.y.toFixed(2);

    const lambda1 = e1.value.toFixed(2);
    const lambda2 = e2.value.toFixed(2);

    const latex =
        "\\underbrace{" +
        "\\begin{pmatrix}" +
        `${a} & ${b} \\\\` +
        `${b} & ${d}` +
        "\\end{pmatrix}" +
        "}_{A}" +

        " = " +

        "\\underbrace{" +
        "\\begin{pmatrix}" +
        `${q11} & ${q12} \\\\` +
        `${q21} & ${q22}` +
        "\\end{pmatrix}" +
        "}_{Q}" +

        "\\underbrace{" +
        "\\begin{pmatrix}" +
        `${lambda1} & 0 \\\\` +
        `0 & ${lambda2}` +
        "\\end{pmatrix}" +
        "}_{\\Lambda}" +

        "Q^T";

    simulation.setLatexTitle(latex);
}

// Labels for the eigenvectors.
// The label is placed along the eigenvector direction.
const labelEigenVector1 = new Label({
    text: () => "λ₁e₁",
    offset: model => model.axis.clone()
        .normalize()
        .multiplyScalar(originalCircleRadius - 0.3),
    fontSize: "24px",
    color: "#ff4444"
});

const labelEigenVector2 = new Label({
    text: () => "λ₂e₂",
    offset: model => model.axis.clone()
        .normalize()
        .multiplyScalar(originalCircleRadius - 0.3),
    fontSize: "24px",
    color: "#44dd88"
});

// Update everything that depends on the matrix.
function onMatrixModified(property, value) {
    transformation[property] = value;

    // A symmetric matrix has the same values at (1,2) and (2,1).
    if (property === "b")
        transformation.c = value;

    transformedCircle.apply(transformation);
    updateEigenVectors();
}

updateEigenVectors();

simulation
    .bind(circle.onceWith(new LineSegmentsView({
        lineWidth: 1.5,
        dashed: true,
        dashSize: 0.15,
        gapSize: 0.15,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0xffaa55 })
    })))
    .bind(transformedCircle.onceWith(new LineSegmentsView({
        lineWidth: 2,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0x44aaff })
    })))
    .bind(eigenvector1.onceWith(new Arrow({
        color: 0xff4444,
        size: 0.3,
        material: new MeshBasicMaterial(),
        magnitudeMap: magnitude => originalCircleRadius * magnitude
    })))
    .bind(eigenvector2.onceWith(new Arrow({
        color: 0x44dd88,
        size: 0.3,
        material: new MeshBasicMaterial(),
        magnitudeMap: magnitude => originalCircleRadius * magnitude
    })))
    .bind(eigenvector1.onceWith(labelEigenVector1))
    .bind(eigenvector2.onceWith(labelEigenVector2))
    .append(new Slider("a")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(2)
        .onInput(event => onMatrixModified("a", Number(event.target.value)))
    )
    .append(new Slider("b")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(1)
        .onInput(event => onMatrixModified("b", Number(event.target.value)))
    )
    .append(new Slider("d")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(2)
        .onInput(event => onMatrixModified("d", Number(event.target.value)))
    );
