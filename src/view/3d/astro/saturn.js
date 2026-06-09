import {
    Group, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshPhongMaterial, TextureLoader
} from "three";
import saturnRingsUrl from '../../../textures/planets/saturnringcolor.jpg';

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

export class Saturn extends Group {
    constructor() {
        super();
        // super(planetData, {
        //     bumpScale: 0.05,
        //     identicalBumpMap: true,
        // });
        this._body = null;
    }

    bind(body) {
        // Sanity checks
        if (!body.radius)
            throw new Error("Body does not have a radius, hence it cannot be attached to Saturn view.");
        if (!body.tilt)
            throw new Error("Body does not have a tilt, hence it cannot be attached to Saturn view.");

        this._body = body;
    }

    initialize() {
        const innerRingRadius = 1.11 * this._body.radius;
        const outerRingRadius = 2.1 * this._body.radius;
        const ringMesh = this.#createRings(innerRingRadius, outerRingRadius);
        this.add(ringMesh);
    }

    #createRings(innerRadius, outerRadius) {
        const geometry = new PlanetRingGeometry(innerRadius, outerRadius, 128);
        const texture = new TextureLoader().load(saturnRingsUrl);
        const material = new MeshPhongMaterial({
            map: texture,
            side: DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        const rings = new Mesh(geometry, material);
        rings.rotation.x = Math.PI / 2; // Ring lies in XY plane → tilt to XZ
        this.rotation.z = this._body.tilt; // Axial tilt (set only once!)
        return rings;
    }

    render() {
        
    }
}