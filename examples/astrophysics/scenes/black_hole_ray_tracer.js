import { PerspectiveCamera, WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace, MathUtils, PlaneGeometry,
    ShaderMaterial, Vector2, Vector3, Mesh, Scene }  from "three";
import vertexShader from "./black_hole_vertex_shader.glsl?raw";
import fragmentShader from "./black_hole_fragment_shader.glsl?raw";
import {Simulation} from "../../../src/index.js";

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
camera.position.z = 1;

const renderer = new WebGLRenderer({antialias: true, canvas: canvas, alpha: false });
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.2;
renderer.outputColorSpace = SRGBColorSpace;

// --- throttle pixel ratio ---
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(width, height);

const fovRadians = MathUtils.degToRad(camera.fov);
const yFov = camera.position.z * Math.tan(fovRadians / 2) * 2;

const canvasGeometry = new PlaneGeometry(yFov * camera.aspect, yFov);
const canvasMaterial = new ShaderMaterial({
    uniforms: {
        uResolution:   { value: new Vector2(width, height)},
        uTime:         { value: 0 },
        uCamPos:       { value: new Vector3(0, 0, -8)},
        uBlackHolePos: { value: new Vector3(0, 0, 0)},
        uRotation:     { value: new Vector3(MathUtils.degToRad(-4), 0, MathUtils.degToRad(-15))},
    },
    vertexShader,
    fragmentShader,
});

const blackHoleMesh = new Mesh(canvasGeometry, canvasMaterial);
scene.add(blackHoleMesh);

// FPS throttling ---
let lastTime = 0;
const targetFPS = 15; // mobielvriendelijk
const interval = 1000 / targetFPS;
let animate = true;

renderer.setAnimationLoop((time) => {
    if (!animate) return;
    if (time - lastTime < interval) return;

    lastTime = time;
    canvasMaterial.uniforms.uTime.value = time * 0.001;
    renderer.render(scene, camera);
});

const downloadButton = document.createElement("button");
downloadButton.textContent = "Download image";
document.body.appendChild(downloadButton);

downloadButton.addEventListener("click", () => {
    renderer.render(scene, camera); // laatste frame renderen
    const link = document.createElement("a");
    link.download = "blackhole.png";
    link.href = renderer.domElement.toDataURL("image/png");
    link.click();
});
//
// Simulation
//     .with({
//         htmlDivId: "blackHoleRayTraceContainer",
//         cameraPosition: new Vector3(0, 0, 1),
//         fieldOfView: 75
//     })