import {BoxGeometry, Color, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import {Simulation, Vec3} from "../../../src/index.js";

const depth = 4;
const finalSize = 200;
const cubeCount = Math.pow(20, depth);

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.75, emissive: true });
const sponge = new InstancedMesh(geometry, material, cubeCount);

const dummy = new Object3D();
const instanceColor = new Color();
let instanceIndex = 0;
function draw(pos, size) {
    dummy.position.set(pos.x, pos.y, pos.z);
    dummy.scale.set(size, size, size);
    dummy.updateMatrix();
    sponge.setMatrixAt(instanceIndex, dummy.matrix);

    let hue = 0.175 + pos.y / 600;
    // HSV hue laten rondlopen tussen 0 en 1
    hue = ((hue % 1) + 1) % 1;

    instanceColor.setHSL(hue, 1.0, 0.5);
    sponge.setColorAt(instanceIndex, instanceColor);
    instanceIndex++;
}

function mengerSponge(pos, size, currentDepth) {
    if (currentDepth === 0) {
        draw(pos, size);
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
sponge.instanceMatrix.needsUpdate = true;
sponge.instanceColor.needsUpdate = true;

Simulation
    .with({
        htmlDivId: "mengerSpongeContainer",
        cameraPosition: new Vec3(180, 165, 205).multiplyScalar(1.3)
    })
    .addObject3D(sponge);