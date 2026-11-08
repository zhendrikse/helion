import {
    Simulation,
    Vec3,
    Earth,
    ThreeJsScene,
    radToDeg,
    Planet,
    Checkbox,
    CelestialBody
} from '../../../../src/index.js';
import {
    AmbientLight, BackSide, Mesh, MeshPhongMaterial, ShaderMaterial, Color, AdditiveBlending,
    DirectionalLight, SRGBColorSpace
} from 'three';
import fresnelVertexShader from '../../../../src/view/3d/primitives/shaders/add_on_vertex_shader.glsl?raw';
import fresnelFragmentShader from '../../../../src/view/3d/primitives/shaders/fresnel_fragment_shader.glsl?raw';
import atmosphereFragmentShader from '../../../../src/view/3d/primitives/shaders/atmosphere_fragment_shader.glsl?raw';
import earthDayNightVertexShader from '../../../../src/view/3d/primitives/shaders/earth_day_night_vertex_shader.glsl?raw';
import earthDayNightFragmentShader from '../../../../src/view/3d/primitives/shaders/earth_day_night_fragment_shader.glsl?raw';
import earthMap from '../../textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthNightMap from '../../textures/Solarsystemscope_texture_2k_earth_nightmap.jpg';
import earthCloudsMap from '../../textures/Earth-clouds.png';

const earth = new CelestialBody(Earth);
const sunDirection = new Vec3(10, 2, -4);
const dayTexture = Planet.loader.load(earthMap);
const nightTexture = Planet.loader.load(earthNightMap);
dayTexture.colorSpace = SRGBColorSpace;
nightTexture.colorSpace = SRGBColorSpace;

class EarthView extends Planet {
    constructor({material, cloudsMaterial, fresnelMaterial, atmosphereMaterial}) {
        super({material});

        this._atmosphere = new Mesh(this._mesh.geometry, atmosphereMaterial);
        this._atmosphere.scale.setScalar(1.075); // Atmosphere thickness
        this.add(this._atmosphere);

        this._fresnel = new Mesh(this._mesh.geometry, fresnelMaterial);
        this._fresnel.scale.setScalar(1.006);
        this.add(this._fresnel);

        this._clouds = new Mesh(this._mesh.geometry, cloudsMaterial);
        this._clouds.scale.setScalar(1.02); // Height of clouds
        this._clouds.material.depthWrite = false;
        this.add(this._clouds);
    }

    /** @param {boolean} value */
    set clouds(value) { this._clouds.visible = value; }
    /** @param {boolean} value */
    set atmosphere(value) { this._atmosphere.visible = value; }
    /** @param {boolean} value */
    set fresnel(value) { this._fresnel.visible = value; }

    /** @param {{position: Vec3, radius: number, tilt:number, rotation: Vec3, time: number, spin: number}} body */
    synchronizeWith(body) {
        super.synchronizeWith(body);
        this._clouds.rotation.y = body.time * body.spin * .8; // Clouds rotate a bit slower
    }
}

const earthView = new EarthView({
    material: new ShaderMaterial({
        uniforms: {
            uDayTexture: {value: dayTexture},
            uNightTexture: {value: nightTexture},
            uSunDirection: {value: sunDirection}
        },
        vertexShader: earthDayNightVertexShader,
        fragmentShader: earthDayNightFragmentShader
    }),
    cloudsMaterial: new MeshPhongMaterial({
        map: Planet.loader.load(earthCloudsMap),
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        specular: new Color(0xffffff),
        shininess: 10
    }),
    fresnelMaterial: new ShaderMaterial({
        uniforms: {
            uColor: {value: new Vec3(0.45, 0.55, 1)},
            uIntensity: {value: 0.25}
        },
        vertexShader: fresnelVertexShader,
        fragmentShader: fresnelFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending
    }),
    atmosphereMaterial: new ShaderMaterial({
        uniforms: {
            u_sunRelPosition: {value: sunDirection},
            u_color: {value: new Vec3(0.45, 0.55, 1)}
        },
        vertexShader: fresnelVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        side: BackSide,
        depthTest: true,
        depthWrite: false
    })
});

const sun = new DirectionalLight(0xcccccc, 1);
sun.position.set(sunDirection.x, sunDirection.y, sunDirection.z);
let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: 'earthContainer',
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌎 Earth</strong><br/>` +
                '• One minute simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Earth.mass} kg<br/> • Radius: ${Earth.radius} m<br/>` +
                `• Tilt: ${radToDeg(Earth.tilt)}°<br/> • Spin: ${radToDeg(Earth.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Earth.inclination)}°<br/> • Semi-major axis: ${Earth.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Earth.eccentricity}<br/> • Right ascension: ${radToDeg(Earth.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0x888888, 1e-2))
    .addObject3D(sun)
    .bind(earth.alwaysWith(earthView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view
        earth.time += dtHours;
        earthView.translation = earth.coordinates;
    })
    .append(new Checkbox('Clouds')
        .checked(true)
        .onChange(checked => earthView.clouds = checked)
        .togetherWith(new Checkbox('Atmosphere')
            .checked(true)
            .onChange(checked => earthView.atmosphere = checked)
            .togetherWith(new Checkbox('Fresnel')
                .checked(true)
                .onChange(checked => earthView.fresnel = checked)))
    )
    .start();