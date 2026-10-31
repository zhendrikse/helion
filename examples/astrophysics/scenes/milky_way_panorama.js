import {
    LinearFilter,
    LinearMipmapLinearFilter,
    Mesh,
    PlaneGeometry,
    SRGBColorSpace,
    ShaderMaterial,
    TextureLoader,
    Vector2,
    Vector3
} from 'three';
import {Checkbox, Colour, ModelObject, Renderable3D, Simulation, ThreeJsScene} from '../../../src/index.js';
import vertexShader from './milky_way_vertex_shader.glsl?raw';
import fragmentShader from './milky_way_fragment_shader.glsl?raw';

class MilkyWayPanoramaModel extends ModelObject {
    constructor({width, height, texture}) {
        super();
        this._uniforms = {
            uResolution: {value: new Vector2(width, height)},
            uTranslate:  {value: new Vector2(width / 2, height / 2)},
            uScale:      {value: 500},
            uRotate:     {value: new Vector2(0, 0)},
            uImage:      {value: texture}
        };
    }

    get uniforms() {
        return this._uniforms;
    }
}

class MilkyWayPanoramaView extends Renderable3D {
    constructor({aspectRatio}) {
        super();
        this._geometry = new PlaneGeometry(aspectRatio, 1);
    }

    initialize(model) {
        const material = new ShaderMaterial({
            uniforms: model.uniforms,
            vertexShader,
            fragmentShader
        });

        this.add(new Mesh(this._geometry, material));
    }

    canBindTo(model) {
        return Boolean(model.uniforms);
    }
}

const simulation = Simulation.with({
    htmlDivId: 'milkyWayPanoramaContainer',
    viewport: {
        aspectRatio: '19 / 12'
    },
    camera: {
        position: new Vector3(0, 0, 0.9),
        fieldOfView: 60,
        controls: false
    },
    scene: {
        background: ThreeJsScene.Background.PLAIN,
        backgroundColor: Colour.Black
    }
});

const aspectRatio = simulation.width / simulation.height;
const panoramaTexture = new TextureLoader().load(
    new URL('./milky-way.jpg', import.meta.url).href
);
panoramaTexture.colorSpace = SRGBColorSpace;
panoramaTexture.magFilter = LinearFilter;
panoramaTexture.minFilter = LinearMipmapLinearFilter;
panoramaTexture.generateMipmaps = true;

const model = new MilkyWayPanoramaModel({
    width: simulation.width,
    height: simulation.height,
    texture: panoramaTexture
});
const view = new MilkyWayPanoramaView({aspectRatio});

let animate = true;

simulation
    .bind(model.alwaysWith(view))
    .maxOutCpu(clock => {
        if (!animate) {
            return;
        }

        const elapsedSeconds = clock.clockTime * 0.001;
        model.uniforms.uRotate.value.set(
            -0.06 * elapsedSeconds,
            0.024 * elapsedSeconds
        );
    }, 30)
    .append(new Checkbox('Animate ')
        .checked(true)
        .addEventListener('change', () => animate = !animate))
    .start();
