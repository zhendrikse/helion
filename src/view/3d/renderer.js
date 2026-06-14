import {
    Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, Group, Fog, Color,
    PCFShadowMap, AmbientLight, Vector3
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Renderer } from "../renderer.js"
import { Axes, SkyDome } from "./composite/backgrounds.js";
import { Simulation } from "../../core/helion.js";

export class ThreeJsRenderer extends Renderer {
    constructor(options) {
        super();
        this._options = options;
        this._scene = new Scene();
        this._world = new Group();
        this._background = new Group();
        this._skydome = null;
        this._scene.add(this._world, this._background);
        this._axes = null;
        this._viewport = null;
    }

    attach(viewport) {
        this._viewport = viewport;
        this._renderer = new WebGLRenderer({
            alpha: true,
            antialias: true,
            canvas: viewport.canvas
        });

        const { background, backgroundColor, scale, controls, light, cameraPosition, shadowsEnabled, fieldOfView } = this._options;

        if (shadowsEnabled) {
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = PCFShadowMap;
        }

        this._world.scale.setScalar(scale);
        this._camera = new PerspectiveCamera(fieldOfView, viewport.width / viewport.height, 0.1, 1e6);
        this._camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

        if (controls)
            this._controls = new OrbitControls(this._camera, viewport.canvas);

        if (light)
            this._initLights(shadowsEnabled);

        this._initBackground(background, backgroundColor);
        this.resize();
        window.addEventListener("resize", () => this.resize());
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

        if (canvas.width === width && canvas.height === height)
            return;

        this._renderer.setPixelRatio(pixelRatio);
        this._renderer.setSize(canvasWidth, canvasHeight, false);
        this._camera.aspect = canvasWidth / canvasHeight;
        this._camera.updateProjectionMatrix();
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
            case Simulation.Background.PLAIN:
                this._scene.background = new Color(backgroundColor);
                break;
            case Simulation.Background.FOG:
                this._scene.background = new Color(backgroundColor);
                this._scene.fog = new Fog(backgroundColor, 1, 100);
                break;
            case Simulation.Background.STARS:
                this._skydome = new SkyDome({
                    skyRadius: this._camera.position.clone().length() * 10,
                    blinkSpeed: 2.5
                });
                this._background.add(this._skydome);
                break;
            case Simulation.Background.TRANSPARENT:
            default:
                break;
        }
    }

    render(time) {
        this._renderer.render(this._scene, this._camera);
        this._controls?.update();
        this._skydome?.update(time, this._camera);
        this._axes?.render(this._scene, this._camera);
    }

    add(threeJsObject) {
        this._world.add(threeJsObject);
    }

    remove(view) {
        view.dispose?.();
        this._world.remove(view);
    }

    #calculateCenter(boundingBox) {
        const size = new Vector3();
        let center = new Vector3();
        boundingBox.getSize(size);
        boundingBox.getCenter(center);
        return { center, size };
    }

    frameSceneOn(anObject, options) {
        const boundingBox = anObject.boundingBox;
        const { center, size } = this.#calculateCenter(boundingBox);

        // distance so that bounding box is always in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const verticalFieldOfView = Math.PI  * this._camera.fov / 180;
        let distance = maxDim / Math.tan(verticalFieldOfView / 2);
        distance = Math.max(distance * options.padding, options.minDistance);

        const direction = options.viewDirection.clone().normalize();
        this._camera.position
            .set(center.x, center.y + options.translationY, center.z)
            .addScaledVector(new Vector3(direction.x, direction.y, direction.z), distance);
        this._camera.near = distance / 100;
        this._camera.far = distance * 10;
        this._camera.updateProjectionMatrix();

        this._controls?.target.copy(center);
        this._controls?.update();
    }

    provideAxesAround(anObject, options) {
        if (this._axes)
            this.remove(this._axes);

        const boundingBox = anObject.boundingBox;
        this._axes = Axes.from(boundingBox, options.divisions)
            .withLayout(options.layoutType, options.positiveXZ)
            .withAnnotations(this._viewport.canvasWrapper, options.layoutType, options.axisLabels)
            .withSettings({
                frame: options.frame,
                annotations: options.annotations,
                xyPlane: options.xyPlane,
                xzPlane: options.xzPlane,
                yzPlane: options.yzPlane,
                tickLabels: options.tickLabels
            });

        if (options.layoutType === Axes.Type.MATLAB) // center the MatLab axes around the object to be displayed
            this._axes.frameTo(boundingBox, options.bottomAlign);
        this._axes.onWindowResize();
        this._world.add(this._axes);
        return this._axes;
    }
}
