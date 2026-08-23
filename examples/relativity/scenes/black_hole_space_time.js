import { TextureLoader, PlaneGeometry, ShaderMaterial,
    Vector2, Vector3, Mesh } from "three";
import {degToRad, Simulation, Vec3} from "../../../src/index.js";

// TODO const massSlider = document.getElementById("massSlider");
const cameraPosition = new Vec3(0, 0, 1);
const cameraFov = 75;
const fovRadians = degToRad(cameraFov);
const yFov = cameraPosition.z * Math.tan(fovRadians / 2) * 2;
const spaceTexture = new TextureLoader()
    .load("../astrophysics/images/space_pano.jpg",
        //.load("https://www.hendrikse.name/science/astrophysics/images/background.jpg",
        //.load("https://i.imgur.com/1nVWbbd.jpg",
        () => renderer.render(scene, camera)
    );

const vertexShader = `
    varying vec2 vUv;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vUv = uv;
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D uSpaceTexture;
    uniform vec2 uResolution;
    uniform vec3 uBlackholePos;
    uniform float uGM;
    #define MAX_ITERATIONS 160
    #define STEP_SIZE 0.04

    vec3 camPos = vec3(0, 0, -3.0);
    vec4 raytrace(vec3 rayDir, vec3 rayPos) {
      vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
      for (int i = 0; i < MAX_ITERATIONS; i++) {
        float dist = length(rayPos - uBlackholePos);
        vec3 r = rayPos - uBlackholePos;
        float r3 = dist * dist * dist;
        vec3 accel =-3.0 * uGM * cross(rayDir, cross(r, rayDir)) / r3;

        rayDir += accel * STEP_SIZE;
        rayDir = normalize(rayDir);
        rayPos += rayDir * STEP_SIZE;
        if (dist > 0.1) {
            vec2 tex = normalize(rayDir).xy * 0.5 + 0.5;
            color = texture2D(uSpaceTexture, tex);
        }
      }

      return color;
    }

    void main() {
      vec2 uv = (vUv - 0.5) * 2.0 * vec2(uResolution.x / uResolution.y, 1.0);
      vec3 rayDir = normalize(vec3(uv, 1.0));
      vec3 rayPos = camPos;
      gl_FragColor = raytrace(rayDir, rayPos);
    }
`;

const simulation = Simulation
    .with({
        htmlDivId: "blackHoleSpaceTimeContainer",
        camera: {
            position: cameraPosition,
            fieldOfView: cameraFov
        },
        viewport: {
            aspectRatio: "2/1"
        },
    })
    .runsEvery(0.01)
    .onStep((clock, _) => canvasMaterial.uniforms.uBlackholePos.value.set(
        Math.sin(clock.simulatedTime) * 0.9,
        Math.cos(clock.simulatedTime * 0.7) * 0.2,
        0
    ));


const canvasGeometry = new PlaneGeometry(yFov * 2/1, yFov);
const canvasMaterial = new ShaderMaterial({
    uniforms: {
        uGM: { value : 0.025 },
        // uGM: { value: Number(massSlider.value) },
        uSpaceTexture: { value: spaceTexture },
        uResolution: { value: new Vector2(simulation.width, simulation.height) },
        uBlackholePos: { value: new Vector3(0, 0, 0) }
    },
    vertexShader,
    fragmentShader
});
const canvasMesh = new Mesh(canvasGeometry, canvasMaterial);
simulation.addObject3D(canvasMesh);

// TODO
// massSlider.addEventListener('change', (event) =>
//     canvasMaterial.uniforms.uGM.value = event.target.value
// );

