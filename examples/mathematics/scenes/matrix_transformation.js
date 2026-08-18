import { MeshBasicMaterial } from "three";
import {
    LineSegmentsView, Simulation, Vec3, Slider, Range,
    Arrow, LabelView, Matrix2D, VectorModel, Grid, RadioGroup, SwitchableBondView
} from "../../../src/index.js";

const size = 5;

const transformation = new Matrix2D(
    2, 1,
    0, 1
);

const originalGrid = new Grid({ size: size, color: 0xffaa55 });
const transformedGrid = new Grid({ size: size, color: 0x44aaff });
transformedGrid.apply(transformation);

const originalVector = new VectorModel(new Vec3(), new Vec3(2, 1, 0));
const transformedVector = new VectorModel();
const eigenvector1 = new VectorModel();
const transformedEigenvector1 = new VectorModel();
const eigenvector2 = new VectorModel();
const transformedEigenvector2 = new VectorModel();

function updateVectors() {
    transformedVector.copy(originalVector.clone().apply(transformation));

    const eigenvectors = transformation.eigenvectors();
    if (eigenvectors.length === 0) // zero eigen vectors
        return;

    eigenvector1.axis.copy(eigenvectors[0].vector);
    transformedEigenvector1.axis.copy(eigenvectors[0].vector);
    transformedEigenvector1.apply(transformation);
    if (eigenvectors.length === 1) { // one eigen vector
        eigenvector2.copy(eigenvector1);
        transformedEigenvector2.copy(transformedEigenvector1);
    }

    if (eigenvectors.length === 2) { // two eigen vectors
        eigenvector2.axis.copy(eigenvectors[1].vector);
        transformedEigenvector2.axis.copy(eigenvectors[1].vector);
        transformedEigenvector2.apply(transformation);
    }
}
updateVectors();

const onMatrixModified = (property, value) => {
    transformation[property] = value;
    transformedGrid.apply(transformation);
    updateVectors();
}

const labelEigenVector1 = new LabelView({
    text: () => "e₁",
    offset: model => model.axis.clone().multiplyScalar(3.5).add(new Vec3(0, -0.25, 0)),
    fontSize: "25px",
    color: "#ff4444"
});

const labelEigenVector2 = new LabelView({
    text: () => "e₂",
    offset: model => model.axis.clone().multiplyScalar(3.5).add(new Vec3(0, 0.25, 0)),
    fontSize: "25px",
    color: "#44dd88"
});

const labelOriginalVector = new LabelView({
    text: () => "v₁",
    offset: model => model.axis.clone().multiplyScalar(1.2),
    fontSize: "25px",
    color: "#ffffff"
});

const labelTransformedVector = new LabelView({
    text: () => "v₂=Av₁",
    offset: model => model.axis.clone().multiplyScalar(1.2),
    fontSize: "20px",
    color: "#44aaff"
});

const labelTransformedEigenVector1 = new LabelView({
    text: () => "Ae₁",
    offset: model => model.axis.clone().multiplyScalar(3.25).add(new Vec3(0, -0.25, 0)),
    fontSize: "20px",
    color: "#ff0000"
});

const labelTransformedEigenVector2 = new LabelView({
    text: () => "Ae₂",
    offset: model => model.axis.clone().multiplyScalar(3.25).add(new Vec3(0, 0.25, 0)),
    fontSize: "20px",
    color: "#00ff00"
});

function disableLabels() {
    labelOriginalVector.visible = false;
    labelTransformedVector.visible = false;
    labelEigenVector1.visible = false;
    labelEigenVector2.visible = false;
    labelTransformedEigenVector2.visible = false;
    labelTransformedEigenVector1.visible = false;
}
disableLabels();

Simulation
    .with({
        htmlDivId: "matrixTransformationContainer",
        cameraPosition: new Vec3(0, 0, 4 * (size + 0.1)),
        parameterMenuCollapsed: false
    })
    .bind(originalGrid.onceWith(new LineSegmentsView({ lineWidth: 1.25 })))
    .bind(transformedGrid.onceWith(new LineSegmentsView({ lineWidth: 1 })))
    .bind(originalVector.onceWith(new Arrow({
        color: 0xffffff,
        size: 0.4,
        material: new MeshBasicMaterial()
    })))
    .bind(transformedVector.onceWith(new Arrow({
        color: 0x44aaff,
        size: 0.2,
        material: new MeshBasicMaterial()
    })))
    .bind(eigenvector1.onceWith(new Arrow({
        color: 0xff4444,
        size: 0.4,
        material: new MeshBasicMaterial(),
        magnitudeMap: magnitude => 3 * magnitude
    })))
    .bind(eigenvector2.onceWith(new Arrow({
        color: 0x44dd88,
        size: 0.4,
        material: new MeshBasicMaterial(),
        magnitudeMap: magnitude => 3 * magnitude
    })))
    .bind(transformedEigenvector1.onceWith(new Arrow({
        color: 0xff0000,
        size: 0.2,
        material: new MeshBasicMaterial(),
        magnitudeMap: magnitude => 3 * magnitude
    })))
    .bind(transformedEigenvector2.onceWith(new Arrow({
        color: 0x00ff00,
        size: 0.2,
        material: new MeshBasicMaterial(),
        magnitudeMap: magnitude => 3 * magnitude
    })))
    .bind(originalVector.onceWith(labelOriginalVector))
    .bind(transformedVector.onceWith(labelTransformedVector))
    .bind(eigenvector1.onceWith(labelEigenVector1))
    .bind(eigenvector2.onceWith(labelEigenVector2))
    .bind(transformedEigenvector1.onceWith(labelTransformedEigenVector1))
    .bind(transformedEigenvector2.onceWith(labelTransformedEigenVector2))
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
    .append(new Slider("c")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(0)
        .onInput(event => onMatrixModified("c", Number(event.target.value)))
    )
    .append(new Slider("d")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(1)
        .onInput(event => onMatrixModified("d", Number(event.target.value)))
    )
    .append(new RadioGroup()
        .add("None", () => disableLabels())
        .add("Vectors", () => {
            disableLabels();
            labelOriginalVector.visible = true;
            labelEigenVector1.visible = true;
            labelEigenVector2.visible = true;
        })
        .add("Transformed vectors", () => {
            disableLabels();
            labelTransformedVector.visible = true;
            labelTransformedEigenVector2.visible = true;
            labelTransformedEigenVector1.visible = true;
        })
        .add("All", () => {
            labelOriginalVector.visible = true;
            labelTransformedVector.visible = true;
            labelEigenVector1.visible = true;
            labelEigenVector2.visible = true;
            labelTransformedEigenVector2.visible = true;
            labelTransformedEigenVector1.visible = true;
        })
        .checked(0)
    );