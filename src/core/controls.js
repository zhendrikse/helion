import { generateUUID } from "../model/math/math.js";

class HtmlControl {
    constructor(labelText) {
        this._buttonRow = this._createButtonRow();
        this._inputControl = null; // To be set by each concrete control / subclass
        this._targetObject = null; // To be set by each concrete control / subclass
        this._childControl = null; // Other control in this same button row
        this._simulation = null;

        //
        // <label for="anId">labelText</label><input id="anId" ... />
        //
        this._label = document.createElement("label");
        this._labelId = generateUUID();
        this._label.htmlFor = this._labelId;
        this._label.style.marginRight = "5px";
        this._label.textContent = labelText ? labelText : "";

        this._span = null;
    }

    on(targetObject) {
        this._targetObject = targetObject;
        return this;
    }

    _createButtonRow() {
        const buttonRow = document.createElement("div");
        buttonRow.classList.add("helionButtonRow");
        buttonRow.style.display = "flex";
        buttonRow.style.justifyContent = "flex-start";
        buttonRow.style.flexWrap = "wrap";
        buttonRow.style.gap = "2px";
        buttonRow.style.left = "10px";
        buttonRow.style.marginBottom = "5px";
        buttonRow.style.borderRadius = "8px";
        return buttonRow;
    }

    addEventListener(type, callback) {
        this._inputControl.addEventListener(type, event => {
            this._simulation.onUserInteraction(event);
            callback(event);
        });
        return this;
    }

    _appendToButtonRow(control) {
        this._buttonRow.appendChild(control._label);
        this._buttonRow.appendChild(control._inputControl);
        if (control._span)
            this._buttonRow.appendChild(control._span);

        if (control.hasChildControl)
            this._appendToButtonRow(control._childControl);
    }

    get hasChildControl() { return this._childControl !== null;}

    append(viewport) {
        this._appendToButtonRow(this);
        viewport.controlsDiv.appendChild(this._buttonRow);
        return this;
    }

    _setSimulationOn(control, simulation) {
        control._simulation = simulation;
        if (control.hasChildControl)
            this._setSimulationOn(control._childControl, simulation);
    }

    to(simulation) {
        this._setSimulationOn(this, simulation);
        return this;
    }

    togetherWith(otherControl) {
        this._childControl = otherControl;
        return this;
    }
}

export class DropdownMenu extends HtmlControl {
    constructor() {
        super();
    }

    for(registry) {
        this._label.textContent = registry.label;

        this._inputControl = document.createElement("select");
        this._inputControl.name = registry.id;
        this._inputControl.id = registry.id;

        for (const value of Object.values(registry.names)) {
            const option = document.createElement("option");
            option.value = String(value);
            option.textContent = String(value);
            this._inputControl.appendChild(option);
        }

        return this;
    }

    withValue(value) {
        this._inputControl.value = value;
        return this;
    }
}

export class Slider extends HtmlControl {
    constructor(label) {
        super(label);
        this._targetObject = null;

        this._inputControl = document.createElement("input");
        this._inputControl.type = "range";
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = "10px";

        this._span = document.createElement("span");
        this._span.style.marginRight = "25px";
        this._span.style.borderRadius = "8px";

        this._units = "";
    }

    withUnits(units) {
        this._units = units;
        return this;
    }

    withValue(value) {
        this._inputControl.value = value;
        this._span.textContent = value + this._units;
        return this;
    }

    get value() { return this._inputControl.value; }

    withRange(range) {
        this._inputControl.min = String(range.from);
        this._inputControl.max = String(range.to);
        this._inputControl.step = String(range.stepSize);
        return this;
    }

    withProperty(name) {
        this.addEventListener("input", (event) => {
            this._targetObject[name] = event.target.value;
            this._span.textContent = event.target.value + this._units;
        });
        return this;
    }

    addEventListener(type, callback) {
        this._inputControl.addEventListener(type, event => {
            this._simulation.onUserInteraction(event);
            callback(event);
            const value = parseFloat(event.target.value);
            this._span.textContent = value.toFixed(2) + this._units;
        });
        return this;
    }
}

export class Checkbox extends HtmlControl {
    constructor(label) {
        super(label);
        this._targetObject = null;

        this._inputControl = document.createElement("input");
        this._inputControl.type = "checkbox";
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = "10px";
    }

    checked(value) {
        this._inputControl.checked = !!value;
        return this;
    }

    withProperty(name) {
        this.addEventListener("click", (event) => this._targetObject[name] = event.target.checked);
        return this;
    }
}

export class RadioButton extends HtmlControl {
    constructor(label) {
        super(label);
        this._targetObject = null;
        this._nameAttributeValue = generateUUID();

        this._inputControl = document.createElement("input");
        this._inputControl.type = "radio";
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = "10px";
        this._inputControl.name = this._nameAttributeValue;
    }

    checked(value) {
        this._inputControl.checked = !!value;
        return this;
    }

    withProperty(name) {
        this.addEventListener("click", event => this._targetObject[name] = event.target.value);
        return this;
    }

    withValue(value) {
        this._inputControl.value = value;
        return this;
    }

    togetherWith(otherControl) {
        otherControl._inputControl.name = this._nameAttributeValue;
        return super.togetherWith(otherControl);
    }
}

export class Button extends HtmlControl {
    constructor(label) {
        super(label);
        this._targetObject = null;

        this._inputControl = document.createElement("button");
        this._inputControl.id = this._labelId;
    }

    withText(text) {
        this._inputControl.textContent = text;
        this._inputControl.value = text;
        return this;
    }

    withProperty(name) {
        this.addEventListener("click", event => this._targetObject[name] = event.target.value);
        return this;
    }
}
