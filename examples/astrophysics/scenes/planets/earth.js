import {
    Mesh, MeshBasicMaterial, PerspectiveCamera, ShaderMaterial, SphereGeometry,
    TextureLoader, Vector3, WebGLRenderer, Group, BackSide, MeshLambertMaterial, PointLight, Object3D, Scene,
    PCFShadowMap
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import vertex from '../../../../src/view/3d/astro/shaders/earth_vertex_shader.glsl?raw';
import fragment from '../../../../src/view/3d/astro/shaders/earth_fragment_shader.glsl?raw';
import addon_vertex from '../../../../src/view/3d/astro/shaders/add_on_vertex_shader.glsl?raw';
import atmosphere from '../../../../src/view/3d/astro/shaders/atmosphere_fragment_shader.glsl?raw';
import fresnel from '../../../../src/view/3d/astro/shaders/fresnel_fragment_shader.glsl?raw';

import earthDayMapUrl from '../../../../src/textures/planets/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthNightMapUrl from '../../../../src/textures/planets/Solarsystemscope_texture_2k_earth_nightmap.jpg';
import earthSpecUrl from '../../../../src/textures/planets/earthspec1k.jpg';
import earthCloudsUrl from '../../../../src/textures/planets/Earth-clouds.png';
import earthNormalMapUrl from '../../../../src/textures/planets/2k_earth_normal_map.png';
import moonmapUrl from '../../../../src/textures/planets/moonmap1k.jpg';

const container = document.getElementById("earthContainer");
const canvas = document.createElement('canvas');
canvas.class = "applicationCanvas";
container.appendChild(canvas);

const renderer = new WebGLRenderer({alpha: true, canvas, antialias: true});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap
renderer.setSize(container.clientWidth, container.clientHeight);

const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const material_sun = new MeshBasicMaterial({color: 0xffaa00, opacity: 0, transparent: true});
const sun = new Mesh(new SphereGeometry(1, 30, 30), material_sun);

/**
 * Original code by Sangil Lee:
 *    https://sangillee.com/2024-06-07-create-realistic-earth-with-shaders/
 */
class Earth extends Group {
    static loader = new TextureLoader();
    static material = new ShaderMaterial({
        uniforms: {
            u_dayTexture: { value: Earth.loader.load( earthDayMapUrl) },
            u_nightTexture: { value: Earth.loader.load( earthNightMapUrl) },
            u_normalTexture: { value: Earth.loader.load( earthNormalMapUrl) },
            u_specTexture: { value: Earth.loader.load( earthSpecUrl) },
            u_cloudTexture: { value: Earth.loader.load( earthCloudsUrl)},
            u_normalPower: { value: 5.0 },
            u_sunRelPosition: { value: new Vector3(0,0,0)},
            u_position: { value: new Vector3(0,0,0)},
            u_moonPosition: { value: new Vector3(0,0,0)},
            u_moonRadius: { value: 0.05},
            u_sunRadius: { value: 0.2},
        },
        vertexShader: vertex,
        fragmentShader: fragment,
    });

    static atmosphereMaterial = new ShaderMaterial({
        uniforms: {
            u_sunRelPosition: { value: new Vector3(0,0,0)},
            u_color: { value: new Vector3(.45,.55,1)},
        },
        vertexShader: addon_vertex,
        fragmentShader: atmosphere,
        transparent: true,
        side: BackSide,
        depthTest: true,
        depthWrite: false,
    });

    static fresnelMaterial = new ShaderMaterial({
        uniforms: {
            u_sunRelPosition: { value: new Vector3(0,0,0)},
            u_color: { value: new Vector3(.45,.55,1)},
        },
        vertexShader: addon_vertex,
        fragmentShader: fresnel,
        transparent: true
    });

    constructor() {
        super();

        const geometry_sphere = new SphereGeometry(1, 30, 30);
        geometry_sphere.computeTangents();
        const earth = new Mesh(geometry_sphere, Earth.material);
        earth.scale.set(0.2, 0.2, 0.2);
        const earth_atmosphere = new Mesh(geometry_sphere, Earth.atmosphereMaterial);
        earth_atmosphere.scale.set(1.05, 1.05, 1.05);
        const earth_fresnel = new Mesh(geometry_sphere, Earth.fresnelMaterial);
        earth_fresnel.scale.set(1.0001, 1.0001, 1.0001);
        earth.add(earth_atmosphere, earth_fresnel);

        this.add(earth);
    }
}




const material_moon = new MeshLambertMaterial();
const moon = new Mesh(new SphereGeometry(1, 30, 30), material_moon);
moon.scale.set(0.05, 0.05, 0.05);

const loader = new TextureLoader();
loader.load(moonmapUrl, (texture)=>{
    material_moon.map = texture;
    material_moon.needsUpdate = true;
});

const light = new PointLight(0xffffff, 15);
light.position.set(0, 0, 0);
light.castShadow = true;
// light.shadow.mapSize = new Vector2(4096, 4096);
// light.shadow.radius = 20;

const earth_orbit = new Object3D();
const earth_equator = new Object3D();
const moon_orbit = new Object3D();
// earth_equator.rotateZ(23.5*Math.PI/180);

const scene = new Scene();
const earth = new Earth();
scene.add(earth);
scene.add(sun);
sun.add(light);
scene.add(earth_orbit);
earth_orbit.add(earth_equator);
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
    Earth.material.uniforms.u_sunRelPosition.withValue.x = 3*Math.cos(w_orbit*sec);
    Earth.material.uniforms.u_sunRelPosition.withValue.y = 0;
    Earth.material.uniforms.u_sunRelPosition.withValue.z = -3*Math.sin(w_orbit*sec);
    Earth.material.uniforms.u_moonPosition.value.x = 0.4*Math.cos(w_moon*sec);
    Earth.material.uniforms.u_moonPosition.value.y = 0;
    Earth.material.uniforms.u_moonPosition.value.z = -0.4*Math.sin(w_moon*sec);
    Earth.atmosphereMaterial.uniforms.u_sunRelPosition.withValue.x = 3*Math.cos(w_orbit*sec);
    Earth.atmosphereMaterial.uniforms.u_sunRelPosition.withValue.y = 0;
    Earth.atmosphereMaterial.uniforms.u_sunRelPosition.withValue.z = -3*Math.sin(w_orbit*sec);
    Earth.fresnelMaterial.uniforms.u_sunRelPosition.withValue.x = 3*Math.cos(w_orbit*sec);
    Earth.fresnelMaterial.uniforms.u_sunRelPosition.withValue.y = 0;
    Earth.fresnelMaterial.uniforms.u_sunRelPosition.withValue.z = -3*Math.sin(w_orbit*sec);
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
