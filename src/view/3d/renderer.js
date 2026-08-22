import { WebGLRenderer, DirectionalLight, PCFShadowMap, AmbientLight } from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer";
import { Renderer } from "../renderer.js"
import { Axes } from "./composite/backgrounds.js";
import { ThreeJsCamera } from "./camera.js";
import { ThreeJsScene } from "./scene.js";

export class Lighting {
    constructor(scene, {
        enabled = true,
        shadows = false
    } = {}) {
        if (enabled)
            this.#initLights(scene, shadows);
    }

    #initLights(scene, shadowsEnabled) {
        const directionalLight = new DirectionalLight(0xffffff, shadowsEnabled ? 5 : 1);
        directionalLight.position.set(2, 5, 2);
        scene.addLight(directionalLight);
        scene.addLight(new AmbientLight(0xffffff, 0.8));

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
}

export class ThreeJsRenderer extends Renderer {
    constructor(options) {
        super();
        this._options = options;
        this._scene = new ThreeJsScene(options.camera.position, options.scene);
        this._axes = null;

        // The below are set when attach(viewport) is called.
        this._camera = null;
        this._renderer = null;
        this._labelRenderer = null;
        this._controls = null;
    }

    set autoRotate(autoRotate) { this._camera.autoRotate = autoRotate; }

    attach(viewport) {
        this._renderer = new WebGLRenderer({
            alpha: true,
            antialias: true,
            canvas: viewport.canvas
        });
        if (this._options.lighting.shadows) {
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = PCFShadowMap;
        }

        this.#createLabelRenderer(viewport);
        this._camera = new ThreeJsCamera(viewport, this._options.camera)
        const _ = new Lighting(this._scene, this._options.lighting);

        this.resize();
        window.addEventListener("resize", () => this.resize());
        // console.log({
        //     wrapper: viewport.canvasWrapper.getBoundingClientRect(),
        //     canvas: viewport.canvas.getBoundingClientRect(),
        //     labels: this._labelRenderer.domElement.getBoundingClientRect()
        // });
        // console.log(
        //     getComputedStyle(this._labelRenderer.domElement).top,
        //     getComputedStyle(this._labelRenderer.domElement).left,
        //     getComputedStyle(this._labelRenderer.domElement).transform
        // );
    }

    #createLabelRenderer(viewport) {
        this._labelRenderer = new CSS2DRenderer();
        this._labelRenderer.setSize(viewport.width, viewport.height, false);

        Object.assign(this._labelRenderer.domElement.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            margin: "0",
            padding: "0",
            display: "block",
            pointerEvents: "none",
            zIndex: "5"
        });

        viewport.canvasWrapper.appendChild(this._labelRenderer.domElement);
    }

    resize() {
        const canvas = this._renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        if (!width || !height)
            return;

        const pixelRatio = Math.min(window.devicePixelRatio, 2);

        this._renderer.setPixelRatio(pixelRatio);
        this._renderer.setSize(width, height, false);
        this._labelRenderer.setSize(width, height, false);
        this._camera.onResize(width, height);
    }

    add(object3D) {
        this._scene.addToWorld(object3D);
    }

    render(time) {
        this._renderer.render(this._scene.scene, this._camera.camera);
        this._labelRenderer.render(this._scene.scene, this._camera.camera);
        this._skydome?.update(time, this._camera.camera);
        this._camera.update();
    }

    remove(view) {
        view.dispose?.();
        this._world.remove(view);
    }

    frameSceneOn(anObject, options) {
        this._camera.frameSceneOn(anObject, options);
    }

    provideAxesAround(anObject, options) {
        if (this._axes)
            this.remove(this._axes);

        const boundingBox = anObject.boundingBox;
        this._axes = Axes.from(boundingBox, options.divisions)
            .withLayout(options.layoutType, options.positiveXZ)
            .withAnnotations(options.layoutType, options.axisLabels)
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
        this._world.add(this._axes);
        return this._axes;
    }
}
