import { PerspectiveCamera, WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace, MathUtils, PlaneGeometry,
    ShaderMaterial, Vector2, Vector3, Mesh, Scene }  from "three";
import vertexShader from "./black_hole_vertex_shader.glsl?raw";
import fragmentShader from "./black_hole_fragment_shader.glsl?raw";
import {Renderable3D, Simulation} from "../../../src/index.js";
import {MathPhysicsModelBehavior} from "../../../src/core/helion.js";

const containerDiv = document.getElementById("blackHoleRayTraceContainer");



const container = containerDiv;
container.classList.add('helionContainer');
container.style.position = "relative";
container.style.width = "100%";
container.style.margin = "auto";
if (container.style.aspectRatio === "")
    container.style.aspectRatio  = "1/1";

const canvasWrapperDiv = document.createElement("div");
canvasWrapperDiv.classList.add("helionCanvasWrapper");
canvasWrapperDiv.style.position = "relative";
canvasWrapperDiv.style.display = "block";
canvasWrapperDiv.style.backgroundColor = "transparent";
canvasWrapperDiv.style.width = "100%";
canvasWrapperDiv.style.height = "100%";
container.appendChild(canvasWrapperDiv);

const canvas = document.createElement('canvas');
canvas.classList.add("helionCanvas");
canvas.style.display = "block";
canvas.style.backgroundColor = "transparent";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvasWrapperDiv.appendChild(canvas);





const scene = new Scene();

const width = canvas.clientWidth;
const height = canvas.clientHeight;
const aspectRatio = width / height;

const camera = new PerspectiveCamera(75, aspectRatio, 0.1, 1000);
camera.position.z = .8;

const renderer = new WebGLRenderer({antialias: true, canvas: canvas, alpha: false });
// renderer.toneMapping = ACESFilmicToneMapping;
// renderer.toneMappingExposure = 2.2;
// renderer.outputColorSpace = SRGBColorSpace;

// --- throttle pixel ratio ---
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(width, height);

export class BlackHoleModel extends MathPhysicsModelBehavior {
    constructor({
        width = canvas.clientWidth,
        height = canvas.clientHeight,
        cameraPosition = new Vector3(0, 0, -8),
        blackHolePosition = new Vector3(0, 0, 0),
        rotation = new Vector3(MathUtils.degToRad(-4), 0, MathUtils.degToRad(-15))
    } = {}) {
        super();
        this._uniforms = {
            uResolution:   { value: new Vector2(width, height)},
            uTime:         { value: 0 },
            uCamPos:       { value: cameraPosition },
            uBlackHolePos: { value: blackHolePosition },
            uRotation:     { value: rotation},
        }
    }

    get uniforms() { return this._uniforms; }
}


export class ShaderView extends Renderable3D {
    constructor({
        aspectRatio = aspectRatio
    } = {}) {
        super();
        this._canvasGeometry = new PlaneGeometry(aspectRatio, 1);
    }

    initialize(model) {
        const canvasMaterial = new ShaderMaterial({
            uniforms: model.uniforms,
            vertexShader,
            fragmentShader,
        });

        const blackHoleMesh = new Mesh(this._canvasGeometry, canvasMaterial);
        this.add(blackHoleMesh);
    }

    canBindTo(model) {
        return model.uniforms;
    }
}

const view = new ShaderView({aspectRatio: aspectRatio});
const blackHoleModel = new BlackHoleModel();
view.initialize(blackHoleModel);
scene.add(view);

// FPS throttling ---
let lastTime = 0;
const targetFPS = 15; // mobielvriendelijk
const interval = 1000 / targetFPS;
let animate = true;

renderer.setAnimationLoop((time) => {
    if (!animate) return;
    if (time - lastTime < interval) return;

    lastTime = time;
    blackHoleModel.uniforms.uTime.value= time * 0.001;
    renderer.render(scene, camera);
});


// const simulation = Simulation
//     .with({
//         htmlDivId: "blackHoleRayTraceContainer",
//         cameraPosition: new Vector3(0, 0, .8),
//         fieldOfView: 75
//     });
//     .synchronize(blackHoleModel.alwaysWith(view))
//     .onClockTick((time, simulatedTime) => {
//         if (!animate) return;
//         if (time - lastTime < interval) return;
//
//         lastTime = time;
//         blackHoleModel.uniforms.uTime.value= time * 0.001;
//     });
