import {
    Box3, Vector3, PlaneGeometry, Mesh, MeshStandardMaterial, DoubleSide,
    TimestampQuery
} from "three";
import { Renderable3D } from "../../renderer.js";
import { Arrow } from "../primitives/primitives.js";
import { DifferentialFrame } from "../../../model/math/numerics/diffgeometry.js";

export class TangentFrameView extends Renderable3D {
    /**
     * @param {{
     *   showAxes?: boolean
     *   showPrincipals?: boolean
     *   wireframe?: boolean
     *   scale?: number
     *   opacity?: number
     *   color?: number
     *   visible?: boolean
     * }} options 
     */
    constructor({
        showAxes = true,
        showPrincipals = false,
        wireframe = false,
        scale = 0.7,
        opacity = 0.5,
        color = 0x8888ff,
        visible = true,
    } = {}) {
        super();
        this.visible = visible;
        this._showAxes = showAxes;
        this._showPrincipals = showPrincipals;
        this._scaleFactor = scale;

        // reusable temps to avoid per-frame allocations
        this._tmpPos = new Vector3();
        this._tmpNormal = new Vector3();
        this._tmpD1 = new Vector3();
        this._tmpD2 = new Vector3();
        this._tmpN = new Vector3();

        const arrowOpts = (/** @type {number} */ color) => ({
            color,
            size: 0.12 * this._scaleFactor,
            opacity: 1,
            // identity map so exact length = |vector| is rendered
            magnitudeMap: (/** @type {number} */ mag) => mag
        });

        this._axes = {
            uArrow: new Arrow(arrowOpts(0xff0000)),
            vArrow: new Arrow(arrowOpts(0x00ff00)),
            normalArrow: new Arrow(arrowOpts(0x00aaff))
        };

        this._principals = {
            k1Arrow: new Arrow(arrowOpts(0xffaa00)),
            k2Arrow: new Arrow(arrowOpts(0xaa00ff))
        };

        this._tangentPlane = new Mesh(
            new PlaneGeometry(1, 1, 10, 10),
            new MeshStandardMaterial({
                color,
                side: DoubleSide,
                transparent: true,
                depthTest: true,
                depthWrite: true,
                opacity: opacity,
                wireframe: wireframe
            })
        );

        this.add(
            this._axes.uArrow, this._axes.vArrow, this._axes.normalArrow,
            this._tangentPlane,
            this._principals.k1Arrow,
            this._principals.k2Arrow
        );

        this._applyVisibility();
    }

    /** @param {DifferentialFrame} frame */
    canBindTo(frame) {
        if (!frame || !frame.position || !frame.normal || !frame.d1 || !frame.d2)
            throw new Error("TangentFrameView can only bind to a DifferentialFrame with position, normal, d1, d2.");
        return true;
    }

    /**
     * Pure view: synchronizes purely from the supplied DifferentialFrame.
     * The frame is expected to come from DifferentialGeometry via DifferentialSurface.frameAt()
     * or DifferentialGeometry.differentialFrame().
     * @param {DifferentialFrame} frame
     */
    synchronizeWith(frame) {
        if (!frame || !frame.position) return;

        const scale = this._scaleFactor;
        const half = scale * 0.5;

        // keep arrow thickness in sync with scale (preserves old visual proportion)
        const arrowSize = 0.12 * scale;
        for (const a of [...Object.values(this._axes), ...Object.values(this._principals)]) {
            // Arrow stores size via _size / _shaftRadius etc — update via internals
            // cheapest: patch the sizing fields directly
            a._size = arrowSize;
            a._shaftRadius = 0.3 * arrowSize;
            a._headRadius = 0.75 * arrowSize;
            a._headLength = arrowSize;
        }
        
        const pos = this._tmpPos.set(frame.position.x, frame.position.y, frame.position.z);

        // axes — principal directions d1,d2 + normal (pure view: d1/d2 come directly from frame)
        this._tmpD1.set(frame.d1.x, frame.d1.y, frame.d1.z).multiplyScalar(half);
        this._tmpD2.set(frame.d2.x, frame.d2.y, frame.d2.z).multiplyScalar(half);
        this._tmpN.set(frame.normal.x, frame.normal.y, frame.normal.z).multiplyScalar(half);

        this._axes.uArrow.setVector(pos, this._tmpD1);
        this._axes.vArrow.setVector(pos, this._tmpD2);
        this._axes.normalArrow.setVector(pos, this._tmpN);
        this._principals.k1Arrow.setVector(pos, this._tmpD1);
        this._principals.k2Arrow.setVector(pos, this._tmpD2);

        // tangent plane at position, oriented with normal
        this._tangentPlane.position.copy(pos);
        this._tmpNormal.set(frame.normal.x, frame.normal.y, frame.normal.z);
        // guard zero normal (degenerate frame)
        if (this._tmpNormal.lengthSq() > 1e-12) {
            this._tangentPlane.lookAt(pos.clone().add(this._tmpNormal));
        }
        this._tangentPlane.scale.set(scale, scale, 1);

        this._applyVisibility();
    }

    _applyVisibility() {
        const showAxes = this._showAxes;
        const showPrincipals = this._showPrincipals;
        for (const a of Object.values(this._axes)) a.visible = showAxes;
        for (const a of Object.values(this._principals)) a.visible = showPrincipals;
    }

    dispose() {
        for (const a of Object.values(this._axes)) a.dispose?.();
        for (const a of Object.values(this._principals)) a.dispose?.();
        this._axes = null;
        this._principals = null;

        if (this._tangentPlane) {
            if (this._tangentPlane.geometry) this._tangentPlane.geometry.dispose();
            if (this._tangentPlane.material) this._tangentPlane.material.dispose();
            this.remove(this._tangentPlane);
            this._tangentPlane = null;
        }
        this.clear();
    }

    get boundingBox() {
        return new Box3().setFromObject(this).clone();
    }

    /** @param {boolean} visibilty */
    set showAxes(visibilty) { this._showAxes = visibilty; this._applyVisibility(); }
    /** @param {boolean} visibilty */
    set showPrincipals(visibilty) { this._showPrincipals = visibilty; this._applyVisibility(); }
}
