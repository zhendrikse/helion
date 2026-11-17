import {
    Range, Segments, Vec3, SphereSegmentsView, RadialSymmetricBody, Simulation, Slider
} from '../../../src/index.js';

class Scalar extends RadialSymmetricBody {
    constructor(position, radius, value) {
        super({position, radius });
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

const sphereView = new SphereSegmentsView({
    opacity: 0.3,
    colorMapper: (scalar, index, color) => {
        const t = Math.log1p(scalar.value * 10);
        return color.setHSL(0.66 * (1 - t), 1, 0.5);
    }
});

Simulation
    .with({
        htmlDivId: 'scalarFieldContainer',
        camera: { position: new Vec3(6, 4, 10), target: new Vec3(0, -.5, 0) },
        lighting: { enabled: true },
        infoPanel: {
            text: '<strong>🌾 Scalar field</strong><br/>' +
                '• The colored spheres represent a scalar field (temperature field) on a regular 3D grid.<br/>' +
                '• The animation shows heat dissipation: thermal energy spreading from the core to its cooler surrounding.'
        }
    })
    .withMouseClickEventListener()
    .bind(field.alwaysWith(sphereView))
    .runsEvery(1/60)
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
    .provideAxesAround(sphereView, { tickLabels: false });

field.updateAt(0);