import {
    normalDistribution, uniform, randomInt, Vec3, Simulation, PointCloud,
    PointCloudMaterial, PointCloudView, ThreeJsScene, Colour
} from '../../../src/index.js';

class SpiralGalaxy extends PointCloud {
    // Set the radius of the galactic disc (scaling factor):
    static ScaleFactor = 350; // Use range of 200 - 700.
    static NumRimStars = 3000;
    static NumSpiralStars = 1000;
    static Density = 5;

    // Assign scale factor, rotation factor and fuzz factor for spiral arms.
    // Each arm is a pair: leading arm + trailing arm:
    static ArmsInfo = [[SpiralGalaxy.ScaleFactor, 2, 1.5], [SpiralGalaxy.ScaleFactor, 1.91, 1.5],
    [-SpiralGalaxy.ScaleFactor, 2, 1.5], [-SpiralGalaxy.ScaleFactor, -2.09, 1.5],
    [-SpiralGalaxy.ScaleFactor, 0.5, 1.5], [-SpiralGalaxy.ScaleFactor, 0.4, 1.5],
    [-SpiralGalaxy.ScaleFactor, -0.5, 1.5], [-SpiralGalaxy.ScaleFactor, -0.6, 1.5]];

    constructor() {
        super();
        const coreRadius = SpiralGalaxy.ScaleFactor / 15;

        const outerCore = SpiralGalaxy.createCoreStars(SpiralGalaxy.NumRimStars, coreRadius);
        const innerCore = SpiralGalaxy.createCoreStars(Math.trunc(SpiralGalaxy.NumRimStars / 4), coreRadius / 2.5);
        const innerHaze = SpiralGalaxy.haze(SpiralGalaxy.ScaleFactor, 2, 0.5, SpiralGalaxy.Density);
        const outerHaze = SpiralGalaxy.haze(SpiralGalaxy.ScaleFactor, 1, 0.3, SpiralGalaxy.Density);
        const [leadingArms, trailingArms] = SpiralGalaxy.buildSpiralArms(-0.3, SpiralGalaxy.ArmsInfo);

        this.add(outerCore, 1);
        this.add(innerCore, 1);
        this.add(leadingArms, 7);
        this.add(trailingArms, 3);
        this.add(innerHaze, 2);
        this.add(outerHaze, 2);
    }

    /**
     * @param {Vec3[]} starPositions
     * @param {number} starRadius
     */
    add(starPositions, starRadius) {
        for (let i = 0, n = starPositions.length; i < n; i++) {
            this._positions.push(starPositions[i]);
            this._colors.push(SpiralGalaxy.colorAt(starPositions[i]));
            this._sizes.push(starRadius);
        }
    }

    /** @param {Vec3} position */
    static colorAt(position) {
        const distance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        const t = Math.min(distance / SpiralGalaxy.ScaleFactor, 1.0); // 0 at center, 1 at border
        return new Colour().setHSL(0.65 - 0.5 * t, 1.0, 0.6); // from yellow (t=0) to blue (t=1)
    }

    static createCoreStars(numRimStars, coreRadius) {
        /** @type {Vec3[]} */
        const coreStars = [];
        for (let i = 0; i < numRimStars; i++)
            coreStars.push(new Vec3(
                normalDistribution(0, 1),
                normalDistribution(0, 1),
                normalDistribution(0, 1)).multiplyScalar(coreRadius));
        return coreStars;
    }

    /**
     * Return list of (x,y,z) points for a logarithmic spiral.
     *
     * @param {number} b constant for spiral direction and 'openess'
     * @param {number} rScale factor (galactic disc radius)
     * @param {number} rot_fac factor to rotate each spiral arm
     * @param {number} fuz_fac random shift in star position in arm, applied to 'fuzz' variable
     */
    static buildSpiralStars(b, rScale, rot_fac, fuz_fac) {
        const fuzz = Math.trunc(0.030 * Math.abs(rScale));  // Scalable initial amount to shift locations.
        /** @type {Vec3[]} */
        const spiral_stars = [];
        const SCALE = SpiralGalaxy.ScaleFactor;
        for (let i = 0; i < SpiralGalaxy.NumSpiralStars; i++) {
            const theta = i * Math.PI / 180;
            const x = rScale * Math.exp(b * theta) * Math.cos(theta - Math.PI * rot_fac) - randomInt(-fuzz, fuzz) * fuz_fac;
            const y = rScale * Math.exp(b * theta) * Math.sin(theta - Math.PI * rot_fac) - randomInt(-fuzz, fuzz) * fuz_fac;
            const z = uniform((-SCALE / (SCALE * 3)), (SCALE / (SCALE * 3)));
            spiral_stars.push(new Vec3(x, y, z));
        }
        return spiral_stars;
    }

    /**
     * Return lists of point coordinates for galactic spiral arms.
     *
     * @param {number} b = constant for spiral direction and 'openess'
     * @param {number[[]]} arms_info = list of scale, rotation, and fuzz factors
     */
    static buildSpiralArms(b, arms_info) {
        /** @type {Vec3[]} */
        let leading_arms = [];
        /** @type {Vec3[]} */
        let trailing_arms = [];
        for (let i = 0; i < arms_info.length; i++) {
            const arm = SpiralGalaxy.buildSpiralStars(b, arms_info[i][0], arms_info[i][1], arms_info[i][2]);
            if (i % 2 !== 0)
                leading_arms = leading_arms.concat(arm);
            else
                trailing_arms = trailing_arms.concat(arm);
        }
        return [leading_arms, trailing_arms];
    }

    /**
     * Generate uniform random (x,y,z) points within a disc for 2-D display.
     *
     * @param {number} scale_factor galactic disc radius
     * @param {number} r_mult scalar for radius of disc
     * @param {number} z_mult scalar for z values
     * @param {number} density multiplier to vary the number of stars posted
     */
    static haze(scale_factor, r_mult, z_mult, density) {
        /** @type {Vec3[]} */
        const haze_coordinates = [];
        for (let i = 0; i < scale_factor * density; i++) {
            const n = Math.random();
            const theta = uniform(0, 2 * Math.PI);
            const x = Math.round(Math.sqrt(n) * Math.cos(theta) * scale_factor) / r_mult;
            const y = Math.round(Math.sqrt(n) * Math.sin(theta) * scale_factor) / r_mult;
            const z = uniform(-1, 1) * z_mult;
            haze_coordinates.push(new Vec3(x, y, z));
        }
        return haze_coordinates;
    }
}

const spiralGalaxy = new SpiralGalaxy();
const pointCloud = new PointCloudView({ material: PointCloudMaterial.galaxy() });
Simulation
    .with({
        htmlDivId: 'galaxyContainer',
        viewport: { aspectRatio: '4/3' },
        headUpDisplay: { enabled: false },
        camera: {
            position: new Vec3(1, -12, 4).multiplyScalar(100),
            fieldOfView: 30
        },
        scene: { background: ThreeJsScene.Background.STARS },
        lighting: { enabled: false }
    })
    .runsEvery(0.02)
    .bind(spiralGalaxy.onceWith(pointCloud))
    .onStep(_ => pointCloud.rotation.z += 1e-3 )
    .start();
