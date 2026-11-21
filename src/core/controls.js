import { generateUUID, Range } from '../model/math/math.js';
import { Axes } from '../view/3d/composite/backgrounds.js';
import { Simulation } from './helion.js';
import { Registry } from './utils.js';

/**
 * Base class for all HTML UI controls.
 *
 * Provides common functionality for creating label-input pairs,
 * event handling, and simulation integration.
 *
 * @param {string} [labelText] - Optional label text for the control
 *
 * @example
 * const control = new HtmlControl('My Label').on(myObject, myCallback);
 * simulation.append(control);
 */
export class HtmlControl {
    /**
     * @param {string} [labelText] - Optional label text
     */
    constructor(labelText) {
        this._buttonRow = this._createButtonRow();
        /** @type {any} */
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

    /**
     * Disable or enable the control.
     *
     * @param {boolean} booleanValue - `true` to disable, `false` to enable
     * @returns {this} This HtmlControl instance for chaining
     *
     * @example
     * control.disabled(true); // Disables the control
     */
    set disabled(booleanValue) {
        this._inputControl.disabled = booleanValue;
        return this;
    }

    /**
     * Set the target object for property binding.
     *
     * @param {any} targetObject - The object whose properties will be bound
     * @returns {this} This HtmlControl instance for chaining
     *
     * @example
     * control.on(mySimulation);
     */
    on(targetObject) {
        this._targetObject = targetObject;
        return this;
    }

    /**
     * Create a button row div element for laying out controls.
     *
     * @returns {HTMLDivElement} A div element with helionButtonRow class
     *
     * @internal
     */
    _createButtonRow() {
        const buttonRow = document.createElement('div');
        buttonRow.classList.add('helionButtonRow');
        return buttonRow;
    }

    /**
     * Add an event listener to the input control.
     *
     * @param {string} eventType - The type of event (e.g., 'change', 'click', 'input')
     * @param {(event: Event) => void} callback - Callback function receiving the event
     * @returns {this} This HtmlControl instance for chaining
     *
     * @throws {Error} If the first argument is not a string
     *
     * @example
     * control.addEventListener('change', event => console.log(event.target.value));
     */
    addEventListener(eventType, callback) {
        const isString = typeof eventType === 'string' || eventType instanceof String;
        if (!isString)
            throw new Error('First argument must be an event type string');

        this._inputControl.addEventListener(eventType, (/** @type {Event} */ event) => {
            callback(event);
            this._simulation.onUserInteractionEvent(event);
        });
        return this;
    }

    /**
     * @param {HtmlControl} control
     * @param {HTMLDivElement} buttonRow
     * @internal
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
     * Set the simulation reference on this control and all child controls.
     *
     * @param {HtmlControl} control - The control to set simulation on
     * @param {Simulation} simulation - The simulation instance
     *
     * @internal
     */
    _setSimulationOn(control, simulation) {
        control._simulation = simulation;
        if (control.hasChildControl)
            this._setSimulationOn(control._childControl, simulation);
    }

    /**
     * Set the simulation for this control.
     *
     * @param {Simulation} simulation - The simulation instance
     * @returns {this} This HtmlControl instance for chaining
     * @internal
     */
    to(simulation) {
        this._setSimulationOn(this, simulation);
        return this;
    }

    /**
     * Together with another control, creating a pair in the same row.
     *
     * @param {HtmlControl} otherControl - The control to pair with
     * @returns {this} This HtmlControl instance for chaining
     *
     * @example
     * controlA.togetherWith(controlB);
     */
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
 *
 * A compound control that arranges multiple HtmlControl instances
 * in rows. Controls can be grouped together using the `togetherWith` method.
 *
 * Layout structure:
 * - Row 1: Control A + Control B (via togetherWith)
 * - Row 2: Control C + Control D (via togetherWith)
 *
 * @example
 * const compound = new CompoundControl();
 * simulation
 *     .add(new Slider('Speed').on(simulation).withRange(new Range(0, 10)))
 *     .add(new Checkbox('Paused'))
 *     .append(compound);
 */
export class CompoundControl extends HtmlControl {
    /**
     * @param {string} [labelText] - Label text (passed to super, used for first control)
     */
    constructor(labelText) {
        super(labelText);
        /** @type {HTMLDivElement[]} */
        this._buttonRows = [];
        /** @type {HtmlControl[]} */
        this._controls = [];
    }

    /**
     * Add a control to the compound control.
     *
     * @param {HtmlControl} control - The control to add
     * @returns {this} This CompoundControl instance for chaining
     *
     * @example
     * compound.add(new Slider('My Slider').on(simulation));
     */
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

    /**
     * Set the simulation reference on all managed controls.
     *
     * @param {Simulation} simulation - The simulation instance
     * @returns {this} This CompoundControl instance for chaining
     *
     * @example
     * compound.to(mySimulation);
     */
    to(simulation) {
        for (const control of this._controls)
            this._setSimulationOn(control, simulation);
        return this;
    }

    /**
     * Append all control rows to a container div.
     *
     * @param {HTMLDivElement} controlsDiv - The container element
     * @returns {this} This CompoundControl instance for chaining
     * @internal
     */
    append(controlsDiv) {
        for (const buttonRow of this._buttonRows)
            controlsDiv.appendChild(buttonRow);
        return this;
    }
}

/**
 * DropdownMenu
 *
 * A dropdown menu control that extends HtmlControl.
 * Populates options from a Registry instance.
 *
 * @example
 * const menu = new DropdownMenu();
 * menu.for(myRegistry).onChange(value => console.log(value));
 * simulation.append(menu);
 */
export class DropdownMenu extends HtmlControl {
    /**
     * @param {Registry} registry - The registry containing label and names
     * @returns {DropdownMenu} This DropdownMenu instance for chaining
     *
     * @example
     * menu.for(myRegistry);
     */
    constructor(registry) {
        super('');
        if (registry) {
            this.for(registry);
        }
    }

    /**
     * Populate the dropdown from a Registry instance.
     *
     * @param {Registry} registry - The registry containing label and names
     * @returns {this} This DropdownMenu instance for chaining
     *
     * @example
     * menu.for(myRegistry);
     */
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

    /**
     * Set a callback for when the selected value changes.
     *
     * @param {(value: string) => void} callback - Function called with the selected value
     * @returns {this} This DropdownMenu instance for chaining
     *
     * @example
     * menu.onChange(value => console.log(value));
     */
    onChange(callback) {
        this.addEventListener('change', event => callback(event.target.value));
        return this;
    }

    /**
     * Set the selected value programmatically.
     *
     * @param {string} value - The value to select
     * @returns {this} This DropdownMenu instance for chaining
     *
     * @example
     * menu.withValue('option1');
     */
    withValue(value) {
        this._inputControl.value = value;
        return this;
    }
}

/**
 * Slider
 *
 * A range slider control that extends HtmlControl.
 * Used for numerical input with a visible value display.
 *
 * @param {string} label - Label text displayed next to the slider
 * @param {Range} [range] - Optional range configuration (min, max, step)
 *
 * @example
 * const slider = new Slider('My Value').on(targetObject).withProperty('propertyName).withRange(new Range(0, 100));
 * slider.withUnits('px');
 * simulation.append(slider);
 */
export class Slider extends HtmlControl {
    /**
     * @param {string} label - Label text for the slider
     * @param {Range} [range] - Optional range {from, to, stepSize}
     */
    constructor(label, range) {
        super(label);

        this._inputControl = document.createElement('input');
        this._inputControl.type = 'range';
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = '10px';

        this._span = document.createElement('span');
        this._span.style.marginRight = '25px';
        this._span.style.borderRadius = '8px';

        this._units = '';

        if (range) {
            this.withRange(range);
        }
    }

    /**
     * Set the units display for the slider value.
     *
     * @param {string} units - The unit string (e.g., 'px', 'rad', 'ms')
     * @returns {this} This Slider instance for chaining
     *
     * @example
     * slider.withUnits('px');
     */
    withUnits(units) {
        this._units = units;
        return this;
    }

    /**
     * Set the slider value.
     *
     * @param {number} value - The value to set
     * @returns {this} This Slider instance for chaining
     *
     * @example
     * slider.withValue(50);
     */
    withValue(value) {
        this._inputControl.value = String(value);
        this._span.textContent = value.toFixed(2) + this._units;
        return this;
    }

    /**
     * Get the current slider value.
     *
     * @returns {number} The current value
     *
     * @example
     * const val = slider.value;
     */
    get value() { return Number(this._inputControl.value); }

    /**
     * Set the range (min, max, step) for the slider.
     *
     * @param {Range} range - A Range instance with from, to, and stepSize properties
     * @returns {this} This Slider instance for chaining
     *
     * @example
     * slider.withRange(new Range(0, 100));
     */
    withRange(range) {
        this._inputControl.min = String(range.from);
        this._inputControl.max = String(range.to);
        this._inputControl.step = String(range.stepSize);
        return this;
    }

    /**
     * Set a target object property to bind the slider value to.
     *
     * @param {string} name - The property name on the target object
     * @returns {this} This Slider instance for chaining
     *
     * @throws {Error} If no target object has been set
     *
     * @example
     * slider.withProperty('rotation');
     */
    withProperty(name) {
        if (!this._targetObject)
            throw new Error('Set target object first with the Slider.on() method');

        if (!name in this._targetObject)
            throw new Error(`${name} is not a member of ${this._targetObject.constructor.name}`);

        if (this._targetObject[name])
            this.withValue(this._targetObject[name]);
        else
            console.info(`Cannot retrieve value of ${name} in ${this._targetObject.constructor.name} (no getter?)`);

        this.addEventListener('input', (event) => {
            // @ts-ignore
            this._targetObject[name] = Number(event.target.value);
            // @ts-ignore
            this._span.textContent = Number(event.target.value).toFixed(2) + this._units;
        });
        return this;
    }

    /**
     * Set a callback for when the input value changes.
     *
     * @param {(value: number) => void} callback - Function called with the new value
     * @returns {this} This Slider instance for chaining
     *
     * @example
     * slider.onInput(value => console.log(value));
     */
    onInput(callback) {
        this.addEventListener('input', event => callback(Number(event.target.value)));
        return this;
    }

    /**
     * Set a callback for when the change event fires.
     *
     * @param {(value: number) => void} callback - Function called with the new value
     * @returns {this} This Slider instance for chaining
     *
     * @example
     * slider.onChange(value => console.log(value));
     */
    onChange(callback) {
        this.addEventListener('change', event => callback(Number(event.target.value)));
        return this;
    }

    /**
     * Add an event listener to the input control.
     *
     * @param {string} eventType - The type of event (e.g., 'change', 'click', 'input')
     * @param {(event: Event) => void} callback - Callback function receiving the event
     * @returns {this} This HtmlControl instance for chaining
     *
     * @throws {Error} If the first argument is not a string
     *
     * @example
     * slider.addEventListener('change', event => console.log(event.target.value));
     */
    addEventListener(eventType, callback) {
        const isString = typeof eventType === 'string' || eventType instanceof String;
        if (!isString)
            throw new Error('First argument must be an event type string');

        this._inputControl.addEventListener(eventType, event => {
            callback(event);
            this._simulation.onUserInteractionEvent(event);
            // @ts-ignore
            const value = parseFloat(event.target.value);
            this._span.textContent = value.toFixed(2) + this._units;
        });
        return this;
    }
}

/**
 * Checkbox
 *
 * A checkbox control that extends HtmlControl.
 * Used for boolean toggle inputs.
 *
 * @param {string} label - Label text displayed next to the checkbox
 *
 * @example
 * const checkbox = new Checkbox('Enabled').on(targetObject).withProperty('propertyName');
 * simulation.append(checkbox);
 */
export class Checkbox extends HtmlControl {
    /**
     * @param {string} label - Label text for the checkbox
     */
    constructor(label) {
        super(label);

        this._inputControl = document.createElement('input');
        this._inputControl.type = 'checkbox';
        this._inputControl.id = this._labelId;
        this._inputControl.style.marginRight = '10px';
    }

    /**
     * Check or uncheck the checkbox.
     *
     * @param {boolean} value - `true` to check, `false` to uncheck
     * @returns {this} This Checkbox instance for chaining
     *
     * @example
     * checkbox.checked(true);
     */
    checked(value) {
        this._inputControl.checked = !!value;
        return this;
    }

    /**
     * Set a callback for when the checkbox state changes.
     *
     * @param {(checked: boolean) => void} callback - Function called with the new checked state
     * @returns {this} This Checkbox instance for chaining
     *
     * @example
     * checkbox.onChange(state => console.log(state));
     */
    onChange(callback) {
        this.addEventListener('change', event => callback(event.target.checked));
        return this;
    }

    /**
     * Set a target object property to bind the checkbox state to.
     *
     * @param {string} name - The property name on the target object
     * @returns {this} This Checkbox instance for chaining
     *
     * @throws {Error} If no target object has been set
     *
     * @example
     * checkbox.withProperty('enabled');
     */
    withProperty(name) {
        if (!this._targetObject)
            throw new Error('Set target object first with the checkbox.on() method');

        if (!name in this._targetObject)
            throw new Error(`${name} is not a member of ${this._targetObject.constructor.name}`);

        if (this._targetObject[name])
            this._inputControl.checked = this._targetObject[name];
        else
            console.info(`Cannot retrieve value of ${name} in ${this._targetObject.constructor.name} (no getter?)`);

        // @ts-ignore
        this.addEventListener('change', (event) => this._targetObject[name] = event.target.checked);
        return this;
    }
}

/**
 * RadioGroup
 *
 * A group of radio button controls that extend HtmlControl.
 * Only one radio button in the group can be selected at a time.
 *
 * @param {string} [label] - Optional label text displayed above the radio group
 *
 * @example
 * const group = new RadioGroup('Mode');
 * group.add('Option A', event => console.log('Selected A'));
 * group.add('Option B', event => console.log('Selected B'));
 * simulation.append(group);
 */
export class RadioGroup extends HtmlControl {
    /**
     * @param {string} [label] - Optional label text
     */
    constructor(label) {
        super(label);

        /** @type {HTMLInputElement[]} */
        this._buttons = [];
        this._groupName = generateUUID();

        this._label.style.fontWeight = 'bold';
        this._label.style.display = 'block';

        this._inputControl = document.createElement('div');
        this._inputControl.style.display = 'flex';
        this._inputControl.style.gap = '8px';
    }

    /**
     * Set the disabled state for all radio buttons in the group.
     *
     * @param {boolean} value - `true` to disable all buttons, `false` to enable
     * @returns {this} This RadioGroup instance for chaining
     *
     * @example
     * group.disabled(true);
     */
    set disabled(value) {
        this._buttons.forEach(button => button.disabled = value);
        return this;
    }

    /**
     * Add a radio button to the group.
     *
     * @param {string} label - The label text for the radio button
     * @param {(event: Event) => void} callback - Callback called when selected
     * @returns {this} This RadioGroup instance for chaining
     *
     * @example
     * group.add('Option A', event => console.log('Selected A'));
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

            this._simulation.onUserInteractionEvent(event);
        });

        this._inputControl.append(radio, text);
        this._buttons.push(radio);

        return this;
    }

    /**
     * Select a radio button by index.
     *
     * @param {number} index - The index of the button to select (0-based)
     * @returns {this} This RadioGroup instance for chaining
     *
     * @example
     * group.checked(0); // Select first radio button
     */
    checked(index) {
        if (index >= 0 && index < this._buttons.length)
            this._buttons[index].checked = true;

        return this;
    }
}

/**
 * TextInput
 *
 * A text input control that extends HtmlControl.
 * Used for single-line text entry fields.
 *
 * @param {string} [label] - Optional label text displayed before the input
 *
 * @example
 * const input = new TextInput('Name').on(targetObject).withValue('John');
 * simulation.append(input);
 */
export class TextInput extends HtmlControl {
    /**
     * @param {string} [label] - Optional label text
     */
    constructor(label) {
        super(label);
        this._inputControl = document.createElement('input');
        this._inputControl.type = 'text';
        this._inputControl.id = this._labelId;
        this._inputControl.classList.add('helionTextInput');
        this._label.classList.add('helionTextInputLabel');
    }

    /**
     * Set a placeholder text for the input field.
     *
     * @param {string} text - The placeholder text
     * @returns {this} This TextInput instance for chaining
     *
     * @example
     * input.withPlaceholder('Enter name');
     */
    withPlaceholder(text) {
        this._inputControl.placeholder = text;
        return this;
    }

    /**
     * Set the input value.
     *
     * @param {string} value - The value to set
     * @returns {this} This TextInput instance for chaining
     *
     * @example
     * input.withValue('John');
     */
    withValue(value) {
        this._inputControl.value = value;
        return this;
    }

    /**
     * Get the current input value.
     *
     * @returns {string} The current value
     *
     * @example
     * const val = input.value;
     */
    get value() { return this._inputControl.value; }
    set value(v) { this._inputControl.value = v; }

    /**
     * Set the validity state, adding or removing an invalid CSS class.
     *
     * @param {boolean} isValid - `true` for valid, `false` for invalid
     * @returns {this} This TextInput instance for chaining
     *
     * @example
     * input.valid(true);
     */
    set valid(isValid) {
        this._inputControl.classList.toggle('helionTextInput--invalid', !isValid);
        return this;
    }

    /**
     * Set the minimum width of the input field.
     *
     * @param {string|number} width - Width in pixels (number) or CSS width string
     * @returns {this} This TextInput instance for chaining
     *
     * @example
     * input.withMinWidth(200);
     */
    withMinWidth(width) {
        this._inputControl.style.minWidth = typeof width === 'number' ? `${width}px` : width;
        return this;
    }

    /**
     * Set a target object property to bind the input value to.
     *
     * @param {string} name - The property name on the target object
     * @returns {this} This TextInput instance for chaining
     *
     * @throws {Error} If no target object has been set
     *
     * @example
     * input.withProperty('username');
     */
    withProperty(name) {
        // @ts-ignore
        this.addEventListener('change', event => this._targetObject[name] = event.target.value);
        return this;
    }

    /**
     * Set a callback for when the Enter key is pressed.
     *
     * @param {(event: KeyboardEvent) => void} callback - Function called when Enter is pressed
     * @returns {this} This TextInput instance for chaining
     *
     * @example
     * input.onEnter(event => console.log('Submitted:', event.target.value));
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

/**
 * Button
 *
 * A button control that extends HtmlControl.
 * Creates a clickable button element for user interaction.
 *
 * @param {string} [label] - Optional label text on the button
 *
 * @example
 * const button = new Button('Click Me').on(simulation).onClick(() => alert('Clicked!'));
 * simulation.append(button);
 */
export class Button extends HtmlControl {
    /**
     * @param {string} [label] - Optional label text
     */
    constructor(label) {
        super(label);
        this._inputControl = document.createElement('button');
        this._inputControl.id = this._labelId;
        this._inputControl.classList.add('helionButton');
    }

    /**
     * Set the button text content and value.
     *
     * @param {string} text - The button label text
     * @returns {this} This Button instance for chaining
     *
     * @example
     * button.withText('Submit');
     */
    withText(text) {
        this._inputControl.textContent = text;
        this._inputControl.value = text;
        return this;
    }

    /**
     * Set a callback for when the button is clicked.
     *
     * @param {(event: Event) => void} callback - Function called on click
     * @returns {this} This Button instance for chaining
     *
     * @example
     * button.onClick(event => console.log('Button clicked'));
     */
    onClick(callback) {
        this.addEventListener('click', callback);
        return this;
    }

    /**
     * Set a target object property to bind the button value to.
     *
     * @param {string} name - The property name on the target object
     * @returns {this} This Button instance for chaining
     *
     * @throws {Error} If no target object has been set
     *
     * @example
     * button.withProperty('action');
     */
    withProperty(name) {
        // @ts-ignore
        this.addEventListener('click', event => this._targetObject[name] = event.target.value);
        return this;
    }
}

/**
 * AxesUI
 *
 * A UI control for managing axes visibility and settings.
 * Provides checkboxes for frame, annotations, tick labels, and plane visibility.
 *
 * @param {Axes} axes - The axes object to control
 * @internal
 */
export class AxesUI {
    /**
     * @param {Axes} axes - The axes object to control
     */
    constructor(axes) {
        this._axes = axes;
    }

    /**
     * Set the axes object to control.
     *
     * @param {Axes} axes - The axes object
     * @returns {this} This AxesUI instance for chaining
     * @internal
     */
    set axes(axes) { this._axes = axes; return this; }

    /**
     * Create a CompoundControl with checkboxes for axis settings.
     *
     * @returns {CompoundControl} A compound control with all axis UI checkboxes
     *
     * @example
     * const control = axesUI.ui();
     * control.append(control);
     */
    ui() {
        return new CompoundControl()
            .add(new Checkbox('Frame ')
                .checked(true)
                .onChange(checked =>
                    this._axes.withSettings({ frame: checked }))
                .togetherWith(new Checkbox('Annotations ')
                    .checked(true)
                    .onChange(checked =>
                        this._axes.withSettings({ annotations: checked }))
                    .togetherWith(new Checkbox('Tick labels ')
                        .checked(true)
                        .onChange(checked =>
                            this._axes.withSettings({ tickLabels: checked }))
                    )
                )
            )
            .add(new Checkbox('XY-plane')
                .checked(true)
                .onChange(checked =>
                    this._axes.withSettings({ xyPlane: checked }))
                .togetherWith(
                    new Checkbox('XZ-plane')
                        .checked(true)
                        .onChange(checked =>
                            this._axes.withSettings({ xzPlane: checked }))
                        .togetherWith(
                            new Checkbox('YZ-plane')
                                .checked(true)
                                .onChange(checked =>
                                    this._axes.withSettings({ yzPlane: checked }))
                        )
                )
            );
    }
}
