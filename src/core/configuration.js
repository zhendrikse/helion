import {CompoundControl, DropdownMenu, Slider} from "./controls.js";
import {ShapeOperators} from "../model/math/operators.js";
import { Range } from "../model/math/math.js";

export class ShapeConfiguration {
    constructor({
        shape = ShapeOperators.Type.DoubleSlit,
        softness = 0,
        size = 40,
        strength = 0.1,
        onChange = (event) => {}
    } = {}) {
        this.shape = shape
        this.softness = softness;
        this.size = size;
        this.strength = strength;
        this._eventListener = onChange;
    }

    set onChange(eventListener) {
        this._eventListener = eventListener;
    }

    get settings() {
        return {
            size: this.size,
            strength: this.strength,
            softness: this.softness,
            shape: this.shape
        }
    }

    controls() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ShapeOperators())
                .withValue(this.shape)
                .addEventListener("change", event => {
                    this.shape = event.target.value;
                    this._eventListener(event)
                })
            )
            .add(new Slider("💪🏻 Energy barrier")
                .withRange(new Range(-0.1, 0.1, .001))
                .withValue(this.strength)
                .addEventListener("input", event => {
                    this.strength = Number(event.target.value);
                    this._eventListener(event)
                })
            )
            .add(new Slider("📐 Size")
                .withRange(new Range(0, 50, 1))
                .withValue(this.size)
                .addEventListener("input", event => {
                    this.size = Number(event.target.value);
                    this._eventListener(event)
                })
            )
            .add(new Slider("🧸 Softness")
                .withRange(new Range(0, 20, 1))
                .withValue(this.softness)
                .addEventListener("input", event => {
                    this.softness = Number(event.target.value);
                    this._eventListener(event)
                })
            )
    }
}