import { generateUUID, Range } from '../model/math/math.js';
import { Axes } from '../view/3d/composite/backgrounds.js';
import { Registry, Simulation } from './helion.js';

export class HtmlControl {
    /** @param {string} labelText */
    constructor(labelText) {
        this._buttonRow = this._createButtonRow();
        /** @type { any } */
        this._inputControl = null; // To be set by each concrete control / subclass
        this._targetObject = null; // To be set by each concrete control / subclass
        this._childControl = null; // Other control in this same button row
        /** @type {Simulation | null} */
        this._simulation = null;

        //
        // <label for='anId'>labelText</label><input id='anId' ... />
        //
        this._label = document.createElement('label');
        this._labelId = generateUUID();
        this._label.htmlFor = this._labelId;
        this._label.style.marginRight = '5px';
        this._label.textContent = labelText ? labelText : '';

        /** @type {HTMLSpanElement | null} */
        this._span = null;
    }

    /** @param {boolean} booleanValue */
    set disabled(booleanValue) {
        this._inputControl.disabled = booleanValue;
    }

    /** @param {any} targetObject */
    on(targetObject) {
        this._targetObject = targetObject;
        return this;
    }

    _createButtonRow() {
        const buttonRow = document.createElement('div');
        buttonRow.classList.add('helionButtonRow');
        return buttonRow;
    }

    /**
     * @param {string} eventType 
     * @param {(event: Event) => void} callback 
     * @returns {HtmlControl}
     */
    addEventListener(eventType, callback) {
        const isString = typeof eventType === 'string' || eventType instanceof String;
        if (!isString)
            throw new Error('First argument must be an event type string');

        this._inputControl.addEventListener(eventType, (/** @type {Event} */ event) => {
            callback(event);
            this._simulation.onUserInteraction(event);
        });
        return this;
    }

    /** @param {(event: Event) => void} callback */
    onChange(callback) {
        return this.addEventListener('change', callback);
    }

    /** @param {(event: Event) => void} callback */
    onInput(callback) {
        return this.addEventListener('input', callback);
    }

    /**
     * @param {HtmlControl} control 
     * @param {HTMLDivElement} buttonRow 
     */
    _appendToButtonRow(control, buttonRow) {
        buttonRow.appendChild(control._label);
        buttonRow.appendChild(control._inputControl);
        if (control._span)
            buttonRow.appendChild(control._span);

        if (control.hasChildControl)
            this._appendToButtonRow(control._childControl, this._buttonRow);
    }

    get hasChildControl() { return this._childControl !== null;}

    /** @param {HTMLDivElement} controlsDiv */
    append(controlsDiv) {
        this._appendToButtonRow(this, this._buttonRow);
        controlsDiv.appendChild(this._buttonRow);
        return this;
    }

    /**
     * @param {HtmlControl} control 
     * @param {Simulation} simulation 
     */
    _setSimulationOn(control, simulation) {
        control._simulation = simulation;
        if (control.hasChildControl)
            this._setSimulationOn(control._childControl, simulation);
    }

    /** @param {Simulation} simulation */
    to(simulation) {
        this._setSimulationOn(this, simulation);
        return this;
    }
    
    /** @param {HtmlControl} otherControl */
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
        super('');
        /** @type {HTMLDivElement[]} */
        this._buttonRows = [];
        /** @type {HtmlControl[]} */
        this._controls = [];
    }

    /** @param {HtmlControl} control */
    add(control) {
        this._controls.push(control);

        const row = this._createButtonRow();
        this._buttonRows.push(row);

        const addRecursive = (/** @type {HtmlControl} */ control) => {
            this._appendToButtonRow(control, row);
            if (control.hasChildControl)
                addRecursive(control._childControl);
        };

        addRecursive(control);

        return this;
    }

    /** @param {Simulation} simulation */
    to(simulation) {
        for (const control of this._controls)
            this._setSimulationOn(control, simulation);
    }

    /** @param {HTMLDivElement} controlsDiv */
    append(controlsDiv) {
        for (const buttonRow of this._buttonRows)
            controlsDiv.appendChild(buttonRow);
        return this;
    }
}

export class DropdownMenu extends HtmlControl {
    constructor() {
        super('');
    }

    /** @param {Registry} registry */
    for(registry) {
        this._label.textContent = registry.label;

        this._inputControl = document.createElement('select');
        this._inputControl.name = registry.id;
        this._inputControl.id = registry.id;

        for (const value of Object.values(registry.names)) {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = String(value);
            this._inputControl.appendChild(option);
        }

        return this;
    }

    /** @param {string} value */
    withValue(value) {
        this._inputControl.value = value;
        return this;
    }
}

export class Slider extends HtmlControl {
    /** @param {string} label */
    constructor(label) {
        super(label);

        this._inputControl = document.createElement('input');
        this._inputControl.type = 'range';
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = '10px';

        this._span = document.createElement('span');
        this._span.style.marginRight = '25px';
        this._span.style.borderRadius = '8px';

        this._units = '';
    }

    /** @param {string} units */
    withUnits(units) {
        this._units = units;
        return this;
    }

    /** @param {number} value */
    withValue(value) {
        this._inputControl.value = String(value);
        this._span.textContent = value.toFixed(2) + this._units;
        return this;
    }

    get value() { return Number(this._inputControl.value); }

    /** @param {Range} range */
    withRange(range) {
        this._inputControl.min = String(range.from);
        this._inputControl.max = String(range.to);
        this._inputControl.step = String(range.stepSize);
        return this;
    }

    /** @param {string} name */
    withProperty(name) {
        this.addEventListener('input', (event) => {
            // @ts-ignore
            this._targetObject[name] = Number(event.target.value);
            // @ts-ignore
            this._span.textContent = Number(event.target.value).toFixed(2) + this._units;
        });
        return this;
    }

    /**
     * 
     * @param {string} eventType 
     * @param {(event: Event) => void} callback 
     * @returns 
     */
    addEventListener(eventType, callback) {
        const isString = typeof eventType === 'string' || eventType instanceof String;
        if (!isString)
            throw new Error('First argument must be an event type string');

        this._inputControl.addEventListener(eventType, event => {
            callback(event);
            this._simulation.onUserInteraction(event);
            // @ts-ignore
            const value = parseFloat(event.target.value);
            this._span.textContent = value.toFixed(2) + this._units;
        });
        return this;
    }
}

export class Checkbox extends HtmlControl {
    /**
     * @param {string} label
     */
    constructor(label) {
        super(label);

        this._inputControl = document.createElement('input');
        this._inputControl.type = 'checkbox';
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = '10px';
    }

    /** @param {boolean} value */
    checked(value) {
        this._inputControl.checked = !!value;
        return this;
    }

    /** @param {string} name */
    withProperty(name) {
        // @ts-ignore
        this.addEventListener('click', (event) => this._targetObject[name] = event.target.checked);
        return this;
    }
}

export class RadioGroup extends HtmlControl {
    constructor() {
        super('');

        /** @type {HTMLInputElement[]} */
        this._buttons = [];
        this._groupName = generateUUID();

        this._inputControl = document.createElement('div');
        this._inputControl.style.display = 'flex';
        this._inputControl.style.gap = '8px';
    }

    /** 
     * @param {string} label
     * @param {(event: Event) => void} callback
     * @return {RadioGroup}
     */
    add(label, callback) {
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = this._groupName;

        const text = document.createElement('label');
        text.textContent = label;

        radio.addEventListener('change', event => {
            // @ts-ignore
            if (event.target.checked)
                callback(event);

            this._simulation.onUserInteraction(event);
        });

        this._inputControl.append(radio, text);
        this._buttons.push(radio);

        return this;
    }

    /** @param {number} index */
    checked(index) {
        if (index >= 0 && index < this._buttons.length)
            this._buttons[index].checked = true;

        return this;
    }
}

export class TextInput extends HtmlControl {
    /** @param {string} label */
    constructor(label = '') {
        super(label);
        this._inputControl = document.createElement('input');
        this._inputControl.type = 'text';
        this._inputControl.id = this._labelId;
        this._inputControl.classList.add('helionTextInput');
        this._label.classList.add('helionTextInputLabel');
    }

    /** 
     * @param {string} text 
     * @return {TextInput} 
     */
    withPlaceholder(text) {
        this._inputControl.placeholder = text;
        return this;
    }

    /** 
     * @param {string} value 
     * @return {TextInput} 
     */
    withValue(value) {
        this._inputControl.value = value;
        return this;
    }

    get value() { return this._inputControl.value; }
    set value(v) { this._inputControl.value = v; }

    /** @param {boolean} isValid */
    set valid(isValid) {
        this._inputControl.classList.toggle('helionTextInput--invalid', !isValid);
    }

    /** 
     * @param {string|number} width 
     * @return {TextInput} 
     */
    withMinWidth(width) {
        this._inputControl.style.minWidth = typeof width === 'number' ? `${width}px` : width;
        return this;
    }

    /** 
     * @param {string} name 
     * @return {TextInput} 
     */
    withProperty(name) {
        // @ts-ignore
        this.addEventListener('change', event => this._targetObject[name] = event.target.value);
        return this;
    }

    /** 
     * @param {(event: KeyboardEvent) => void} callback 
     * @return {TextInput} 
     */
    onEnter(callback) {
        this.addEventListener('keydown', event => {
            // @ts-ignore
            if (event.key === 'Enter') 
                callback(event);
        });
        return this;
    }
}

export class Button extends HtmlControl {
    /** @param {string} label */
    constructor(label = '') {
        super(label);
        this._inputControl = document.createElement('button');
        this._inputControl.id = this._labelId;
        this._inputControl.classList.add('helionButton');
    }

    /** 
     * @param {string} text 
     * @return {Button}
     */
    withText(text) {
        this._inputControl.textContent = text;
        this._inputControl.value = text;
        return this;
    }

    /** 
     * @param {(event: Event) => void} callback
     * @return {Button}
     */
    onClick(callback) {
        this.addEventListener('click', callback);
        return this;
    }

    /** 
     * @param {string} name 
     * @return {Button}
     */
    withProperty(name) {
        // @ts-ignore
        this.addEventListener('click', event => this._targetObject[name] = event.target.value);
        return this;
    }
}

export class AxesUI {
    /** @param {Axes} axes */
    constructor(axes) {
        this._axes = axes;
    }

    /** @param {Axes} axes */
    set axes(axes) { this._axes = axes; }

    ui() {
        return new CompoundControl()
            .add(new Checkbox('Frame ')
                .checked(true)
                .addEventListener('click', event =>
                    // @ts-ignore
                    this._axes.withSettings({ frame: event.target.checked }))
                .togetherWith(new Checkbox('Annotations ')
                    .checked(true)
                    .addEventListener('click', event =>
                        // @ts-ignore
                        this._axes.withSettings({ annotations: event.target.checked }))
                    .togetherWith(new Checkbox('Tick labels ')
                        .checked(true)
                        .addEventListener('click', event =>
                            // @ts-ignore
                            this._axes.withSettings({ tickLabels: event.target.checked }))
                    )
                )
            )
            .add(new Checkbox('XY-plane')
                .checked(true)
                .addEventListener('click', event =>
                    // @ts-ignore
                    this._axes.withSettings({ xyPlane: event.target.checked }))
                .togetherWith(
                    new Checkbox('XZ-plane')
                        .checked(true)
                        .addEventListener('click', event =>
                            // @ts-ignore
                            this._axes.withSettings({ xzPlane: event.target.checked }))
                        .togetherWith(
                            new Checkbox('YZ-plane')
                                .checked(true)
                                .addEventListener('click', event =>
                                    // @ts-ignore
                                    this._axes.withSettings({ yzPlane: event.target.checked }))
                        )
                )
            );
    }
}
