import { generateUUID } from "../model/math/math.js";

class HtmlControl {
    constructor(container, htmlButtonRow = null) {
        this._container = container;
        this._buttonRow = htmlButtonRow ? htmlButtonRow : this._createButtonRow(container);
        this._inputControl = null; // To be set by each concrete control / subclass
        this._targetObject = null; // To be set by each concrete control / subclass
    }

    get buttonRow() { return this._buttonRow; }
    get container() { return this._container;}

    on(targetObject) {
        this._targetObject = targetObject;
        return this;
    }

    withLabel(label) {
        this._label.textContent = label;
        return this;
    }

    _createLabel() {
        const id = generateUUID();
        this._label = document.createElement("label");
        this._label.htmlFor = id;
        this._label.style.marginRight = "5px";
        return id;
    }

    _createButtonRow(container) {
        const buttonRow = document.createElement("div");
        buttonRow.classList.add("helionButtonRow");
        buttonRow.style.display = "flex";
        buttonRow.style.justifyContent = "flex-start";
        buttonRow.style.flexWrap = "wrap";
        buttonRow.style.gap = "2px";
        buttonRow.style.left = "10px";
        buttonRow.style.marginBottom = "5px";
        buttonRow.style.borderRadius = "8px";
        this._container.appendChild(buttonRow);
        return buttonRow;
    }

    addEventListener(type, callback) {
        this._inputControl.addEventListener(type, callback);
        return this;
    }
}

export class DropdownMenu extends HtmlControl {
    static togetherWith = (htmlControl) => new DropdownMenu(htmlControl.container, htmlControl.buttonRow);

    constructor(container, htmlButtonRow = null) {
        super(container, htmlButtonRow);
    }

    for(registry) {
        const label = document.createElement("label");
        label.htmlFor = registry.id;
        label.textContent = registry.label;

        this._inputControl = document.createElement("select");
        this._inputControl.name = registry.id;
        this._inputControl.id = registry.id;

        this._buttonRow.appendChild(label);
        this._buttonRow.appendChild(this._inputControl);

        for (const value of Object.values(registry.names())) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            this._inputControl.appendChild(option);
        }

        return this;
    }
}

export class Slider extends HtmlControl {
    static togetherWith = (htmlControl) => new Checkbox(htmlControl.container, htmlControl.buttonRow);

    constructor(container, htmlButtonRow = null) {
        super(container, htmlButtonRow);
        this._targetObject = null;

        const sliderId = this._createLabel();
        this._inputControl = document.createElement("input");
        this._inputControl.type = "range";
        this._inputControl.id = sliderId;
        this._inputControl.style.marginRight = "10px";

        this._span = document.createElement("span");
        this._span.style.marginRight = "25px";
        this._span.style.borderRadius = "8px";

        this._buttonRow.appendChild(this._label);
        this._buttonRow.appendChild(this._inputControl);
        this._buttonRow.appendChild(this._span);

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
        this._inputControl.addEventListener("input", (event) => {
            this._targetObject[name] = event.target.value;
            this._span.textContent = event.target.value + this._units;
        });
        return this;
    }

    addEventListener(type, callback) {
        super.addEventListener(type, callback);
        this._inputControl.addEventListener("input",
                event => this._span.textContent = event.target.value + this._units
        );
        return this;
    }
}

export class Checkbox extends HtmlControl {
    static togetherWith = (htmlControl) => new Checkbox(htmlControl.container, htmlControl.buttonRow);

    constructor(container, htmlButtonRow = null) {
        super(container, htmlButtonRow);
        this._targetObject = null;

        const checkboxId = this._createLabel();
        this._inputControl = document.createElement("input");
        this._inputControl.type = "checkbox";
        this._inputControl.id = checkboxId;
        this._inputControl.style.marginRight = "10px";

        this._buttonRow.appendChild(this._label);
        this._buttonRow.appendChild(this._inputControl);
    }

    checked(value) {
        this._inputControl.checked = !!value;
        return this;
    }

    withProperty(name) {
        this.addEventListener("click",
            (event) => this._targetObject[name] = event.target.checked
        );
        return this;
    }
}

export class RadioButton extends HtmlControl {
    static togetherWith = (htmlControl) => new RadioButton(htmlControl.container, htmlControl);

    constructor(container, htmlControl = null) {
        super(container, htmlControl ? htmlControl.buttonRow : null);
        this._targetObject = null;
        this._nameAttributeValue = htmlControl ? htmlControl._nameAttributeValue : generateUUID();

        const buttonId = this._createLabel();
        this._inputControl = document.createElement("input");
        this._inputControl.type = "radio";
        this._inputControl.id = buttonId;
        this._inputControl.style.marginRight = "10px";
        this._inputControl.name = this._nameAttributeValue;

        this._buttonRow.appendChild(this._label);
        this._buttonRow.appendChild(this._inputControl);
    }

    checked(value) {
        this._inputControl.checked = !!value;
        return this;
    }

    withProperty(name) {
        this.addEventListener("click",
            (event) => this._targetObject[name] = event.target.value
        );
        return this;
    }

    withValue(value) {
        this._inputControl.value = value;
        return this;
    }
}

export class Button extends HtmlControl {
    static togetherWith = (htmlControl) => new Button(htmlControl.container, htmlControl.buttonRow);

    constructor(container, htmlButtonRow = null) {
        super(container, htmlButtonRow);
        this._targetObject = null;

        const buttonId = this._createLabel();
        this._inputControl = document.createElement("button");
        this._inputControl.id = buttonId;

        this._buttonRow.appendChild(this._label);
        this._buttonRow.appendChild(this._inputControl);
    }

    withText(text) {
        this._inputControl.textContent = text;
        this._inputControl.value = text;
        return this;
    }

    withProperty(name) {
        this.addEventListener("click",
            (event) => this._targetObject[name] = event.target.value
        );
        return this;
    }
}

