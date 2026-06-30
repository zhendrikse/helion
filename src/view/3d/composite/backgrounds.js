import {
    Group, ShaderMaterial, AdditiveBlending, Points, PointsMaterial, Mesh, PlaneGeometry,
    BufferAttribute, Vector3, BufferGeometry, Box3, AxesHelper, GridHelper, MeshPhongMaterial,
    DoubleSide
} from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer";

export class SkyDome extends Group {
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

export class Axes extends Group {
    static Type = Object.freeze({
        CLASSICAL: "classical",
        MATLAB: "MatLab"
    });

    static from(boundingBox, divisions, padding = 1.1) {
        const sizeVec = boundingBox.getSize(new Vector3());
        const maxSize = padding * Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        return new Axes(maxSize, divisions);
    }

    constructor(size, divisions) {
        super();
        this._size = size;
        this._divisions = divisions;
        this._layout = null;
        this._annotations = null;
    }

    #disposeLayout() {
        if (this._layout) {
            this._layout.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            this.remove(this._layout);
            this._layout = null;
        }
    }

    #disposeAnnotations() {
        if (this._annotations) {
            this._annotations._tickLabels.forEach(label => this._annotations.remove(label));
            this._annotations._axesLabels.forEach(label => this._annotations.remove(label));
            if (this._annotations._renderer?.domElement?.parentNode)
                this._annotations._renderer.domElement.parentNode.removeChild(this._annotations._renderer.domElement);
            this._annotations = null;
        }
    }

    dispose() {
        this.#disposeLayout();
        this.#disposeAnnotations();
        this.clear();
    }

    withSettings({
         frame = this._layout.frame.visible,
         annotations = this._annotations.visible,
         xyPlane = this._layout.xy.visible,
         xzPlane = this._layout.xz.visible,
         yzPlane = this._layout.yz.visible,
         tickLabels = this._annotations.tickLabels[0].visible
    } = {}) {
        this._layout.frame.visible = frame;
        this._annotations.visible = annotations;
        this._layout.xy.visible = xyPlane;
        this._layout.xz.visible = xzPlane;
        this._layout.yz.visible = yzPlane;
        this._annotations.tickLabels.forEach(label => label.visible = tickLabels);
        return this;
    }

    withLayout(type, positiveXZ) {
        this._layout?.dispose?.();
        this._layout = type === Axes.Type.MATLAB ?
            new MatlabAxesLayout(this._size, this._divisions) :
            new ClassicalAxesLayout(this._size, this._divisions, positiveXZ);
        this.add(this._layout);

        return this;
    }

    frameTo(boundingBox, bottomAlign = true) {
        this.updateMatrixWorld(true);
        const scaledBox = new Box3().setFromObject(this);
        let center = new Vector3();
        boundingBox.getCenter(center);
        // this.position.copy(center);
        const deltaY = boundingBox.min.y - scaledBox.min.y;
        this.position.y = bottomAlign ? this.position.y + deltaY : this.position.y;
        this.position.x = center.x;
        this.position.z = center.z;
    }

    withAnnotations(type, axisLabels = ["X", "Y", "Z"]) {
        this._annotations?.dispose?.();
        this._annotations = (type === Axes.Type.MATLAB) ?
            new MatlabAnnotations(this._size, this._divisions, axisLabels) :
            new ClassicalAnnotations(this._size, this._divisions, axisLabels);
        this.add(this._annotations);
        return this;
    }

    onWindowResize = () => this._annotations?.onWindowResize()

    boundingBox() {
        const axesBoundingBox = new Box3();
        axesBoundingBox.setFromObject(this);
        return axesBoundingBox;
    }
}

class AxesAnnotation extends Group {
    constructor() {
        super();
        this._tickLabels = [];
        this._axesLabels = [];
    }

    createLabel(text, pos, color = "yellow", fontSize = "16px") {
        const div = document.createElement("div");
        div.textContent = text;
        div.style.color = color;
        div.style.fontSize = fontSize;

        const label = new CSS2DObject(div);
        label.position.copy(pos);
        return label;
    }

    get tickLabels() { return this._tickLabels; }
    get axesLabels() { return this._axesLabels; }
}

class AxesLayout extends Group {
    constructor(size, divisions) {
        super();
        this._size = size;
        this._divisions = divisions;
        this._frame = null; // to be created in concrete subclasses
        this._xy = new Group();
        this._xz = new Group();
        this._yz = new Group();
        this.add(this._xy, this._xz, this._yz);
    }

    _createFrame(position, size) {
        const eps = 0.025;
        this._frame = new AxesHelper(size);
        this._frame.position.copy(position.add(new Vector3(eps, eps, eps)));
        this.add(this._frame);
    }

    _createPlane(color, rotate, gridPos, planePos) {
        const grid = new GridHelper(this._size, this._divisions, 0x333333, 0x333333);
        const plane = new Mesh(
            new PlaneGeometry(this._size, this._size),
            new MeshPhongMaterial({
                color,
                transparent: true,
                opacity: 0.1,
                depthWrite: false,
                side: DoubleSide
            })
        );

        grid.position.copy(new Vector3(gridPos[0], gridPos[1], gridPos[2]).multiplyScalar(.5 * this._size));
        plane.position.copy(new Vector3(planePos[0], planePos[1], planePos[2]).multiplyScalar(.5 * this._size));

        rotate(grid);
        rotate(plane);

        return [grid, plane];
    }

    get size() { return this._size; }
    get frame() { return this._frame; }
    get xy() { return this._xy; }
    get xz() { return this._xz; }
    get yz() { return this._yz; }
}

class ClassicalAxesLayout extends AxesLayout {
    constructor(size, divisions, positiveXZ) {
        super(size, divisions);

        this._createFrame(new Vector3(0, 0, 0), 0.5 * size);
        const [xyGrid, xzPlane] = this._createPlane(0x4444ff, v => v.rotateX(Math.PI / 2), [0, 0, 0], [positiveXZ ? 1 : 0, 0, 0]);
        const [xzGrid, yzPlane] = this._createPlane(0x44ff44, v => v.rotateY(Math.PI / 2), [positiveXZ ? 1 : 0, 0, 0], [0, 0, 0]);
        const [yzGrid, xyPlane] = this._createPlane(0xff4444, v => v.rotateZ(Math.PI / 2), [0, 0, 0], [0, 0, 0]);
        this._xy.add(xyPlane, xyGrid);
        this._xz.add(xzPlane, xzGrid);
        this._yz.add(yzPlane, yzGrid);
    }
}

class MatlabAxesLayout extends AxesLayout {
    constructor(size, divisions) {
        super(size, divisions);

        this._createFrame(new Vector3(-0.5 * size, 0, -0.5 * size), size);
        const [xyGrid, xzPlane] = this._createPlane(0x4444ff, v => v.rotateX(Math.PI / 2), [0, 1, -1], [0, 0, 0]);
        const [xzGrid, yzPlane] = this._createPlane(0x44ff44, v => v.rotateY(Math.PI / 2), [0, 0, 0], [-1, 1, 0]);
        const [yzGrid, xyPlane] = this._createPlane(0xff4444, v => v.rotateZ(Math.PI / 2), [-1, 1, 0], [0, 1, -1]);
        this._xy.add(xyPlane, xyGrid);
        this._xz.add(xzPlane, xzGrid);
        this._yz.add(yzPlane, yzGrid);
    }
}

class ClassicalAnnotations extends AxesAnnotation {
    constructor(size, divisions, axisLabels, positiveXZ = true) {
        super();

        const step = size / divisions;
        for (let v = -size * .5; v <= size * .5; v += step)
            this._tickLabels.push(
                this.createLabel(v.toFixed(1), new Vector3(v, 0, 0.525 * size)),
                this.createLabel(v.toFixed(1), new Vector3(0.525 * size, 0, v)));
        for (let v = 0; v <= size * .5; v += step)
            this._tickLabels.push(this.createLabel(v.toFixed(1), new Vector3(0, v, 0)));

        this._axesLabels.push(
            this.createLabel(axisLabels[0], new Vector3(size * (positiveXZ ? 1.075 : .575), 0, 0), "red", "20px"),
            this.createLabel(axisLabels[1], new Vector3(0, 0.575 * size, 0), "green", "20px"),
            this.createLabel(axisLabels[2], new Vector3(0, 0, 0.575 * size), "blue", "20px"));

        this._tickLabels.forEach(label => this.add(label));
        this._axesLabels.forEach(label => this.add(label));
    }
}

class MatlabAnnotations extends AxesAnnotation {
    constructor(size, divisions, axisLabels) {
        super();

        const step = (2 * size) / divisions;
        for (let v = 0; v <= size; v += step)
            this._tickLabels.push(
                this.createLabel(v.toFixed(1), new Vector3(-0.525 * size, v, 0.5 * size)),
                this.createLabel(v.toFixed(1), new Vector3(0.525 * size, 0, v - 0.5 * size)));

        for (let v = step; v < size; v += step)
            this._tickLabels.push(
                this.createLabel(v.toFixed(1), new Vector3(v - 0.5 * size, 0, 0.525 * size)));

        this._axesLabels.push(
            this.createLabel(axisLabels[0], new Vector3(0.65 * size, 0, -0.5 * size), "red", "20px"),
            this.createLabel(axisLabels[1], new Vector3(-0.5 * size, 1.1 * size, -0.5 * size), "green", "20px"),
            this.createLabel(axisLabels[2], new Vector3(-0.5 * size, 0, 0.65 * size), "blue", "20px"));

        this._tickLabels.forEach(label => this.add(label));
        this._axesLabels.forEach(label => this.add(label));
    }
}