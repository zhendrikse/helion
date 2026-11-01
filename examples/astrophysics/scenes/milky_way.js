import * as THREE from 'three';
import vertexShaderSource from './webgl/milky_way_vertex_shader.glsl?raw';
import fragmentShaderSource from './webgl/milky_way_fragment_shader.glsl?raw';
import { Vec3, Vec2, Simulation } from "../../../src/index.js";

const uniforms = {
    u_image: { value: null },
    u_translate: { value: new THREE.Vector2(0, 0) },
    u_scale: { value: 500.0 },
    u_rotate: { value: new THREE.Vector2(0, 0) }
};

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    depthTest: false,
    depthWrite: false
});
const plane = new THREE.Mesh(geometry, material);

const textureLoader = new THREE.TextureLoader();
textureLoader.load(
    new URL('../images/astrophysics/milky-way.jpg', import.meta.url).href,

    function(texture) {
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.colorSpace = THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        uniforms.u_image.value = texture;
    },
    undefined,
    function(error) {
        console.error('Could not load milky-way.jpg:', error);
    }
);

const rotation = new Vec2(0, 0);
const speed = new Vec2(-5e-4, 2.5e-4);

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
    })
    .addObject3D(plane)
    .runsEvery(1/60)
    .onStep(() => uniforms.u_rotate.value.add(speed))
    .onReset(() => rotation.set(0, 0))
    .withMouseClickEventListener();


uniforms.u_translate.value.set(simulation.width, simulation.height);
uniforms.u_scale.value = 500;
