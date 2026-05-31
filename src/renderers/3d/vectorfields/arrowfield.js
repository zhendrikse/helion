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

        this._scaleFactor = scaleFactor;
        this._matrixMagnitudeMap = magnitudeMap;
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

        // reusable temp objects (CRUCIAL)
        this._matrix = new Matrix4();
        this._q = new Quaternion();
        this._dir = new Vector3();
        this._shape = new Vector3();

        this._shaftOffset = new Vector3();
        this._headOffset = new Vector3();
    }

    attachTo(vectorField) {
        if (!vectorField?.vectorAt)
            throw new Error("vectorField must implement vectorAt(position)");

        this._vectorField = vectorField;
    }

    #computeSizes(length) {
        const shaftRadius = length * this._shaftWidth;
        const headLength = shaftRadius * this._headLength;
        const shaftLength = length - headLength;

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

            if (mag < 1e-9) {
                this._shaftMesh.setMatrixAt(i, new Matrix4().makeScale(0,0,0));
                this._headMesh.setMatrixAt(i, new Matrix4().makeScale(0,0,0));
                continue;
            }

            // Direction
            this._dir.copy(vec).normalize();
            this._q.setFromUnitVectors(UP, this._dir);

            const visualMag = this._matrixMagnitudeMap(mag) * this._scaleFactor;
            const { shaftRadius, shaftLength, headLength } = this.#computeSizes(visualMag);

            // Shaft
            this._shaftOffset.set(0, shaftLength * 0.5, 0).applyQuaternion(this._q).add(pos);
            this._shape.set(shaftRadius, shaftLength, shaftRadius);
            this._matrix.compose(this._shaftOffset, this._q, this._shape);
            this._shaftMesh.setMatrixAt(i, this._matrix);

            // Head
            this._headOffset.set(0, shaftLength + headLength * 0.5, 0).applyQuaternion(this._q).add(pos);
            this._shape.set(shaftRadius * this._headWidth, headLength, shaftRadius * this._headWidth);
            this._matrix.compose(this._headOffset, this._q, this._shape);
            this._headMesh.setMatrixAt(i, this._matrix);
            
            this.#setColor(i, this._dir, mag);
        }

        this._shaftMesh.instanceMatrix.needsUpdate = true;
        this._headMesh.instanceMatrix.needsUpdate = true;
        this._shaftMesh.instanceColor.needsUpdate = true;
        this._headMesh.instanceColor.needsUpdate = true;    }

}
