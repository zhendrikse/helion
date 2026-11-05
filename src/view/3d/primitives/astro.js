import { Renderable3D } from '../../renderer.js';
import {
    Mesh, MeshPhongMaterial, SphereGeometry, TextureLoader, Vector3, BufferAttribute, BufferGeometry,
    DoubleSide, CanvasTexture, Color, ShaderMaterial, AdditiveBlending, BackSide
} from 'three';
import fresnelFragmentShader from "./shaders/fresnel_fragment_shader.glsl?raw";
import fresnelVertexShader from "./shaders/fresnel_vertex_shader.glsl?raw";
import sunFragmentShader from "./shaders/sun_fragment_shader.glsl?raw";
import sunVertexShader from "./shaders/sun_vertex_shader.glsl?raw";
import {Vec3} from "../../../model/math/objects.js";

export class Planet extends Renderable3D {
    static loader = new TextureLoader();

    constructor({
        material,
        translation = new Vec3()
    }) {
        super();
        this._translation = translation;
        const geometry = new SphereGeometry(1, 64, 64);
        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);
    }

    set translation(translation) { this._translation.set(-translation.x, -translation.y, -translation.z); }

    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, time: number, spin: number}} body */
    canBindTo(body) {
        if (body.position === undefined || body.radius === undefined ||
            body.tilt === undefined || body.spin === undefined || body.time === undefined)
            throw new Error(`Missing essential planet data on ${body}`);
        return true;
    }

    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, time: number, spin: number}} body */
    initialize(body) {
        // Set the axis of rotation (Y-axis) equal to the tilt
        this.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), body.tilt);
        this._mesh.castShadow = false;
        this._mesh.receiveShadow = true;
    }

    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, time: number, spin: number}} body */
    synchronizeWith(body) {
        this.position.copy(body.position).add(this._translation);
        this.scale.setScalar(body.radius);
        this._mesh.rotation.y = body.time * body.spin;
    }
}

export class Sattelite extends Planet {
    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, planet: CelestialBody}} body */
    canBindTo(body) {
        console.log(body);
        if (body.planet === undefined)
            throw new Error('Moon needs a planet to belong to');
        return super.canBindTo(body);
    }

    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, planet: CelestialBody}} body */
    initialize(body) {
        super.initialize(body);
        this._mesh.castShadow = true;
        this._mesh.receiveShadow = false;
    }

    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, planet: CelestialBody}} model */
    synchronizeWith(model) {
        super.synchronizeWith(model);
        if (model.planet.lock)
            this.lookAt(model.planet.position);
    }
}

/**
 * Original code by Sangil Lee:
 *    https://sangillee.com/2024-06-29-create-realistic-sun-with-shaders/
 */
class SurfaceMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader
        });
    }
}

class FresnelMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            vertexShader: fresnelVertexShader,
            fragmentShader: fresnelFragmentShader
        });
    }
}

class GlowMaterial {
    constructor(uniforms) {
        this.uniforms = uniforms;
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            side: BackSide,
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormalView;

                void main(){
                    vPosition = normalize( vec3(modelViewMatrix * vec4(position, 1.)) );
                    vNormalView = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
                }
                `,

            fragmentShader: `
                uniform vec3 uColor;
                varying vec3 vPosition;
                varying vec3 vNormalView;

                void main(){
                    float rawIntensity = max( dot(vPosition, vNormalView), 0.0 );
                    float intensity = pow(rawIntensity, 4.0);
                    gl_FragColor = vec4(uColor, intensity);
                }
                `
        });
    }
}

export class SunView extends Renderable3D {
    constructor({
        color = new Color("#ffcc66"),
        speed = 2
    } = {}) {
        super();
        this._speed = speed * 0.001;
        this.uniforms = {
            uTime: { value: 0 },
            uColor: { value: color }
        };

        const geometry = new SphereGeometry(1, 128, 128);
        const surface = new Mesh(geometry, new SurfaceMaterial(this.uniforms).material);
        const fresnel = new Mesh(geometry, new FresnelMaterial(this.uniforms).material);
        const glow = new Mesh(geometry, new GlowMaterial(this.uniforms).material);
        fresnel.scale.setScalar(1.02);
        glow.scale.setScalar(1.75);
        this.add(surface);
        this.add(fresnel);
        this.add(glow);
    }

    canBindTo(model) {
        return model.position && model.radius && model.time !== undefined;
    }

    synchronizeWith(body) {
        this.uniforms.uTime.value = body.time * this._speed;
        this.scale.setScalar(body.radius);
    }
}

//
// Port to new Three.js from https://github.com/jeromeetienne/threex.planets/blob/master/threex.planets.js
//
function createPlanetRingTexture(colorUrl, patternUrl, divisor) {
    return new Promise((resolve, reject) => {
        const colorImage = new Image();
        const patternImage = new Image();

        let loaded = 0
        function onLoad() {
            loaded++;

            if (loaded !== 2)
                return;

            if (colorImage.width !== patternImage.width || colorImage.height !== patternImage.height) {
                reject(new Error('Ring textures have different dimensions'));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = colorImage.width;
            canvas.height = colorImage.height;

            const context = canvas.getContext('2d');
            context.drawImage(colorImage, 0, 0);
            const colorData = context.getImageData(0, 0, canvas.width, canvas.height);

            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = patternImage.width;
            patternCanvas.height = patternImage.height;

            const patternContext = patternCanvas.getContext('2d');
            patternContext.drawImage(patternImage, 0, 0);
            const patternData = patternContext.getImageData(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < colorData.data.length; i += 4)
                colorData.data[i + 3] = 255 - patternData.data[i] / divisor;

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
    constructor({
        material,
        innerRadius,
        outerRadius,
        divisor,
        ringsColorUrl,
        ringsPatternUrl
    } = {}) {
        super({material});
        this._innerRadius = innerRadius;
        this._outerRadius = outerRadius;
        this._divisor = divisor;
        this._colorUrl = ringsColorUrl;
        this._patternUrl = ringsPatternUrl;
    }

    initialize(body) {
        // Set the axis of rotation (Y-axis) equal to the tilt
        this.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), body.tilt);
        this.#createRings();
    }

    async #createRings() {
        const geometry = new PlanetRingGeometry(this._innerRadius, this._outerRadius, 128);
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

