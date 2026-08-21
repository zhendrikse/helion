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
    VectorModel,
    ColorMappers
} from "../../../src/index.js";


const size = 3;
const unitCircleRadius = 1;
const circleSegments = 128;


/*
 * Unit circle.
 */
class Circle extends Segments {
    constructor({
                    radius = 1,
                    segments = 128
                } = {}) {
        super();

        this._points = [];

        for (let i = 0; i < segments; i++) {
            const t1 = 2 * Math.PI * i / segments;
            const t2 = 2 * Math.PI * (i + 1) / segments;

            this._points.push({
                from: new Vec3(
                    radius * Math.cos(t1),
                    radius * Math.sin(t1),
                    0
                ),
                to: new Vec3(
                    radius * Math.cos(t2),
                    radius * Math.sin(t2),
                    0
                )
            });
        }

        for (const segment of this._points) {
            this.push(new LineSegment(
                segment.from.clone(),
                segment.to.clone(),
                0x888888
            ));
        }
    }
}


/*
 * The n-th roots of unity.
 *
 * z_k = exp(2πik/n)
 *     = cos(2πk/n) + i sin(2πk/n)
 */
class RootsOfUnity extends Segments {
    constructor({
                    n = 3,
                    radius = 1
                } = {}) {
        super();

        this._n = n;
        this._radius = radius;
        this._rootLines = [];

        this.update(n);
    }

    update(n) {
        this.clear();
        this._rootLines = [];

        this._n = n;

        for (let k = 0; k < n; k++) {
            const angle = 2 * Math.PI * k / n;

            const root = new Vec3(
                this._radius * Math.cos(angle),
                this._radius * Math.sin(angle),
                0
            );

            const line = new LineSegment(
                new Vec3(0, 0, 0),
                root,
                0x44aaff
            );

            this._rootLines.push(line);
            this.push(line);
        }

        return this;
    }
}


/*
 * Unit circle and roots.
 */
const unitCircle = new Circle({
    radius: unitCircleRadius,
    segments: circleSegments
});

const roots = new RootsOfUnity({
    n: 3,
    radius: unitCircleRadius
});


/*
 * Simulation.
 */
const simulation = Simulation
    .with({
        htmlDivId: "rootsOfUnityContainer",
        cameraPosition: new Vec3(0, 0, 5),
        parameterMenuCollapsed: false,
        controls: false
    });


/*
 * Root vectors.
 *
 * These are the actual points z_k on the unit circle.
 */
const rootVectors = [];


/*
 * Create six vector models up front.
 *
 * The slider only goes from 1 to 6, so this is enough.
 */
for (let i = 0; i < 6; i++)
    rootVectors.push(new VectorModel());


function updateRoots(n) {
    for (let k = 0; k < rootVectors.length; k++) {
        const vector = rootVectors[k];

        if (k >= n) {
            vector.axis.set(0, 0, 0);
            continue;
        }

        const angle = 2 * Math.PI * k / n;

        vector.axis.set(
            unitCircleRadius * Math.cos(angle),
            unitCircleRadius * Math.sin(angle),
            0
        );
    }

    simulation.setLatexTitle(
        `z^${n}=1`
    );
}


updateRoots(3);


/*
 * Add unit circle.
 */
simulation
    .bind(unitCircle.onceWith(new LineSegmentsView({
        lineWidth: 1.5,
        dashed: true,
        dashSize: 0.1,
        gapSize: 0.1,
        colorMapper: ColorMappers.get(
            ColorMappers.Uniform,
            { color: 0x888888 }
        )
    })))


    /*
     * Add root vectors.
     */
    .bind(rootVectors[0].onceWith(new Arrow({
        color: 0xff4444,
        size: 0.12,
        material: new MeshBasicMaterial()
    })))

    .bind(rootVectors[1].onceWith(new Arrow({
        color: 0xffaa44,
        size: 0.12,
        material: new MeshBasicMaterial()
    })))

    .bind(rootVectors[2].onceWith(new Arrow({
        color: 0x44dd88,
        size: 0.12,
        material: new MeshBasicMaterial()
    })))

    .bind(rootVectors[3].onceWith(new Arrow({
        color: 0x44aaff,
        size: 0.12,
        material: new MeshBasicMaterial()
    })))

    .bind(rootVectors[4].onceWith(new Arrow({
        color: 0xaa66ff,
        size: 0.12,
        material: new MeshBasicMaterial()
    })))

    .bind(rootVectors[5].onceWith(new Arrow({
        color: 0xff44aa,
        size: 0.12,
        material: new MeshBasicMaterial()
    })))


    /*
     * Slider for n.
     */
    .append(
        new Slider("n")
            .withRange(new Range(1, 6, 1))
            .withValue(3)
            .onInput(event => {
                const n = Number(event.target.value);

                roots.update(n);
                updateRoots(n);
            })
    );