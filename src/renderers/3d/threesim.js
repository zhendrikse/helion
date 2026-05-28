import {
    Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, Group, Fog, Color,
    PCFShadowMap, AmbientLight, ShaderMaterial, AdditiveBlending, Points, PointsMaterial,
    BufferAttribute, Vector3, BufferGeometry, Box3
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Renderer } from "../renderer.js"
import { Vec3 } from "../../math/math.js";
import { AxesController, Axes } from "./primitives/decorations.js";

export class ThreeJsRenderOptions {
    constructor({
        background = ThreeJsRenderer.Background.TRANSPARENT,
        backgroundColor = 0x0088ff,
        controls = true,
        light = true,
        cameraPosition = new Vec3(3, 3, 3),
        shadowsEnabled = false,
        fieldOfView = 50
    } = {}) {
        this.background = background;
        this.backgroundColor = backgroundColor;
        this.controls = controls;
        this.light = light;
        this.cameraPosition = cameraPosition;
        this.shadowsEnabled = shadowsEnabled;
        this.fieldOfView = fieldOfView;
    }
}

export class ThreeJsRenderer extends Renderer {
    static Background = Object.freeze({
        PLAIN: "Plain",
        FOG: "Fog",
        TRANSPARENT: "Transparent",
        STARS: "Stars"
    });

    static on = (canvasWrapperDiv) => new ThreeJsRenderer(canvasWrapperDiv);

    constructor(canvasWrapperDiv) {
        super(canvasWrapperDiv);
        this._canvas = this._canvasWrapperDiv.canvas.htmlCanvas;
        this._overlay = this._canvasWrapperDiv.overlay?.htmlOverlay;

        this._staticObjects = [];  // Are static during the whole simulation hence do NOT need to be synchronized
        this._dynamicObjects = []; // Need to be synchronized every update

        this._autoRotate = false;
        this._autoRotateTheta = Math.PI / 2;
        this._autoRotatePhi = 0;

        this._scene = new Scene();
        this._world = new Group();
        this._skydome = null;
        this._scene.add(this._world);
        this._axisController = null;
    }

    _showOverlayMessage(message, duration = 1000) {
        if (!this._overlay)
            return; // No overlay has been specified by the user, so we cannot render our information

        this._overlay.textContent = message;
        this._overlay.style.display = "block";

        setTimeout(() => {
            this._overlay.style.display = "none";
        }, duration);
    }

    onRunStatusChanged(currentSimulationRunningState) {
        if (currentSimulationRunningState)
            this._showOverlayMessage("Started");
        else
            this._showOverlayMessage("Reset"); // Canvas clicked during execution ==> we need to reset the simulation
    }

    with(options) {
        const canvas = this._canvas;

        this._renderer = new WebGLRenderer({
            antialias: true,
            canvas: this._canvas,
            alpha: options.background === ThreeJsRenderer.Background.TRANSPARENT
        });

        if (options.shadowsEnabled) {
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = PCFShadowMap;
        }

        this._camera = new PerspectiveCamera(options.fieldOfView, canvas.clientWidth / canvas.clientHeight, 0.1, 1e6);
        this._camera.position.set(options.cameraPosition.x, options.cameraPosition.y, options.cameraPosition.z);

        if (options.controls)
            this._controls = new OrbitControls(this._camera, canvas);

        if (options.light)
            this._initLights(options.shadowsEnabled);

        this._initBackground(options.background, options.backgroundColor);

        this.resize();
        window.addEventListener("resize", () => this.resize());

        return this;
    }

    resize() {
        const canvas = this._renderer.domElement;
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;

        if (!canvasWidth || !canvasHeight)
            return;

        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const width = Math.floor(canvasWidth * pixelRatio);
        const height = Math.floor(canvasHeight * pixelRatio);

        if (canvas.width === width || canvas.height === height)
            return;

        this._renderer.setPixelRatio(pixelRatio);
        this._renderer.setSize(canvasWidth, canvasHeight, false);
        this._camera.aspect = canvasWidth / canvasHeight;
        this._camera.updateProjectionMatrix();
    }

    reset() {
        for (const anObject of this._dynamicObjects)
            if (anObject.reset)
                anObject.reset();
    }

    _doAutoRotate(distance) {
        this._autoRotateTheta += -Math.PI / (7.5 * 100);
        this._autoRotatePhi +=  Math.PI / (7.5 * 100) * 2;

        this._camera.position.set(
            distance * Math.sin(this._autoRotateTheta) * Math.sin(this._autoRotatePhi),
            distance * Math.cos(this._autoRotateTheta),
            distance * Math.sin(this._autoRotateTheta) * Math.cos(this._autoRotatePhi)
        );

        this._camera.lookAt(0, 0, 0);
    }

    _initLights(shadowsEnabled) {
        const directionalLight = new DirectionalLight(0xffffff, shadowsEnabled ? 2 : 1);
        directionalLight.position.set(0, this._camera.position.y, 0);
        this._scene.add(directionalLight);
        this._scene.add(new AmbientLight(0xffffff, 0.8));

        if (!shadowsEnabled)
            return;

        // Adjust shadow camera settings
        directionalLight.shadow.camera.near = 0.5; // Default is 0.5
        directionalLight.shadow.camera.far = 50; // Default is 500
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.camera.left = -20;
        directionalLight.castShadow = true;

        // Adjust shadow map settings
        directionalLight.shadow.mapSize.width = 2048; // Default is 512
        directionalLight.shadow.mapSize.height = 2048; // Default is 512
    }

    _initBackground(background, backgroundColor) {
        switch (background) {
            case ThreeJsRenderer.Background.PLAIN:
                this._scene.background = new Color(backgroundColor);
                break;
            case ThreeJsRenderer.Background.FOG:
                this._scene.background = new Color(backgroundColor);
                this._scene.fog = new Fog(backgroundColor, 1, 100);
                break;
            case ThreeJsRenderer.Background.STARS:
                this._skydome = new SkyDome({
                    skyRadius: this._camera.position.clone().length() * 10,
                    blinkSpeed: 2.5
                });
                this._world.add(this._skydome);
                break;
            case ThreeJsRenderer.Background.TRANSPARENT:
            default:
                break;
        }
    }

    initialize(transform) {
        // Sync new physics state with view
        for (const anObject of this._staticObjects)
            anObject.render?.(transform);
    }

    render(transform, time) {
        // Sync new physics state with view
        for (const anObject of this._dynamicObjects)
            anObject.render?.(transform);

        this._renderer.render(this._scene, this._camera);
        this._controls?.update();
        this._skydome?.update(time, this._camera);
        this._axisController?.render(this._scene, this._camera);

        if (this._autoRotate)
            this._doAutoRotate(this._camera.position.length());
    }

    addObject3D(threeJsObject) {
        this._world.add(threeJsObject);
    }

    synchronize(bodyAndView) {
        // Tie the body state to its associated view
        if (!bodyAndView.view.attachTo)
            throw new Error("Use addPlainObject() to attach regular Three.js objects!");

        this._world.add(bodyAndView.view);

        if (bodyAndView.always)
            this._dynamicObjects.push(bodyAndView.view);
        else
            this._staticObjects.push(bodyAndView.view);

        bodyAndView.view.attachTo(bodyAndView.body);
    }

    remove(anObject) {
        throw new Error("Remove() method not implemented.");
    }

    provideAxesFor(anObject, {
        layoutType = Axes.Type.MATLAB,
        divisions = 10,
        frame = true,
        annotations = true,
        tickLabels = true,
        xyPlane = true,
        xzPlane = true,
        yzPlane = true,
        axisLabels = ["X", "Y", "Z"],
        positiveXZ = false
    } = {}) {
        this._axesController = new AxesController({
            parentGroup: this._world,
            canvasContainer: this._canvasWrapperDiv.htmlDiv,
            axesParameters: {layoutType, divisions, frame, annotations, tickLabels, xyPlane, xzPlane, yzPlane, axisLabels, positiveXZ}
        });

        anObject.updateMatrixWorld();
        const boundingBox = new Box3();
        boundingBox.setFromObject( this._world );
        this._axesController.createFromBoundingBox(boundingBox);
    }

    set autoRotate(autoRotate) { this._autoRotate = autoRotate; }
}


class SkyDome extends Group {
    constructor({
                    skyRadius = 5000,
                    starDensity = 5,
                    glowStarCount = 2000,
                    pointSize = 4,
                    blinkSpeed = 5
                } = {}) {
        super();

        this._stars = this.#createStars(skyRadius / starDensity); // Non-blinking stars
        this._stars.forEach(star => { star.renderOrder = -1; this.add(star); });
        this._glowStars = this.#createGlowStars(skyRadius, glowStarCount, pointSize, blinkSpeed); // Blinking stars
        this._glowStars.renderOrder = -10; // Sky dome is "infinitely" far away
        this.add(this._glowStars);
    }

    #createGlowStars(skyRadius, starCount, pointSize, blinkSpeed) {
        const positions = new Float32Array(starCount * 3);
        const randomPhases = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = skyRadius;

            positions[3 * i + 0] = r * Math.sin(phi) * Math.cos(theta);
            positions[3 * i + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[3 * i + 2] = r * Math.cos(phi);

            randomPhases[i] = Math.random(); // unieke fase voor fonkelen
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(positions, 3));
        geometry.setAttribute("aRandom", new BufferAttribute(randomPhases, 1));

        const material = new ShaderMaterial({
            transparent: true,
            depthTest: true,
            depthWrite: false,
            blending: AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                pointSize: { value: pointSize },
                blinkSpeed: { value: blinkSpeed }
            },
            vertexShader: `
                attribute float aRandom;
                varying float vRandom;
                uniform float uTime;
                uniform float blinkSpeed;
                void main() {
                    vRandom = aRandom;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 4.0 + 2.0 * sin(uTime * blinkSpeed + vRandom * 6.2831);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    float halo = exp(-dist * dist * 8.0);

                    // fonkelen
                    float alpha = halo;
                    gl_FragColor = vec4(vec3(1.0), alpha);
                }
            `
        });

        return new Points(geometry, material);
    }

    #createStars(radius) {
        const layers = [
            { count: 250, size: 2, color: 0x555555 },
            { count: 1500, size: 1, color: 0x333333 }
        ];

        const starGroups = [];

        for (let layer = 0; layer < layers.length; layer++) {
            const { count, size, color } = layers[layer];
            const positions = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const vector = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
                    .normalize()
                    .multiplyScalar(radius);

                positions[3 * i + 0] = vector.x;
                positions[3 * i + 1] = vector.y;
                positions[3 * i + 2] = vector.z;
            }

            const geometry = new BufferGeometry();
            geometry.setAttribute("position", new BufferAttribute(positions, 3));

            const material = new PointsMaterial({
                color,
                size,
                sizeAttenuation: false,
                depthWrite: false,
                depthTest: false
            });

            for (let i = 10; i < 30; i++) {
                const stars = new Points(geometry, material);
                stars.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                stars.updateMatrix();
                stars.matrixAutoUpdate = false;
                starGroups.push(stars.clone());
            }
        }

        return starGroups;
    }

    update(time, camera) {
        this.quaternion.copy(camera.quaternion);
        this._glowStars.material.uniforms.uTime.value = time * 1e-3;
        this.position.copy(camera.position);
    }
}