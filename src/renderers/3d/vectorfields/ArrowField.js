import {
    Group, InstancedMesh, Matrix4, Quaternion, Vector3, Color, InstancedBufferAttribute, MeshStandardMaterial,
    CylinderGeometry, BoxGeometry, ConeGeometry
} from "three";

const UP = new Vector3(0, 1, 0);

const shaftGeometryRound = new CylinderGeometry(1, 1, 1, 16);
const shaftGeometrySquare = new BoxGeometry(1, 1, 1);
const headGeometryRound = new ConeGeometry(1, 1, 16);
const headGeometrySquare = new ConeGeometry(1, 1, 4);

export class ArrowField extends Group {
    constructor({
        xRange,
        yRange,
        zRange,
        scaleFactor = 1,
        round = false,

        magnitudeMap = m => Math.log(1 + m),
        colorMap = (dir, mag) => new Color().setHSL(Math.min(Math.log(1 + mag) / 5, 1), 0.7, 0.5),

        shaftWidth = 0.08,
        headWidth = 2.0,
        headLength = 4.0,
    } = {}) {
        super();

        this._xRange = xRange;
        this._yRange = yRange;
        this._zRange = zRange;

        this._scaleFactor = scaleFactor;
        this._magnitudeMap = magnitudeMap;
        this._colorMap = colorMap;

        this._shaftWidth = shaftWidth;
        this._headWidth = headWidth;
        this._headLength = headLength;

        this._vectorField = null;

        // ---- build positions
        this._positions = [];
        for (const x of xRange)
            for (const y of yRange)
                for (const z of zRange)
                    this._positions.push(new Vector3(x, y, z));

        const count = this._positions.length;

        const shaftGeometry = round ? shaftGeometryRound : shaftGeometrySquare;
        const headGeometry = round ? headGeometryRound : headGeometrySquare;
        const materialShaft = new MeshStandardMaterial();
        const materialHead = new MeshStandardMaterial();

        this._shaftMesh = new InstancedMesh(shaftGeometry, materialShaft, count);
        this._headMesh = new InstancedMesh(headGeometry, materialHead, count);
        this.add(this._shaftMesh, this._headMesh);

        // shared colors
        const colors = new Float32Array(count * 3);
        this._shaftMesh.instanceColor = new InstancedBufferAttribute(colors, 3);
        this._headMesh.instanceColor = this._shaftMesh.instanceColor;

        // temp objects
        this._m = new Matrix4();
        this._q = new Quaternion();
        this._axis = new Vector3();
        this._dir = new Vector3();
    }

    attachTo(vectorField) {
        if (!vectorField?.vectorAt)
            throw new Error("vectorField must implement vectorAt(position)");

        this._vectorField = vectorField;
    }

    #computeSizes(length) {
        const shaftRadius = length * this._shaftWidth;
        const headLength = shaftRadius * this._headLength;
        const shaftLength = Math.max(length - headLength, 1e-6);

        return { shaftRadius, shaftLength, headLength };
    }

    #setColor(index, dir, mag) {
        if (!this._colorMap) return;

        const c = this._colorMap(dir, mag);
        this._shaftMesh.instanceColor.setXYZ(index, c.r, c.g, c.b);
    }

    render() {
        const count = this._positions.length;

        for (let i = 0; i < count; i++) {
            const pos = this._positions[i];
            const vec = this._vectorField.vectorAt(pos);
            const mag = vec.length();

            if (mag < 1e-6) {
                // collapse
                this._m.makeScale(0, 0, 0);
                this._shaftMesh.setMatrixAt(i, this._m);
                this._headMesh.setMatrixAt(i, this._m);
                continue;
            }

            // ---- direction
            this._dir.copy(vec).normalize();
            this._q.setFromUnitVectors(UP, this._dir);

            const visualMag = this._magnitudeMap(mag);
            const length = visualMag * this._scaleFactor;
            const { shaftRadius, shaftLength, headLength } = this.#computeSizes(length);

            // ---- SHAFT
            this._m.compose(pos, this._q, new Vector3(shaftRadius, shaftLength, shaftRadius));

            // move shaft upward half
            this._m.premultiply(new Matrix4().makeTranslation(0, shaftLength * 0.5, 0));
            this._shaftMesh.setMatrixAt(i, this._m);

            // ---- HEAD
            this._m.compose(pos, this._q,
                new Vector3(shaftRadius * this._headWidth, headLength, shaftRadius * this._headWidth));
            this._m.premultiply(new Matrix4().makeTranslation(0, shaftLength + headLength * 0.5, 0))
            this._headMesh.setMatrixAt(i, this._m);

            // ---- COLOR
            this.#setColor(i, this._dir, mag);
        }

        this._shaftMesh.instanceMatrix.needsUpdate = true;
        this._headMesh.instanceMatrix.needsUpdate = true;
        this._shaftMesh.instanceColor.needsUpdate = true;
    }
}
