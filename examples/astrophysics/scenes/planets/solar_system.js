import {
    Simulation, Vec3, CelestialBody, ThreeJsScene, Planet, Checkbox, PlanetMoonSystem, Trail,
    SunView, Colour, Earth, Mercury, Venus, Luna, Mars
} from '../../../../src/index.js';
import {
    AmbientLight, BackSide, Mesh, MeshPhongMaterial, ShaderMaterial, Color, AdditiveBlending,
    SRGBColorSpace, PointLight
} from 'three';
import fresnelVertexShader from '../../../../src/view/3d/primitives/shaders/add_on_vertex_shader.glsl?raw';
import fresnelFragmentShader from '../../../../src/view/3d/primitives/shaders/fresnel_fragment_shader.glsl?raw';
import atmosphereFragmentShader from '../../../../src/view/3d/primitives/shaders/atmosphere_fragment_shader.glsl?raw';
import earthDayNightVertexShader from '../../../../src/view/3d/primitives/shaders/earth_day_night_vertex_shader.glsl?raw';
import earthDayNightFragmentShader from '../../../../src/view/3d/primitives/shaders/earth_day_night_fragment_shader.glsl?raw';
import earthMap from '../../textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthNightMap from '../../textures/Solarsystemscope_texture_2k_earth_nightmap.jpg';
import earthCloudsMap from '../../textures/Earth-clouds.png';
import moonMap from '../../textures/moonmap1k.jpg';
import moonBumpMap from '../../textures/moonbump1k.jpg';
import mercuryMap from "../../textures/mercurymap.jpg";
import mercuryBumpMap from "../../textures/mercurybump.jpg";
import venusMap from "../../textures/venusmap.jpg";
import venusBumpMap from "../../textures/venusbump.jpg";
import marsMap from "../../textures/marsmap.jpg";
import marsBumpMap from "../../textures/marsbump.jpg";

const earthMoonSystem = new PlanetMoonSystem(Earth, [Luna]);

const sunDirection = new Vec3(10, 2, -4);
const dayTexture = Planet.loader.load(earthMap);
const nightTexture = Planet.loader.load(earthNightMap);
dayTexture.colorSpace = SRGBColorSpace;
nightTexture.colorSpace = SRGBColorSpace;

// export const AU = 1.496 * 1E11;   // astronomical unit
// export const ORBIT_SCALE = 40;    // additional orbit compression factor for nice visual representation
// export const DISTANCE_SCALE = AU / ORBIT_SCALE;

class EarthView extends Planet {
    constructor({material, cloudsMaterial, fresnelMaterial, atmosphereMaterial}) {
        super({material});//, distanceScale: 1000 / DISTANCE_SCALE});

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

const moonView = new Planet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(moonMap),
        bumpMap: Planet.loader.load(moonBumpMap),
        bumpScale: 2,
        shininess: 0
    })
});

const sun = new CelestialBody({
    radius: 1e7
});
const sunLight = new PointLight(0xffffff, 2, 1e4, 0);

let lastTime = performance.now() * 1e-3;
let tPhys = 0;
let timeScale = 24; // 24 hours equal to one second simulation time
earthMoonSystem.update(tPhys); // Set correct initial positions
Mercury.position.copy(Mercury.coordinates);
Venus.position.copy(Venus.coordinates);
Mars.position.copy(Mars.coordinates);
Simulation
    .with({
        htmlDivId: 'solarSystemContainer',
        viewport: { aspectRatio: '19/12'},
        camera: {
            fieldOfView: 50,
            position: new Vec3(580, 200, -195).multiplyScalar(.7),
            target: new Vec3(0, 0, 0)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false, shadows: true },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌎 Solar system</strong><br/>` +
                `• Features tidal locking of moons<br/>`
        }
    })
    .addObject3D(new AmbientLight(0x888888, 1e-1))
    .addObject3D(sunLight)
    .bind(sun.alwaysWith(new SunView()))
    .bind(Mercury.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(mercuryMap),
            bumpMap: Planet.loader.load(mercuryBumpMap),
            bumpScale: 1.5,
            shininess: 0
        })
    })))
    .bind(Mercury.alwaysWith(new Trail({
        maxPoints: 200,
        trailStep: 10,
        color: Colour.Yellow
    })))
    .bind(Venus.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(venusMap),
            bumpMap: Planet.loader.load(venusBumpMap),
            bumpScale: 1,
            shininess: 0
        })
    })))
    .bind(Venus.alwaysWith(new Trail({
        maxPoints: 300,
        trailStep: 10,
        color: Colour.Orange
    })))
    .bind(Earth.alwaysWith(earthView))
    .bind(Earth.alwaysWith(new Trail({
        maxPoints: 1000,
        trailStep: 10,
        color: Colour.LightBlue
    })))
    .bind(Luna.alwaysWith(moonView))
    .bind(Mars.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(marsMap),
            bumpMap: Planet.loader.load(marsBumpMap),
            bumpScale: 2.5,
            shininess: 0
        })
    })))
    .bind(Mars.alwaysWith(new Trail({
        maxPoints: 300,
        trailStep: 10,
        color: Colour.Red
    })))
    .onFrame(timeStamp => {
        sun.time = timeStamp;

        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;

        const dtHours = deltaSeconds * timeScale;
        tPhys += dtHours;
        Mercury.time = tPhys;
        Venus.time = tPhys;
        Mars.time = tPhys;
        earthMoonSystem.update(tPhys);
        // earthView.translation = earthMoonSystem.planet.position;
        // moonView.translation = earthMoonSystem.planet.position;
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
