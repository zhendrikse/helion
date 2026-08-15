import { MeshStandardMaterial } from "three";
import {Block, BlockSegments, BoxSegmentsView, Simulation, Vec3} from "../../../src/index.js";

const depth = 4;
const finalSize = 200;

const sponge = new BlockSegments();
function mengerSponge(pos, size, currentDepth) {
    if (currentDepth === 0) {
        sponge.push(new Block({position: pos, size: new Vec3(size, size, size)}));
        return;
    }

    const newSize = size / 3;
    for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
            for (let z = -1; z <= 1; z++)
                // Remove the cubes in the middle
                if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 1)
                    mengerSponge( new Vec3(x, y, z).multiplyScalar(newSize).add(pos), newSize, currentDepth - 1);
}

mengerSponge(new Vec3(), finalSize, depth);

Simulation
    .with({
        htmlDivId: "mengerSpongeContainer",
        cameraPosition: new Vec3(-180, 165, -200).multiplyScalar(2.1),
        fieldOfView: 30
    })
    .bind(sponge.onceWith(new BoxSegmentsView({
        material: new MeshStandardMaterial({
            roughness: 0.55,
            metalness: 0.75
        }),
        colorMapper: (segment, index, targetColor) => {
            let hue = 0.175 + segment.position.y / 600;
            targetColor.setHSL(hue % 1, 1.0, 0.5);
        }
    })));