import {
    BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshPhongMaterial,
    TextureLoader, Group, SphereGeometry, Vector3
} from "three";
import saturnRingsUrl from '../../../textures/planets/saturnringcolor.jpg';
import saturnMap from '../../../textures/planets/saturnmap.jpg';
import { Renderable3D } from "../../renderer.js";

//
// Port to new Three.js from https://github.com/jeromeetienne/threex.planets/blob/master/threex.planets.js
//
const PlanetRingGeometry = function (innerRadius, outerRadius, thetaSegments) {
    innerRadius = innerRadius || 0;
    outerRadius = outerRadius || 1;
    thetaSegments = Math.max(3, Math.floor(thetaSegments || 8));

    // number of vertices = 4 per segment
    const vertexCount = thetaSegments * 4;
    const positionArray = new Float32Array(vertexCount * 3);
    const normalArray = new Float32Array(vertexCount * 3);
    const uvArray = new Float32Array(vertexCount * 2);
    const indexArray = new Uint16Array(thetaSegments * 6);

    let pPos = 0, pNorm = 0, pUV = 0, pIdx = 0;
    let vertexIndex = 0;

    for (let i = 0; i < thetaSegments; i++) {

        const angleLo = (i / thetaSegments) * Math.PI * 2;
        const angleHi = ((i + 1) / thetaSegments) * Math.PI * 2;

        // calculate positions
        const x1 = Math.cos(angleLo), y1 = Math.sin(angleLo);
        const x2 = Math.cos(angleHi), y2 = Math.sin(angleHi);

        // 4 vertices per ring segment
        const positions = [
            innerRadius * x1, innerRadius * y1, 0,
            outerRadius * x1, outerRadius * y1, 0,
            innerRadius * x2, innerRadius * y2, 0,
            outerRadius * x2, outerRadius * y2, 0,
        ];

        // normals (all Z = +1)
        const normals = [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ];

        // UVs as in original code
        const uvs = [
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ];

        // Fill buffers
        for (let j = 0; j < 4; j++) {
            positionArray[pPos++] = positions[j * 3 + 0];
            positionArray[pPos++] = positions[j * 3 + 1];
            positionArray[pPos++] = positions[j * 3 + 2];

            normalArray[pNorm++] = normals[j * 3 + 0];
            normalArray[pNorm++] = normals[j * 3 + 1];
            normalArray[pNorm++] = normals[j * 3 + 2];

            uvArray[pUV++] = uvs[j * 2 + 0];
            uvArray[pUV++] = uvs[j * 2 + 1];
        }

        // indices (2 triangles)
        indexArray[pIdx++] = vertexIndex + 0;
        indexArray[pIdx++] = vertexIndex + 1;
        indexArray[pIdx++] = vertexIndex + 2;

        indexArray[pIdx++] = vertexIndex + 2;
        indexArray[pIdx++] = vertexIndex + 1;
        indexArray[pIdx++] = vertexIndex + 3;

        vertexIndex += 4;
    }

    // Create geometry
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positionArray, 3));
    geometry.setAttribute('normal', new BufferAttribute(normalArray, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvArray, 2));
    geometry.setIndex(new BufferAttribute(indexArray, 1));
    geometry.computeBoundingSphere();

    return geometry;
};

export class Saturn extends Renderable3D {
    static loader = new TextureLoader();
    static material = new MeshPhongMaterial({
        map: Saturn.loader.load(saturnMap),
        bumpMap: Saturn.loader.load(saturnMap),
        bumpScale: 0.05,
        shininess: 0
    });

    constructor() {
        super();
        const geometry = new SphereGeometry(1, 64, 64);
        this._mesh = new Mesh(geometry, Saturn.material);
        this.add(this._mesh);
        this._mesh.castShadow = true;
        this._mesh.receiveShadow = false;
    }

    canBindTo(body) {
        return body.position && body.radius && body.tilt;
    }

    initialize(body) {
        // Set the axis of rotation (Y-axis) equal to the tilt
        this.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), body.tilt);

        const innerRingRadius = 1.11;
        const outerRingRadius = 2.1;
        const ringMesh = this.#createRings(body.tilt, innerRingRadius, outerRingRadius);
        this.add(ringMesh);
    }

    #createRings(tilt, innerRadius, outerRadius) {
        const geometry = new PlanetRingGeometry(innerRadius, outerRadius, 128);
        const texture = Saturn.loader.load(saturnRingsUrl);
        const material = new MeshPhongMaterial({
            map: texture,
            side: DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        const rings = new Mesh(geometry, material);
        rings.rotation.x = Math.PI / 2; // Ring lies in XY plane → tilt to XZ
        this.rotation.z = tilt; // Axial tilt (set only once!)
        return rings;
    }

    synchronizeWith(model) {
        this.position.copy(model.position);
        this.scale.setScalar(model.radius);
    }
}