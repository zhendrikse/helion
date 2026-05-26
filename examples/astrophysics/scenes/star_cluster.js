import { Color, Vector3 } from "three";
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {
    ThreeJsRenderOptions, ThreeJsRenderer, Canvas, HtmlDiv, Simulation, Vec3,
    PointCloud, PointCloudView, PointCloudMaterial
} from "helion";

class StarCluster extends PointCloud {
    constructor(N=40000) {
        super({});

        const perlin = new ImprovedNoise();

        while (this._positions.length < N) {
            const star = this.createStar(perlin);

            if (!star)
                continue;

            this._positions.push(star.position);
            this._colors.push(star.color);
            this._sizes.push(7.5E-2);
        }
    }

    createStar(perlin) {
        const pos = new Vector3()
            .randomDirection()
            .setLength(5 * Math.pow(Math.random(), 1 / 3));

        pos.x *= 1 + 0.4 * Math.sin(3 * pos.y) + 0.4 * Math.sin(2 * pos.z);
        pos.y *= 1 + 0.4 * Math.sin(3 * pos.z) + 0.4 * Math.sin(2 * pos.x);
        pos.z *= 1 + 0.4 * Math.sin(3 * pos.x) + 0.4 * Math.sin(2 * pos.y);

        const noise =
            perlin.noise(pos.x, pos.y, pos.z) +
            perlin.noise(pos.y, pos.z, pos.x) +
            perlin.noise(pos.z, pos.x, pos.y);

        if (noise < 0.5)
            return null;

        const color = new Color().setHSL(
            0.5 + 0.15 * Math.random(),
            0.5 + 0.5 * Math.random(),
            Math.random()
        );

        return { position: pos, color };
    }
}

const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(7, 14, 21),
    background: ThreeJsRenderer.Background.STARS,
    fov: 35,
    light: false
});
const canvas = Canvas.withElementId("starClusterCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("starClusterCanvasWrapper").contains(canvas))
    .with(threeJsRendererOptions);

const starCluster = new StarCluster();
const cloud = new PointCloudView({ material: PointCloudMaterial.stars() });
renderer.synchronize(starCluster.onceWith(cloud));

Simulation
    .with(renderer)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => {cloud.rotation.y += 2.5e-3})
    .start();