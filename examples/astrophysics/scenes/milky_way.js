import vertexShader from './webgl/milky_way_vertex_shader.glsl?raw';
import fragmentShader from './webgl/milky_way_fragment_shader.glsl?raw';
import { Vec3, Vec2, Simulation, ModelObject, ShaderView, Slider, Range } from "../../../src/index.js";
import {
    ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, TextureLoader
} from "three";
import milkyWayUrl from '../../../docs/public/images/astrophysics/milky-way.jpg';

class MilkyWayPanoramaModel extends ModelObject {
    constructor({width, height, texture}) {
        super();
        this.uniforms = {
            u_translate:  {value: new Vec2(width, height)},
            u_scale:      {value: 500},
            u_rotate:     {value: new Vec2(0, 0)},
            u_image:      {value: texture}
        };
    }
}

const textureLoader = new TextureLoader();
const texture = textureLoader.load(
    milkyWayUrl,

    function(texture) {
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = true;
        texture.colorSpace = NoColorSpace;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = ClampToEdgeWrapping;
    },
    undefined,
    error => console.error('Could not load milky-way.jpg:', error)
);

const simulation = Simulation
    .with({
        htmlDivId: 'milkyWayPanoramaContainer',
        viewport: { aspectRatio: '2 / 1' },
        camera: {
            position: new Vec3(0, 0, 1),
            orthographic: true,
            controls: false
        },
        infoPanel: {
            text: '<strong>🌌 Milky way galaxy</strong><br/>This 360&#xb0; panorama of' +
                ' the Milky Way was created by the European Southern Observatory. The source image is' +
                ' in equirectangular coordinates, and is reprojected using the stereographic projection,' +
                ' simulating the view of the night sky from varying positions on Earth.'
        }
    });

const milkyWay = new MilkyWayPanoramaModel({
    width: simulation.width,
    height: simulation.height,
    texture: texture
})

const speed = new Vec2(-5e-4, 2.5e-4);
simulation
    .bind(milkyWay.onceWith(new ShaderView({ vertexShader, fragmentShader, aspectRatio: 2 })))
    .runsEvery(1/60)
    .onStep(() => milkyWay.uniforms.u_rotate.value.add(speed))
    .onReset(() => milkyWay.uniforms.u_rotate.value.set(0, 0))
    .append(new Slider("Zoom")
        .withRange(new Range(200, 1000, 1))
        .withValue(500)
        .onInput(value => milkyWay.uniforms.u_scale.value = value))
    .withMouseClickEventListener();
