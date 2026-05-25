import {
    Group, Vector3,
    MeshStandardMaterial, Mesh, BufferGeometry, LineBasicMaterial, Line,
    BoxGeometry, Color, RepeatWrapping, DoubleSide,
    TextureLoader, Vector2, PlaneGeometry, EdgesGeometry, LineSegments
} from "three";

import woodWicketColorUrl from '../../../textures/Wood_Wicker_011_color.png';
import woodWicketNormalUrl from '../../../textures/Wood_Wicker_011_normal.png';
import woodWicketRoughnessUrl from '../../../textures/Wood_Wicker_011_roughness.png';
import pavingColorUrl from '../../../textures/paving_color.jpg';
import pavingRoughnessUrl from '../../../textures/paving_roughness.jpg';
import pavingNormalUrl from '../../../textures/paving_normal.jpg';

/*******************************************
 * Floor, Grid, Ceiling, Aquarium          *
 *******************************************/

class Grid extends Group {
    constructor({
                    size = 1,
                    granularity = 20,
                    y = 0,
                    color = 0x00ff00
                } = {}) {
        super();

        const step = (size * 2) / granularity;
        const material = new LineBasicMaterial({ color: color });
        for (let i = 0; i <= granularity; i++) {
            const x = -size + i * step;
            this.add(new Line(this.#verticalLine(x, y, size), material));
            this.add(new Line(this.#horizontalLine(x, y, size), material));
        }
    }

    #verticalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(x, y, -size), new Vector3(x, y, size)]);
    }

    #horizontalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(-size, y, x), new Vector3(size, y, x)]);
    }
}

export class Floor extends Group {
    static Type = Object.freeze({
        PLAIN: "PLAIN",
        GRID: "Grid",
        PAVING: "Paving",
        WOOD_WICKER: "WoodWicker"  // https://3dtextures.me/2024/06/22/wood-wicker-011/
    });
    constructor({
                    type= Floor.Type.PLAIN,
                    position = new Vector3(),
                    planeSizeXy = new Vector2(2, 2),
                    granularity = 1,
                    color = 0x00ff00,
                    opacity = null,
                    receiveShadow = true
                } = {}) {
        super();
        const planeGeometry = new PlaneGeometry(planeSizeXy.x, planeSizeXy.y);
        const planeMaterial = new MeshStandardMaterial({
            normalScale: planeSizeXy,
            roughness: 1,
            transparent: opacity !== null,
            opacity: opacity ? opacity : 1,
            side: DoubleSide
            //occlusionMap: textureAmbientOcclusion,
            //alphaMap: textureOpacity,
            //aoMap: textureAmbientOcclusion,
            //aoMapIntensity: 0,
        });
        this._mesh = new Mesh(planeGeometry, planeMaterial);
        this._mesh.receiveShadow = receiveShadow;
        this._mesh.rotation.x = -Math.PI / 2;

        this.position.copy(position);
        this.add(this._mesh);

        const loader = new TextureLoader();
        switch (type) {
            case Floor.Type.PLAIN:
                this._mesh.material.color.set(color);
                break;
            case Floor.Type.GRID:
                this.add(new Grid({
                    color,
                    size: planeSizeXy.x * .5, // TODO enable rectangular formats
                    granularity: granularity
                }));
                break;
            case Floor.Type.PAVING:
                this._mesh.material.map = this._loadTexture(loader, pavingColorUrl, granularity);
                this._mesh.material.roughnessMap = this._loadTexture(loader, pavingRoughnessUrl, granularity);
                this._mesh.material.normalMap = this._loadTexture(loader, pavingNormalUrl, granularity);
                break;
            case Floor.Type.WOOD_WICKER:
                this._mesh.material.map = this._loadTexture(loader, woodWicketColorUrl, granularity);
                this._mesh.material.roughnessMap = this._loadTexture(loader, woodWicketRoughnessUrl, granularity);
                this._mesh.material.normalMap = this._loadTexture(loader, woodWicketNormalUrl, granularity);
                break;
        }
    }

    _loadTexture(loader, url, granularity) {
        const texture = loader.load(url);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(granularity, granularity);
        return texture;
    }

    get level() { return this.position.y; }
}

export class Ceiling extends Mesh {
    constructor({
                    position = new Vector3(0, 0, 0),
                    size = 12,
                    thickness = 0.75,
                    color = 0x8a8a8a
                } = {}) {
        const ceilingGeometry = new BoxGeometry(size, size, thickness);
        const ceilingMaterial = new MeshStandardMaterial({
            color: color,
            metalness: 0.05,
            roughness: 0.95,
            side: DoubleSide
        });
        ceilingMaterial.bumpScale = 0.05;
        super(ceilingGeometry, ceilingMaterial);
        this.rotation.x = Math.PI / 2;
        this.position.copy(position);
    }
}

export class Aquarium extends Mesh {
    constructor({
                    position = new Vector3(0, 0, 0),
                    size = new Vector3(1, 1, 1),
                    opacity = 0.35,
                    contentColor = new Color(.1, .3, .78),
                    frameColor = 0xaa9900,
                    frameWidth = 1
                } = {}) {
        const geometry = new BoxGeometry(size.x, size.y, size.z);
        const material = new MeshStandardMaterial({
            color: contentColor,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            depthTest: true,
        });

        super(geometry, material);
        this.position.copy(position);
        this._size = size;

        // --- Edges ---
        const edges = new EdgesGeometry(geometry);
        const lineMaterial = new LineBasicMaterial({
            color: frameColor,
            linewidth: frameWidth,
            depthTest: true
        });

        const wireframe = new LineSegments(edges, lineMaterial);
        this.add(wireframe); // make it an integral part of the cube
    }

    get size() { return this._size;}
}

/*******************************************
 * Floor, Grid, Ceiling, Aquarium          *
 *******************************************/

export class AxesParameters {
    constructor({
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
        this.layoutType = layoutType;
        this.divisions = divisions;
        this.frame = frame;
        this.annotations = annotations;
        this.xyPlane = xyPlane;
        this.xzPlane = xzPlane;
        this.yzPlane = yzPlane;
        this.axisLabels = axisLabels;
        this.tickLabels = tickLabels;
        this.positiveXZ = positiveXZ;
    }
}

export class Axes extends Group {
    static Type = Object.freeze({
        CLASSICAL: "classical",
        MATLAB: "MatLab"
    });

    static toCartesian(radius, theta, phi) {
        return new Vector3(
            radius * Math.sin(theta) * Math.cos(phi),
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(theta)
        );
    }

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
                     frame = true,
                     annotations = true,
                     xyPlane = true,
                     xzPlane = true,
                     yzPlane = true,
                     tickLabels = true } = {}) {
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

    withAnnotations(container, type, axisLabels = ["X", "Y", "Z"]) {
        this._annotations?.dispose?.();
        this._annotations = (type === Axes.Type.MATLAB) ?
            new MatlabAnnotations(container, this._size, this._divisions, axisLabels) :
            new ClassicalAnnotations(container, this._size, this._divisions, axisLabels);
        this.add(this._annotations);
        return this;
    }

    onWindowResize = () => this._annotations?.onWindowResize()
    render = (scene, camera) => this._annotations?.render(scene, camera);

    shiftBy(translationVector) {
        this._annotations?.shiftBy(translationVector);
        this._layout?.shiftBy(translationVector);
    }

    boundingBox() {
        const axesBoundingBox = new Box3();
        axesBoundingBox.setFromObject(this);
        return axesBoundingBox;
    }
}

class AxesAnnotation extends Group {
    constructor(container) {
        super();
        this._container = container;
        this._renderer = new CSS2DRenderer();
        this._renderer.domElement.style.position = "absolute";
        this._renderer.domElement.style.top = 0;
        this._renderer.domElement.style.left = 0;
        this._renderer.domElement.style.width = "100%";
        this._renderer.domElement.style.height = "100%";
        this._renderer.domElement.style.pointerEvents = "none"; // do not process mouse events
        this._renderer.domElement.style.zIndex = "5"; // on top of canvas

        this._tickLabels = [];
        this._axesLabels = [];

        this._container.appendChild(this._renderer.domElement);
        this.onWindowResize();
    }

    onWindowResize() {
        this._renderer.setSize(this._container.clientWidth, this._container.clientHeight);
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

    render(scene, camera) {
        this._renderer.render(scene, camera);
    }
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
    constructor(container, size, divisions, axisLabels, positiveXZ = true) {
        super(container);

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
    constructor(container, size, divisions, axisLabels) {
        super(container);

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

// export class AxesController {
//     constructor({
//                     parentGroup,
//                     canvasContainer,
//                     axesParameters,
//                     scene
//                 }) {
//         this._parentGroup = parentGroup;
//         this._canvasContainer = canvasContainer;
//         this._axesParameters = axesParameters;
//         this._scene = scene;
//         this._axes = null;
//     }
//
//     createFromBoundingBox(boundingBox, bottomAlign = true) {
//         if (this._axes) {
//             this._axes.dispose();
//             this._parentGroup.remove(this._axes);
//         }
//
//         const { layoutType, divisions, axisLabels, tickLabels } = this._axesParameters;
//         const { frame, annotations, xyPlane, xzPlane, yzPlane, positiveXZ } = this._axesParameters;
//
//         this._axes = Axes.from(boundingBox, divisions)
//             .withLayout(layoutType, positiveXZ)
//             .withAnnotations(this._canvasContainer, layoutType, axisLabels)
//             .withSettings(
//                 { frame, annotations, xyPlane, xzPlane, yzPlane, tickLabels });
//
//         if (layoutType === Axes.Type.MATLAB) // center the MatLab axes around the object to be displayed
//             this._axes.frameTo(boundingBox, bottomAlign);
//         this._axes.onWindowResize();
//         this._parentGroup.add(this._axes);
//     }
//
//     updateSettings() {
//         if (!this._axes) return;
//
//         const { frame, annotations, xyPlane, xzPlane, yzPlane, tickLabels } = this._axesParameters;
//         this._axes.withSettings(
//             { frame, annotations, xyPlane, xzPlane, yzPlane, tickLabels });
//     }
//
//     render = (camera) => this._axes?.render(this._scene, camera);
//     resize = () => this._axes?.onWindowResize();
//
//     dispose() {
//         if (!this._axes) return;
//         this._axes.dispose();
//         this._parentGroup.remove(this._axes);
//         this._axes = null;
//     }
// }
