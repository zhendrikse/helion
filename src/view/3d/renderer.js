import {
    Scene, PerspectiveCamera, WebGLRenderer, DirectionalLight, Group, Fog, Color,
    PCFShadowMap, AmbientLight, Vector3
} from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Renderer } from "../renderer.js"
import { Vec3 } from "../../model/math/math.js";
import { Axes, SkyDome } from "./composite/backgrounds.js";
import {Binding} from "../../core/helion.js";

export class ThreeJsRenderOptions {
    constructor({
        background = ThreeJsRenderer.Background.TRANSPARENT,
        backgroundColor = 0x0088ff,
        scale = 1,
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
        this.scale = scale;
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

        this._autoRotate = false;
        this._autoRotateTheta = Math.PI / 2;
        this._autoRotatePhi = 0;

        this._scene = new Scene();
        this._world = new Group();
        this._skydome = null;
        this._scene.add(this._world);
        this._axes = null;
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
            canvas,
            alpha: options.background === ThreeJsRenderer.Background.TRANSPARENT
        });

        if (options.shadowsEnabled) {
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = PCFShadowMap;
        }

        this._world.scale.setScalar(options.scale);

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

    render(time) {
        this._renderer.render(this._scene, this._camera);
        this._controls?.update();
        this._skydome?.update(time, this._camera);
        this._axes?.render(this._scene, this._camera);

        if (this._autoRotate)
            this._doAutoRotate(this._camera.position.length());
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

    frameSceneOn(anObject, {
        padding = 1.2,
        translationY = 0,
        minDistance = 2,
        viewDirection = new Vector3(1, 1, 1)
    } = {}) {
        const boundingBox = anObject.boundingBox;
        const { center, size } = this.#calculateCenter(boundingBox);

        // distance so that bounding box is always in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const verticalFieldOfView = Math.PI  * this._camera.fov / 180;
        let distance = maxDim / Math.tan(verticalFieldOfView / 2);
        distance = Math.max(distance * padding, minDistance);

        const direction = viewDirection.clone().normalize();
        this._camera.position
            .copy(new Vector3(center.x, center.y + translationY, center.z))
            .addScaledVector(direction, distance);
        this._camera.near = distance / 100;
        this._camera.far = distance * 10;
        this._camera.updateProjectionMatrix();

        this._controls.target.copy(center);
        this._controls.update();
    }

    provideAxesAround(anObject, {
        layoutType = Axes.Type.MATLAB,
        divisions = 10,
        frame = true,
        annotations = true,
        tickLabels = true,
        xyPlane = true,
        xzPlane = true,
        yzPlane = true,
        axisLabels = ["X", "Y", "Z"],
        positiveXZ = false,
        bottomAlign = true
    } = {}) {
        if (this._axes)
            this.remove(this._axes);

        const boundingBox = anObject.boundingBox;
        const canvasContainer = this._canvasWrapperDiv.htmlDiv
        this._axes = Axes.from(boundingBox, divisions)
            .withLayout(layoutType, positiveXZ)
            .withAnnotations(canvasContainer, layoutType, axisLabels)
            .withSettings({ frame, annotations, xyPlane, xzPlane, yzPlane, tickLabels });

        if (layoutType === Axes.Type.MATLAB) // center the MatLab axes around the object to be displayed
            this._axes.frameTo(boundingBox, bottomAlign);
        this._axes.onWindowResize();
        this._world.add(this._axes);
        return this._axes;
    }

    set autoRotate(autoRotate) { this._autoRotate = autoRotate; }
}
