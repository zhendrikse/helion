import {BlockSegments, BoxSegmentsView, Simulation, Vec3} from "../../../src/index.js";

const depth = 4;
const finalSize = 200;
const cubeCount = Math.pow(20, depth);

const segmentsView = new BoxSegmentsView(cubeCount);
const sponge = new BlockSegments();
function mengerSponge(pos, size, currentDepth) {
    if (currentDepth === 0) {
        sponge.push(pos, size);
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
        cameraPosition: new Vec3(180, 165, 205).multiplyScalar(1.3)
    })
    .bind(sponge.onceWith(segmentsView));