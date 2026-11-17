import {
    Range, Segments, ModelObject, Vec3, SphereSegmentsView,
    Simulation, Slider
} from '../../../src/index.js';

class Scalar extends ModelObject {
    constructor(position, radius, value) {
        super();
        this.position = position;
        this.radius = radius;
        this.value = value;
    }
}

class ScalarField extends Segments {
    constructor(range, func) {
        super();
        this._radius = range.stepSize * 0.25;

        for (const x of range)
            for (const y of range)
                for (const z of range) {
                    const position = new Vec3(x, y, z);
                    this.add(new Scalar(position, this._radius, func(position)));
                }
    }

    setRadius(radius) {
        this._radius = radius * 0.25;
        for (const scalar of this)
            scalar.radius = this._radius;
    }

    updateAt(time) {
        for (const scalar of this)
            scalar.value = temperatureAt(scalar.position, time + 0.05);
    }
}

const kappa = 0.3;

function temperatureAt(position, time) {
    const rSquared = position.lengthSq();
    const effectiveTime = Math.max(time, 0.01);
    const inverse = 1 / Math.sqrt(4 * Math.PI * kappa * effectiveTime);
    return inverse * Math.exp(-rSquared / (4 * kappa * effectiveTime));
}

const field = new ScalarField(
    new Range(-3, 3, 0.4),
    position => Math.exp(-0.3 * position.lengthSq())
);

const sphereView = new SphereSegmentsView({ opacity: 0.3 });

const simulation = Simulation
    .with({
        htmlDivId: 'scalarFieldContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: {
            orthographic: true,
            position: new Vec3(10, 10, 10),
            target: new Vec3(0, 0, 0)
        },
        lighting: { enabled: true },
        infoPanel: {
            text: '<strong>Scalar field</strong><br/>' +
                'The spheres show a scalar field on a regular 3D grid. Their color represents the local field value.'
        }
    })
    .bind(field.alwaysWith(sphereView))
    .onStep(clock => field.updateAt(clock.simulatedTime))
    .onReset(() => field.updateAt(0))
    .append(new Slider('Opacity')
        .withRange(new Range(0, 1, 0.01))
        .withValue(0.3)
        .onInput(value => sphereView.opacity = value))
    .append(new Slider('Radius')
        .withRange(new Range(0, 1, 0.01))
        .withValue(0.4)
        .onInput(value => field.setRadius(value)))
    .appendStartStopResetUI();

simulation.provideAxesAround(sphereView, {
    frame: true,
    annotations: true,
    xyPlane: true,
    xzPlane: true,
    yzPlane: true,
    axisLabels: ['x', 'y', 'z']
});
