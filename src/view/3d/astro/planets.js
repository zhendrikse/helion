import { Renderable3D } from '../../renderer.js';
import {
    Mesh, MeshPhongMaterial, SphereGeometry, TextureLoader, Vector3, BufferAttribute, BufferGeometry, DoubleSide,
    CanvasTexture, Color
} from 'three';
import mercuryMap from '../../../textures/planets/mercurymap.jpg';
import mercuryBumpMap from '../../../textures/planets/mercurybump.jpg';
import venusMap from '../../../textures/planets/venusmap.jpg';
import venusBumpMap from '../../../textures/planets/venusbump.jpg';
import earthMap from '../../../textures/planets/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthBumpMap from '../../../textures/planets/earthbump1k.jpg';
import marsMap from '../../../textures/planets/marsmap.jpg';
import marsBumpMap from '../../../textures/planets/marsbump.jpg';
import jupiterMap from '../../../textures/planets/jupitermap.jpg';
import saturnRingsColorUrl from '../../../textures/planets/saturnringcolor.jpg';
import saturnRingsPatternUrl from '../../../textures/planets/saturnringpattern.gif';
import saturnMap from '../../../textures/planets/saturnmap.jpg';
import uranusMap from '../../../textures/planets/uranusmap.jpg';
import uranusRingsColorUrl from '../../../textures/planets/uranusringcolour.jpg';
import uranusRingsPatternUrl from '../../../textures/planets/uranusringtrans.gif';
import neptuneMap from '../../../textures/planets/neptunemap.jpg';

export class Planet extends Renderable3D {
    static loader = new TextureLoader();

    constructor(material) {
        super();
        const geometry = new SphereGeometry(1, 64, 64);
        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);
        this._mesh.castShadow = true;
        this._mesh.receiveShadow = false;
    }

    canBindTo(body) {
        if (body.position === undefined ||
            body.radius === undefined ||
            body.tilt === undefined ||
            body.rotation === undefined)
            throw new Error(`Missing essential planet data on ${body}`);
        return true;
    }

    initialize(body) {
        // Set the axis of rotation (Y-axis) equal to the tilt
        this.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), body.tilt);
    }

    synchronizeWith(model) {
        this.position.copy(model.position);
        this.scale.setScalar(model.radius);
        this._mesh.rotation.y = model.rotation;
    }
}

export class Mercury extends Planet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(mercuryMap),
            bumpMap: Planet.loader.load(mercuryBumpMap),
            bumpScale: 0.005,
            shininess: 0
        });
        super(material);
    }
}

export class Venus extends Planet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(venusMap),
            bumpMap: Planet.loader.load(venusBumpMap),
            bumpScale: 0.005,
            shininess: 0
        });
        super(material);
    }
}

export class Earth extends Planet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(earthMap),
            bumpMap: Planet.loader.load(earthBumpMap),
            bumpScale: 0.05,
            specular: new Color('grey'),
            shininess: 0
        });
        super(material);
    }
}

export class Mars extends Planet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(marsMap),
            bumpMap: Planet.loader.load(marsBumpMap),
            bumpScale: 0.05,
            shininess: 0
        });
        super(material);
    }
}

export class Jupiter extends Planet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(jupiterMap),
            bumpMap: Planet.loader.load(jupiterMap),
            bumpScale: 0.02,
            shininess: 0
        });
        super(material);
    }
}

export class Neptune extends Planet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(neptuneMap),
            bumpMap: Planet.loader.load(neptuneMap),
            bumpScale: 0.05,
            shininess: 0
        });
        super(material);
    }
}

//
// Port to new Three.js from https://github.com/jeromeetienne/threex.planets/blob/master/threex.planets.js
//
function createPlanetRingTexture(colorUrl, patternUrl, divisor) {
    return new Promise((resolve, reject) => {
        const colorImage = new Image();
        const patternImage = new Image();

        let loaded = 0;

        function onLoad() {
            loaded++;

            if (loaded !== 2)
                return;

            if (
                colorImage.width !== patternImage.width ||
                colorImage.height !== patternImage.height
            ) {
                reject(new Error('Ring textures have different dimensions'));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = colorImage.width;
            canvas.height = colorImage.height;

            const context = canvas.getContext('2d');
            context.drawImage(colorImage, 0, 0);

            const colorData = context.getImageData(
                0, 0, canvas.width, canvas.height
            );

            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = patternImage.width;
            patternCanvas.height = patternImage.height;

            const patternContext = patternCanvas.getContext('2d');
            patternContext.drawImage(patternImage, 0, 0);

            const patternData = patternContext.getImageData(
                0, 0, canvas.width, canvas.height
            );

            for (let i = 0; i < colorData.data.length; i += 4) {
                colorData.data[i + 3] =
                    255 - patternData.data[i] / divisor;
            }

            context.putImageData(colorData, 0, 0);

            const texture = new CanvasTexture(canvas);
            texture.needsUpdate = true;

            resolve(texture);
        }

        function onError() {
            reject(new Error('Could not load planet ring textures'));
        }

        colorImage.addEventListener('load', onLoad);
        patternImage.addEventListener('load', onLoad);

        colorImage.addEventListener('error', onError);
        patternImage.addEventListener('error', onError);

        colorImage.src = colorUrl;
        patternImage.src = patternUrl;
    });
}

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

export class RingsPlanet extends Planet {
    constructor(material, innerRadius, outerRadius, divisor, colorUrl, patternUrl) {
        super(material);
        this._innerRadius = innerRadius;
        this._outerRadius = outerRadius;
        this._divisor = divisor;
        this._colorUrl = colorUrl;
        this._patternUrl = patternUrl;
    }

    initialize(body) {
        // Set the axis of rotation (Y-axis) equal to the tilt
        this.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), body.tilt);

        this.#createRings();
    }

    async #createRings() {
        const geometry = new PlanetRingGeometry(
            this._innerRadius,
            this._outerRadius,
            128,
        );

        const texture = await createPlanetRingTexture(this._colorUrl, this._patternUrl, this._divisor);
        const material = new MeshPhongMaterial({
            map: texture,
            side: DoubleSide,
            transparent: true,
            opacity: 0.825
        });

        const rings = new Mesh(geometry, material);
        rings.rotation.x = Math.PI / 2;

        this.add(rings);
    }
}

export class Saturn extends RingsPlanet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(saturnMap),
            bumpMap: Planet.loader.load(saturnMap),
            bumpScale: 0.05,
            shininess: 0
        });

        super(material, 1.11, 2.1, 4, saturnRingsColorUrl, saturnRingsPatternUrl);
    }
}

export class Uranus extends RingsPlanet {
    constructor() {
        const material = new MeshPhongMaterial({
            map: Planet.loader.load(uranusMap),
            bumpMap: Planet.loader.load(uranusMap),
            bumpScale: 0.05,
            shininess: 0
        });

        super(material, 1.55, 2.05, 2, uranusRingsColorUrl, uranusRingsPatternUrl);    }
}
