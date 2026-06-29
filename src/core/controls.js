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

    set disabled(booleanValue) {
        this._inputControl.disabled = booleanValue;
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
            callback(event);
            this._simulation.onUserInteraction(event);
        });
        return this;
    }

    _appendToButtonRow(control, buttonRow) {
        buttonRow.appendChild(control._label);
        buttonRow.appendChild(control._inputControl);
        if (control._span)
            buttonRow.appendChild(control._span);

        if (control.hasChildControl)
            this._appendToButtonRow(control._childControl, this._buttonRow);
    }

    get hasChildControl() { return this._childControl !== null;}

    append(controlsDiv) {
        this._appendToButtonRow(this, this._buttonRow);
        controlsDiv.appendChild(this._buttonRow);
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

/**
 * CompoundControl
 *   ├── row 1
 *   │     ├── control A
 *   │     └── control B (via togetherWith)
 *   ├── row 2
 *   │     ├── control C
 *   │     └── control D (via togetherWith)
 */
export class CompoundControl extends HtmlControl {
    constructor() {
        super();
        this._buttonRows = [];
        this._controls = [];
    }

    add(control) {
        this._controls.push(control);

        const row = this._createButtonRow();
        this._buttonRows.push(row);

        const addRecursive = control => {
            this._appendToButtonRow(control, row);
            if (control.hasChildControl)
                addRecursive(control._childControl);
        };

        addRecursive(control);

        return this;
    }

    to(simulation) {
        for (const control of this._controls)
            this._setSimulationOn(control, simulation);
    }

    append(controlsDiv) {
        for (const buttonRow of this._buttonRows)
            controlsDiv.appendChild(buttonRow);
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

    get value() { return Number(this._inputControl.value); }

    withRange(range) {
        this._inputControl.min = String(range.from);
        this._inputControl.max = String(range.to);
        this._inputControl.step = String(range.stepSize);
        return this;
    }

    withProperty(name) {
        this.addEventListener("input", (event) => {
            this._targetObject[name] = Number(event.target.value);
            this._span.textContent = event.target.value + this._units;
        });
        return this;
    }

    addEventListener(type, callback) {
        this._inputControl.addEventListener(type, event => {
            callback(event);
            this._simulation.onUserInteraction(event);
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

export class RadioGroup extends CompoundControl {
    constructor(...buttons) {
        super();
        this._buttons = [];

        const groupName = generateUUID();
        for (const button of buttons) {
            if (!(button instanceof RadioButton))
                throw new Error("RadioGroup can only contain RadioButtons.");

            button._inputControl.name = groupName;
            for (let i = 0; i < buttons.length - 1; i++)
                buttons[i].togetherWith(buttons[i + 1]);

            this.add(buttons[0]);
            this._buttons.push(button);
        }
    }

    checked(index) {
        if (index >= 0 && index < this._controls.length)
            this._buttons[index].checked(true);

        return this;
    }
}

export class RadioButton extends HtmlControl {
    constructor(label) {
        super(label);
        this._targetObject = null;

        this._inputControl = document.createElement("input");
        this._inputControl.type = "radio";
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = "10px";
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
