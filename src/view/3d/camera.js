import { PerspectiveCamera, OrthographicCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Vec3 } from "../../model/math/math.js";

export class ThreeJsCamera {
    constructor(viewport, {
        position = new Vec3(3, 3, 3),
        target = new Vec3(0, 0, 0),
        fieldOfView = 50,
        orthographic = false,
        controls = true,
        autoRotate = false
    } = {}) {
        this._viewport = viewport;
        this._orthographic = orthographic;
        this._fieldOfView = fieldOfView;
        this._camera = this._createCamera(viewport, position, fieldOfView, orthographic);
        this._controls = null;
        this._autoRotate = autoRotate;
        this._autoRotateTheta = Math.PI / 2;
        this._autoRotatePhi = 0;

        if (controls) {
            this._controls = new OrbitControls(this._camera, viewport.canvas);
            this._controls.target.copy(target);
            this._applyControlLimits();
        }
    }

    _createCamera(viewport, position, fieldOfView, orthographic) {
        const aspect = viewport.width / viewport.height;
        const frustum = 4;
        const camera = orthographic ?
            new OrthographicCamera(
                -frustum * aspect / 2, frustum * aspect / 2,
                frustum / 2, -frustum / 2,
                0.1, 1e6
            ) :
            new PerspectiveCamera(fieldOfView, aspect, 0.1, 1e6);

        camera.position.copy(orthographic ? new Vector3(0, 0, position.z) : position);
        return camera;
    }

    _applyControlLimits() {
        if (!this._controls) return;
        if (this._orthographic) {
            this._controls.enableRotate = false;
            this._controls.enablePan = false;
            this._controls.enableZoom = true;
        } else {
            this._controls.enableRotate = true;
            this._controls.enablePan = true;
            this._controls.enableZoom = true;
        }
    }

    set orthographic(orthographic) {
        if (this._orthographic === orthographic) return;
        this._orthographic = orthographic;
        const pos = this._camera.position.clone();
        const target = this._controls ? this._controls.target.clone() : new Vector3(0, 0, 0);
        if (this._controls) {
            this._controls.dispose();
            this._controls = null;
        }
        this._camera = this._createCamera(this._viewport, pos, this._fieldOfView, orthographic);
        this._controls = new OrbitControls(this._camera, this._viewport.canvas);
        this._controls.target.copy(target);
        this._applyControlLimits();
        this._camera.updateProjectionMatrix();
    }

    onResize(width, height) {
        if (this._camera.isOrthographicCamera) {
            const frustum = this._camera.top * 2;
            const aspect = width / height;
            this._camera.left = -frustum * aspect / 2;
            this._camera.right = frustum * aspect / 2;
            this._camera.top = frustum / 2;
            this._camera.bottom = -frustum / 2;
        } else {
            this._camera.aspect = width / height;
        }
        this._camera.updateProjectionMatrix();
    }

    update() {
        this._controls?.update();
        if (this._autoRotate)
            this._doAutoRotate();
    }

    _doAutoRotate() {
        const distance = this._camera.position.length();
        this._autoRotateTheta += -Math.PI / (7.5 * 100);
        this._autoRotatePhi += Math.PI / (7.5 * 100) * 2;
        this._camera.position.set(
            distance * Math.sin(this._autoRotateTheta) * Math.sin(this._autoRotatePhi),
            distance * Math.cos(this._autoRotateTheta),
            distance * Math.sin(this._autoRotateTheta) * Math.cos(this._autoRotatePhi) );
        this._camera.lookAt(0, 0, 0);
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

        const maxDim = Math.max(size.x, size.y, size.z);
        const direction = options.viewDirection.clone().normalize();

        if (this._camera.isOrthographicCamera) {
            const aspect = this._viewport.width / this._viewport.height;
            const frustum = maxDim * options.padding;
            this._camera.left = -frustum * aspect / 2;
            this._camera.right = frustum * aspect / 2;
            this._camera.top = frustum / 2;
            this._camera.bottom = -frustum / 2;
            this._camera.near = 0.1;
            this._camera.far = frustum * 20;
            this._camera.position
                .set(center.x, center.y + options.translationY, center.z)
                .addScaledVector(new Vector3(0, 0, 1), frustum * 2);
            this._camera.lookAt(center);
        } else {
            const verticalFieldOfView = Math.PI  * this._camera.fov / 180;
            let distance = maxDim / Math.tan(verticalFieldOfView / 2);
            distance = Math.max(distance * options.padding, options.minDistance);

            this._camera.position
                .set(center.x, center.y + options.translationY, center.z)
                .addScaledVector(new Vector3(direction.x, direction.y, direction.z), distance);
            this._camera.near = distance / 100;
            this._camera.far = distance * 10;
        }
        this._camera.updateProjectionMatrix();

        this._controls?.target.copy(center);
        this._controls?.update();
    }

    set autoRotate(trueOrFalse) { this._autoRotate = trueOrFalse; }
    get camera() { return this._camera }
}
