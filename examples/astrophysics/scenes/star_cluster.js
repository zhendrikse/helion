import { Group, Color, BufferAttribute,
    BufferGeometry, PointsMaterial, AdditiveBlending, Points, Vector3 } from "three";
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation} from "helion";

import { ThreeJsRenderer } from "../../../src/index.js";

class StarCluster extends Group {
    constructor(htmlCanvas, N=40000) {
        super();
        const positions = new BufferAttribute(new Float32Array(3 * N), 3),
            colors = new BufferAttribute(new Float32Array(3 * N), 3),
            perlin = new ImprovedNoise();

        let count = 0;
        while (count < N)
            if (this.starCreated(count, positions, colors, perlin))
                count++;

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', positions);
        geometry.setAttribute('color', colors);
        const material = new PointsMaterial({
            color: 'white',
            opacity: 0.5,
            vertexColors: true,
            size: 0.15,
            sizeAttenuation: true,
            transparent: true,
            blending: AdditiveBlending,
            depthTest: true,
        });
        const cloud = new Points(geometry, material);
        this.add(cloud);
    }

    starCreated(i, position, color, perlin) {
        const pos = new Vector3().randomDirection().setLength(5 * Math.pow(Math.random(), 1 / 3));
        pos.x = pos.x * (1 + 0.4 * Math.sin(3 * pos.y) + 0.4 * Math.sin(2 * pos.z));
        pos.y = pos.y * (1 + 0.4 * Math.sin(3 * pos.z) + 0.4 * Math.sin(2 * pos.x));
        pos.z = pos.z * (1 + 0.4 * Math.sin(3 * pos.x) + 0.4 * Math.sin(2 * pos.y));

        const noise = perlin.noise(pos.x, pos.y, pos.z) + perlin.noise(pos.y, pos.z, pos.x) + perlin.noise(pos.z, pos.x, pos.y);
        if (noise < 0.5)
            return false;

        const colour = new Color().setHSL(0.5 + 0.15 * Math.random(), 0.5 + 0.5 * Math.random(), Math.random());
        color.setXYZ(i, colour.r, colour.g, colour.b);
        position.setXYZ(i, pos.x, pos.y, pos.z);
        return true;
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
const starCluster = new StarCluster(canvas.htmlCanvas);
renderer.addObject3D(starCluster);

Simulation
    .with(renderer)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => {starCluster.rotation.y += 2.5e-3})
    .start();