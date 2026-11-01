import vertexShader from './webgl/black_hole_vertex_shader.glsl?raw';
import fragmentShader from './webgl/black_hole_fragment_shader.glsl?raw';
import {
    Vec3, Vec2, ModelObject, Checkbox, Colour, ShaderView, Simulation, ThreeJsScene, degToRad
} from '../../../src/index.js';

export class BlackHoleModel extends ModelObject {
    constructor({
        width = 160,
        height = 90,
        cameraPosition = new Vec3(0, 0, -8.5),
        blackHolePosition = new Vec3(0, 0, 0),
        rotation = new Vec3(degToRad(-4), 0, degToRad(-15))
    } = {}) {
        super();
        this.uniforms = {
            uResolution:   { value: new Vec2(width, height)},
            uTime:         { value: 0 },
            uCamPos:       { value: cameraPosition },
            uBlackHolePos: { value: blackHolePosition },
            uRotation:     { value: rotation},
        }
    }
}

const simulation = Simulation
    .with({
        htmlDivId: 'blackHoleRayTraceContainer',
        camera: {
            position: new Vec3(0, 0, .9),
            fieldOfView: 60
        },
        viewport: { aspectRatio: '16/9' },
        scene: {
            background: ThreeJsScene.Background.PLAIN,
            backgroundColor: Colour.Black
        }
    });

// const scene = new Scene();
//
//
// const camera = new PerspectiveCamera(75, aspectRatio, 0.1, 1000);
// camera.position.z = .8;
//
//
// const renderer = simulation._renderer; //new WebGLRenderer({antialias: true, canvas: simulation._viewport.canvas, alpha: false });
// console.log(renderer);
// // renderer.toneMapping = ACESFilmicToneMapping;
// // renderer.toneMappingExposure = 2.2;
// // renderer.outputColorSpace = SRGBColorSpace;
//
// // --- throttle pixel ratio ---
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
// renderer.setSize(width, height);
//
const aspectRatio = simulation.width / simulation.height;
const view = new ShaderView({ vertexShader, fragmentShader, aspectRatio });
const blackHoleModel = new BlackHoleModel({
    width: simulation.width,
    height: simulation.height
});

let animate = true;
simulation
    .bind(blackHoleModel.alwaysWith(view))
    .maxOutCpu(clock => {
        if (!animate) 
            return;
        blackHoleModel.uniforms.uTime.value= clock.clockTime * 0.001;
    }, 30)
    .append(new Checkbox('Animate ')
        .checked(true)
        .addEventListener('change', () => animate = !animate))
    .start();

// const downloadButton = document.createElement('button');
// downloadButton.textContent = 'Download image';
// document.body.appendChild(downloadButton);
//
// downloadButton.addEventListener('click', () => {
//     renderer.render(scene, camera); // laatste frame renderen
//     const link = document.createElement('a');
//     link.download = 'blackhole.png';
//     link.href = renderer.domElement.toDataURL('image/png');
//     link.click();
// });