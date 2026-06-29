import { PerspectiveCamera, WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace, MathUtils, PlaneGeometry,
    ShaderMaterial, Vector2, Vector3, Mesh, Scene }  from "three";
import vertexShader from "./black_hole_vertex_shader.glsl?raw";
import fragmentShader from "./black_hole_fragment_shader.glsl?raw";
import {Checkbox, Renderable3D, Simulation} from "../../../src/index.js";
import {MathPhysicsModelBehavior} from "../../../src/core/helion.js";

export class BlackHoleModel extends MathPhysicsModelBehavior {
    constructor({
        width = 160,
        height = 90,
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

const simulation = Simulation
    .with({
        htmlDivId: "blackHoleRayTraceContainer",
        cameraPosition: new Vector3(0, 0, .8),
        fieldOfView: 75
    });

const width = simulation._viewport.width;
const height = simulation._viewport.height;
const aspectRatio = width / height;
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
const view = new ShaderView({ aspectRatio });
const blackHoleModel = new BlackHoleModel({
    width: width,
    height: height
});

let animate = true;
simulation
    .bind(blackHoleModel.alwaysWith(view))
    .onFrame(time => {
        if (!animate) return;
        blackHoleModel.uniforms.uTime.value= time * 0.001;
    })
    .append(new Checkbox("Animate ")
        .checked(true)
        .addEventListener("change", () => animate = !animate))
    .start();

// const downloadButton = document.createElement("button");
// downloadButton.textContent = "Download image";
// document.body.appendChild(downloadButton);
//
// downloadButton.addEventListener("click", () => {
//     renderer.render(scene, camera); // laatste frame renderen
//     const link = document.createElement("a");
//     link.download = "blackhole.png";
//     link.href = renderer.domElement.toDataURL("image/png");
//     link.click();
// });