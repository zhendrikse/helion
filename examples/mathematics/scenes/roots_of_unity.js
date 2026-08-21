import {
    Segments, LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range, Arrow, Label,
    VectorModel, ColorMappers, SegmentedCircle
} from "../../../src/index.js";

const range = 12;
const unitCircleRadius = 1;
const circleSegments = 128;

class Roots extends Segments {
    constructor({
        maxN = 12,
        radius = 1,
        initialRootCount = 3
    } = {}) {
        super();

        this._radius = radius;
        this._maxN = maxN;
        this._rootLines = [];

        // Create the maximum number of root vectors once.
        for (let k = 0; k < maxN; k++) {
            const line = new LineSegment(new Vec3(), new Vec3());
            this._rootLines.push(line);
            this.push(line);
        }

        this.update(initialRootCount);
    }

    update(rootCount) {}
}

// The n-th roots of unity: z_k = exp(2πik/n) = cos(2πk/n) + i sin(2πk/n)
class RootsOfUnity extends Roots {
    constructor({
        maxN = 12,
        radius = 1,
        initialRootCount = 3
    } = {}) {
        super({maxN, radius, initialRootCount});
    }

    update(n) {
        for (let k = 0; k < this._maxN; k++) {
            const line = this._rootLines[k];

            if (k < n) {
                const angle = 2 * Math.PI * k / n;
                line.from.set(0, 0, 0);
                line.to.set(this._radius * Math.cos(angle), this._radius * Math.sin(angle), 0);
            } else {
                // Hide unused root vectors.
                line.from.set(0, 0, 0);
                line.to.set(0, 0, 0);
            }
        }

        return this;
    }
}

class RootPolygon extends Roots {
    constructor({
        maxN = 12,
        radius = 1,
        initialRootCount = 3
    } = {}) {
        super({maxN, radius, initialRootCount});
    }

    update(n) {
        for (let k = 0; k < this._maxN; k++) {
            const line = this._rootLines[k];

            if (k < n && n >= 3) {
                const angle1 = 2 * Math.PI * k / n;
                const angle2 = 2 * Math.PI * ((k + 1) % n) / n;
                line.from.set(this._radius * Math.cos(angle1), this._radius * Math.sin(angle1), 0);
                line.to.set(this._radius * Math.cos(angle2), this._radius * Math.sin(angle2), 0);
            } else {
                line.from.set(0, 0, 0);
                line.to.set(0, 0, 0);
            }
        }

        return this;
    }
}

const unitCircle = new SegmentedCircle( {
    radius: unitCircleRadius,
    segments: circleSegments
});
const roots = new RootsOfUnity({ maxN: range, radius: unitCircleRadius });
const polygon = new RootPolygon({ maxN: range, radius: unitCircleRadius });

const simulation = Simulation
    .with({
        htmlDivId: "rootsOfUnityContainer",
        cameraPosition: new Vec3(0, 0, 2.5),
        parameterMenuCollapsed: false,
        controls: false
    });

// Root vectors: the actual points z_k on the unit circle.
const rootVectors = [];
for (let i = 0; i < range; i++)
    rootVectors.push(new VectorModel());

function updateRoots(n) {
    for (let k = 0; k < rootVectors.length; k++) {
        const vector = rootVectors[k];

        if (k >= n) {
            vector.axis.set(0, 0, 0);
            continue;
        }

        const angle = 2 * Math.PI * k / n;
        vector.axis.set(unitCircleRadius * Math.cos(angle), unitCircleRadius * Math.sin(angle), 0);
    }

    simulation.setLatexTitle(`z^{${n}}=1\\Rightarrow z_k=\\exp(\\dfrac{2\\pi ik}{${n}}),\\ k=0,\\cdots, ${n-1}`);
}

updateRoots(3);

for (let i = 0; i < rootVectors.length; i++) {
    const rootVector = rootVectors[i];
    simulation.bind(rootVector.onceWith(new Arrow({
        color: 0xff44aa,
        size: 0.1,
        colorMapper: ColorMappers.get(ColorMappers.Hue)
    })))
}

simulation
    .bind(unitCircle.onceWith(new LineSegmentsView({
        lineWidth: 3,
        dashed: true,
        dashSize: 0.1,
        gapSize: 0.1,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0xaaaaaa })
    })))
    .bind(polygon.onceWith(new LineSegmentsView({
        lineWidth: 2,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0xffff88 })
    })))
    .append(new Slider("n")
        .withRange(new Range(1, range, 1))
        .withValue(3)
        .onInput(event => {
            const n = Number(event.target.value);
            updateRoots(n);
            roots.update(n);
            polygon.update(n);
        })
    );
