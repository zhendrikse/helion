import { Color } from "three";
import {
    Segments, LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range, Label,
    VectorModel, ColorMappers, SegmentedCircle, LineSegmentView, Arrow2D, Vec2
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
            const line = new LineSegment(new Vec2(), new Vec2());
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
            line.from.set(0, 0);
            line.to.set(0, 0);

            if (k >= n)
                return;

            const angle = 2 * Math.PI * k / n;
            line.to.set(this._radius * Math.cos(angle), this._radius * Math.sin(angle), 0);
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
                line.from.set(0, 0);
                line.to.set(0, 0);
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
const xAxis = new LineSegment(new Vec2(0, 0), new Vec2(1.25, 0), 0xd0d0d0);
const yAxis = new LineSegment(new Vec2(0,  0), new Vec2(0, 1.25), 0xd0d0d0);

// Root vectors: the actual points z_k on the unit circle.
const rootVectors = [];
for (let i = 0; i < range; i++)
    rootVectors.push(new VectorModel(new Vec2(), new Vec2()));

const rootVectorViews = [];
for (let i = 0; i < rootVectors.length; i++)
    rootVectorViews.push(new Arrow2D({ size: 0.13, lineWidth: 4, headStyle: Arrow2D.HeadStyle.Filled }));

function updateRoots(simulation, n) {
    for (let k = 0; k < rootVectors.length; k++) {
        const vector = rootVectors[k];

        if (k >= n) {
            vector.axis.set(0, 0);
            continue;
        }

        const angle = 2 * Math.PI * k / n;
        vector.axis.set(unitCircleRadius * Math.cos(angle), unitCircleRadius * Math.sin(angle), 0);
        rootVectorViews[k].color = new Color().setHSL(0.92 - 0.65 * (angle + Math.PI) / (2 * Math.PI), 1, .5);
    }

    simulation.setLatexTitle(`z^{${n}}=1\\Rightarrow z_k=\\exp(\\dfrac{2\\pi ik}{${n}}),\\ k=0,\\cdots, ${n-1}`);
}

const simulation = Simulation
    .with({
        htmlDivId: "rootsOfUnityContainer",
        headUpDisplay: {
            enabled: false
        },
        parameterMenuCollapsed: false,
        camera: {
            position: new Vec3(0, 0, 3),
            controls: false
        },
    })
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
    .bind(xAxis.onceWith(new LineSegmentView({ lineWidth: 2 })))
    .bind(yAxis.onceWith(new LineSegmentView({ lineWidth: 2 })))
    .bind(xAxis.onceWith(new Label({
        text: () => "Re(z)",
        offset: () => new Vec2(0.55, 0.1),
        fontSize: "20px"
    })))
    .bind(xAxis.onceWith(new Label({
        text: () => "Im(z)",
        offset: () => new Vec2(-.46, 1.2),
        fontSize: "20px"
    })))
    .append(new Slider("n")
        .withRange(new Range(1, range, 1))
        .withValue(3)
        .onInput(event => {
            const n = Number(event.target.value);
            updateRoots(simulation, n);
            roots.update(n);
            polygon.update(n);
        })
    );

updateRoots(simulation, 3);
for (let i = 0; i < rootVectors.length; i++)
    simulation.bind(rootVectors[i].alwaysWith(rootVectorViews[i]));