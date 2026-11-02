import {
    Colour, DiscreteComplexField, DropdownMenu, ProbabilityDensityView2D, Registry, Simulation, Vec3, Vec2
} from '../../../src/index.js';

const GRID_SIZE = 256;
const SAMPLE_COUNT = 50000;
const MAX_RADIUS = 10;
const TABLE_SIZE = 101;

const radius = new Float64Array(TABLE_SIZE);
const radialCdf = new Float64Array(TABLE_SIZE);
const angle = new Float64Array(TABLE_SIZE);
const angularCdf = new Float64Array(TABLE_SIZE);

const radialIndex = { value: 0 };
const angularIndex = { value: 0 };

const orbitals = {
    '1s': {
        color: new Colour(0xff3333),
        radial: r => 1 - (2 * r + 1) * Math.exp(-2 * r),
        angular: a => a / (2 * Math.PI)
    },
    '2s': {
        color: new Colour(0x33ff33),
        radial: r => 1 + (-0.5 * r ** 3 + 0.5 * r ** 2 - r - 1) * Math.exp(-r),
        angular: a => a / (2 * Math.PI)
    },
    '2p': {
        color: new Colour(0x3366ff),
        radial: r => 1 + (-(r ** 3) / 6 - 0.5 * r ** 2 - r - 1) * Math.exp(-r),
        angular: a => (0.5 * Math.sin(2 * a) + a) / (2 * Math.PI)
    },
    '2py': {
        color: new Colour(0xff9933),
        radial: r => 1 + (-(r ** 3) / 6 - 0.5 * r ** 2 - r - 1) * Math.exp(-r),
        angular: a => (a - 0.5 * Math.sin(2 * a)) / (2 * Math.PI)
    },
    '3s': {
        color: new Colour(0x33ffff),
        radialDensity: r => {
            const psi = (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3);
            return psi * psi * r;
        },
        angular: a => a / (2 * Math.PI)
    },
    '3p': {
        color: new Colour(0xff33ff),
        radialDensity: r => r ** 3 * (6 - r) ** 2 * Math.exp(-2 * r / 3),
        angular: a => (a + Math.sin(a) * Math.cos(a)) / (2 * Math.PI)
    },
    '3d': {
        color: new Colour(0xffff33),
        radialDensity: r => r ** 5 * Math.exp(-2 * r / 3),
        angular: a => (a + 0.25 * Math.sin(4 * a)) / (2 * Math.PI)
    },
    'sp': {
        color: new Colour(0x996633),
        radialDensity: r => {
            const psi = (2 - r) * Math.exp(-r / 2) + r * Math.exp(-r / 2);
            return psi * psi * r;
        },
        angular: a => (a + 0.6 * Math.sin(a)) / (2 * Math.PI)
    },
    'sp2': {
        color: new Colour(0x4d994d),
        radialDensity: r => {
            const psi = (2 - r) * Math.exp(-r / 2) + 0.7 * r * Math.exp(-r / 2);
            return psi * psi * r;
        },
        angular: a => (a + Math.sin(3 * a) / 3) / (2 * Math.PI)
    },
    'sp3': {
        color: new Colour(0x4d4d99),
        radialDensity: r => {
            const psi = (2 - r) * Math.exp(-r / 2) + 0.8 * r * Math.exp(-r / 2);
            return psi * psi * r;
        },
        angular: a => (a + 0.25 * Math.sin(4 * a)) / (2 * Math.PI)
    }
};

const orbitalRegistry = new Registry({
    label: '⚛️ Orbital ',
    entries: orbitals
});

function initializeTables(orbital) {
    const radialStep = MAX_RADIUS / (TABLE_SIZE - 1);
    const angularStep = 2 * Math.PI / (TABLE_SIZE - 1);

    for (let i = 0; i < TABLE_SIZE; i++) {
        radius[i] = radialStep * i;
        angle[i] = angularStep * i;
        radialCdf[i] = orbital.radial
            ? orbital.radial(radius[i])
            : (i === 0 ? 0 : radialCdf[i - 1]) + orbital.radialDensity(radius[i]);
        angularCdf[i] = orbital.angular(angle[i]);
    }

    if (orbital.radialDensity) {
        const normalization = radialCdf[TABLE_SIZE - 1];
        for (let i = 0; i < TABLE_SIZE; i++)
            radialCdf[i] /= normalization;
    }

    radialIndex.value = 0;
    angularIndex.value = 0;
}

function interpolate(value, cdf, coordinates, indexRef) {
    let index = indexRef.value;
    const maxIndex = cdf.length - 2;

    if (value >= cdf[index])
        while (index < maxIndex && value > cdf[index + 1])
            index++;
    else
        while (index > 0 && value < cdf[index])
            index--;

    indexRef.value = index;
    const fraction = (value - cdf[index]) / (cdf[index + 1] - cdf[index]);
    return coordinates[index] + fraction * (coordinates[index + 1] - coordinates[index]);
}

const probabilityField = new DiscreteComplexField({ nx: GRID_SIZE, ny: GRID_SIZE });

function generateCloud(orbitalName) {
    const orbital = orbitals[orbitalName];
    initializeTables(orbital);
    probabilityField.reset();

    const pos = new Vec2();
    for (let i = 0; i < SAMPLE_COUNT; i++) {
        const r = interpolate(Math.random(), radialCdf, radius, radialIndex);
        const a = interpolate(Math.random(), angularCdf, angle, angularIndex);
        pos.set(r * Math.cos(a) + MAX_RADIUS, r * Math.sin(a) + MAX_RADIUS)
        pos.multiplyScalar(1 / (2 * MAX_RADIUS) * GRID_SIZE);
        pos.set(Math.floor(pos.x), Math.floor(pos.y));

        if (pos.x >= 0 || pos.x < GRID_SIZE || pos.y >= 0 || pos.y < GRID_SIZE)
            probabilityField.real[probabilityField.index(pos.x, pos.y)]++;
    }

    // ProbabilityDensityView2D samples |psi|², so encode each histogram
    // count as an amplitude whose square equals that count.
    for (let i = 0; i < probabilityField.real.length; i++)
        probabilityField.real[i] = Math.sqrt(probabilityField.real[i]);

    probabilityCloud.color = orbital.color;
}

const probabilityCloud = new ProbabilityDensityView2D({
    pointCount: SAMPLE_COUNT,
    pointSize: 0.05,
    color: Colour.White,
});

generateCloud('2py');

Simulation
    .with({
        htmlDivId: 'hydrogenOrbitals2D',
        infoPanel: {
            text: '<strong>⚛️ Hydrogen-like orbitals</strong><br/>' +
                'A Monte-Carlo probability cloud for the radial and angular distributions ' +
                'of the selected orbital. Pan and zoom to explore the shape.'
        },
        viewport: { parameterMenuCollapsed: false },
        headUpDisplay: { enabled: false }
    })
    .bind(probabilityField.onceWith(probabilityCloud))
    .append(new DropdownMenu()
        .for(orbitalRegistry)
        .withValue('2py')
        .onChange(value => generateCloud(value))
    )
    .frameSceneOn(probabilityCloud, {
        padding: 0.5,
        viewDirection: new Vec3(0, 1, 0.001)
    });
