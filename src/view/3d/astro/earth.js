/**
 * Original code by Sangil Lee:
 *    https://sangillee.com/2024-06-07-create-realistic-earth-with-shaders/
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import vertex from './shaders/earth_vertex_shader.glsl?raw';
import fragment from './shaders/earth_fragment_shader.glsl?raw';
import addon_vertex from './shaders/add_on_vertex_shader.glsl?raw';
import atmosphere from './shaders/atmosphere_fragment_shader.glsl?raw';
import fresnel from './shaders/fresnel_fragment_shader.glsl?raw';

import earthDayMapUrl from '../../../textures/planets/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthNightMapUrl from '../../../textures/planets/Solarsystemscope_texture_2k_earth_nightmap.jpg';
import earthSpecUrl from '../../../textures/planets/earthspec1k.jpg';
import earthCloudsUrl from '../../../textures/planets/Earth-clouds.png';
import earthNormalMapUrl from '../../../textures/planets/2k_earth_normal_map.png';
import moonmapUrl from '../../../textures/planets/moonmap1k.jpg';
import {Sphere} from "../primitives/primitives.js";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true, antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const geometry_sphere = new THREE.SphereGeometry(1, 30, 30);
geometry_sphere.computeTangents();

const material_sun = new THREE.MeshBasicMaterial({color: 0xffaa00, opacity: 0, transparent: true});
const sun = new THREE.Mesh(geometry_sphere, material_sun);

const material_earth = new THREE.ShaderMaterial({
    uniforms: {
        u_dayTexture: { value: new THREE.TextureLoader().load( earthDayMapUrl) },
        u_nightTexture: { value: new THREE.TextureLoader().load( earthNightMapUrl) },
        u_normalTexture: { value: new THREE.TextureLoader().load( earthNormalMapUrl) },
        u_specTexture: { value: new THREE.TextureLoader().load( earthSpecUrl) },
        u_cloudTexture: { value: new THREE.TextureLoader().load( earthCloudsUrl)},
        u_normalPower: { value: 5.0 },
        u_sunRelPosition: { value: new THREE.Vector3(0,0,0)},
        u_position: { value: new THREE.Vector3(0,0,0)},
        u_moonPosition: { value: new THREE.Vector3(0,0,0)},
        u_moonRadius: { value: 0.05},
        u_sunRadius: { value: 0.2},
    },
    vertexShader: vertex,
    fragmentShader: fragment,
})
const earth = new THREE.Mesh(geometry_sphere, material_earth);
earth.scale.set(0.2, 0.2, 0.2);

const material_earth_atmosphere = new THREE.ShaderMaterial({
    uniforms: {
        u_sunRelPosition: { value: new THREE.Vector3(0,0,0)},
        u_color: { value: new THREE.Vector3(.45,.55,1)},
    },
    vertexShader: addon_vertex,
    fragmentShader: atmosphere,
    transparent: true,
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: false,
});

const earth_atmosphere = new THREE.Mesh(geometry_sphere, material_earth_atmosphere);
earth_atmosphere.scale.set(1.05, 1.05, 1.05);
earth.add(earth_atmosphere);

const material_earth_fresnel = new THREE.ShaderMaterial({
    uniforms: {
        u_sunRelPosition: { value: new THREE.Vector3(0,0,0)},
        u_color: { value: new THREE.Vector3(.45,.55,1)},
    },
    vertexShader: addon_vertex,
    fragmentShader: fresnel,
    transparent: true
});

const earth_fresnel = new THREE.Mesh(geometry_sphere, material_earth_fresnel);
earth_fresnel.scale.set(1.0001, 1.0001, 1.0001);;
earth.add(earth_fresnel);

const material_moon = new THREE.MeshLambertMaterial();
const moon = new THREE.Mesh(geometry_sphere, material_moon);
moon.scale.set(0.05, 0.05, 0.05);

const loader = new THREE.TextureLoader();
loader.load(moonmapUrl, (texture)=>{
    material_moon.map = texture;
    material_moon.needsUpdate = true;
});

const light = new THREE.PointLight(0xffffff, 15);
light.position.set(0, 0, 0);
light.castShadow = true;
// light.shadow.mapSize = new THREE.Vector2(4096, 4096);
// light.shadow.radius = 20;

const earth_orbit = new THREE.Object3D();
const earth_equator = new THREE.Object3D();
const moon_orbit = new THREE.Object3D();
// earth_equator.rotateZ(23.5*Math.PI/180);

const scene = new THREE.Scene();
scene.add(sun);
sun.add(light);
scene.add(earth_orbit);
earth_orbit.add(earth_equator);
earth_equator.add(earth);
earth_equator.add(moon_orbit);
moon_orbit.add(moon);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

camera.position.set(0,0,0.6)

const w_moon = 0.5;
const w_orbit = 0;
const w_rotate = 0.0;

function updateSystem(sec) {
    moon.position.set(0.4*Math.cos(w_moon*sec), 0, -0.4*Math.sin(w_moon*sec));
    sun.position.set(3*Math.cos(w_orbit*sec), 0, -3*Math.sin(w_orbit*sec));
    material_earth.uniforms.u_sunRelPosition.value.x = 3*Math.cos(w_orbit*sec);
    material_earth.uniforms.u_sunRelPosition.value.y = 0;
    material_earth.uniforms.u_sunRelPosition.value.z = -3*Math.sin(w_orbit*sec);
    material_earth.uniforms.u_moonPosition.value.x = 0.4*Math.cos(w_moon*sec);
    material_earth.uniforms.u_moonPosition.value.y = 0;
    material_earth.uniforms.u_moonPosition.value.z = -0.4*Math.sin(w_moon*sec);
    material_earth_atmosphere.uniforms.u_sunRelPosition.value.x = 3*Math.cos(w_orbit*sec);
    material_earth_atmosphere.uniforms.u_sunRelPosition.value.y = 0;
    material_earth_atmosphere.uniforms.u_sunRelPosition.value.z = -3*Math.sin(w_orbit*sec);
    material_earth_fresnel.uniforms.u_sunRelPosition.value.x = 3*Math.cos(w_orbit*sec);
    material_earth_fresnel.uniforms.u_sunRelPosition.value.y = 0;
    material_earth_fresnel.uniforms.u_sunRelPosition.value.z = -3*Math.sin(w_orbit*sec);
    // earth.rotateY(w_rotate);
    sun.rotateY(w_rotate);
}

function animate (msec) {
    requestAnimationFrame(animate);

    updateSystem(msec * 0.001);

    controls.update();
    renderer.render(scene, camera);
}
animate();

export class Earth extends Sphere {
    constructor() {
        super();
    }
}