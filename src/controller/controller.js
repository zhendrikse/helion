class HtmlControl {
    constructor(htmlButtonRow = null) {
        this._buttonRow = htmlButtonRow ? htmlButtonRow : this._createButtonRow();
    }

    get buttonRow() { return this._buttonRow; }

    _createButtonRow() {
        const buttonRow = document.createElement("div");
        buttonRow.className = "buttonRow";
        document.getElementById("helionControls").appendChild(buttonRow);
        return buttonRow;
    }

    generateUUID() {
        let // Public Domain/MIT
            d = new Date().getTime(),
            d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            let r = Math.random() * 16;
            if (d > 0) {
                r = (d + r) % 16 | 0;
                d = Math.floor(d / 16);
            } else {
                r = (d2 + r) % 16 | 0;
                d2 = Math.floor(d2 / 16);
            }
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    };

}

export class DropdownMenu extends HtmlControl {
    static togetherWith = (htmlControl) => new DropdownMenu(htmlControl.buttonRow);

    constructor(htmlButtonRow = null) {
        super(htmlButtonRow);
    }

    for(registry) {
        const label = document.createElement("label");
        label.htmlFor = registry.id;
        label.textContent = registry.label;

        const select = document.createElement("select");
        select.name = registry.id;
        select.id = registry.id;

        this._buttonRow.appendChild(label);
        this._buttonRow.appendChild(select);

        for (const value of Object.values(registry.names())) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }

        return select;
    }
}

export class Checkbox extends HtmlControl {
    static togetherWith = (htmlControl) => new Checkbox(htmlControl.buttonRow);

    constructor(htmlButtonRow = null) {
        super(htmlButtonRow);
        this._targetObject = null;

        const checkboxId = this.generateUUID();
        this._label = document.createElement("label");
        this._label.htmlFor = checkboxId;

        this._checkbox = document.createElement("input");
        this._checkbox.type = "checkbox";
        this._checkbox.id = checkboxId;

        this._buttonRow.appendChild(this._label);
        this._buttonRow.appendChild(this._checkbox);
    }

    checked(value) {
        this._checkbox.checked = !!value;
        return this;
    }

    on(anObject) {
        this._targetObject = anObject;
        return this;
    }

    withLabel(label) {
        this._label.textContent = label;
        return this;
    }

    withProperty(name) {
        this._checkbox.addEventListener("click",
            (event) => this._targetObject[name] = event.target.checked
        );
        return this;
    }
}


export class Button extends HtmlControl {
    static togetherWith = (htmlControl) => new Button(htmlControl.buttonRow);

    constructor(htmlButtonRow = null) {
        super(htmlButtonRow);
        this._targetObject = null;

        const buttonId = this.generateUUID();
        this._label = document.createElement("label");
        this._label.htmlFor = buttonId;

        this._button = document.createElement("button");
        this._button.id = buttonId;

        this._buttonRow.appendChild(this._label);
        this._buttonRow.appendChild(this._button);
    }

    on(anObject) {
        this._targetObject = anObject;
        return this;
    }

    withText(text) {
        this._button.textContent = text;
        this._button.value = text;
        return this;
    }

    withLabel(label) {
        this._label.textContent = label;
        return this;
    }

    withProperty(name) {
        this._button.addEventListener("click",
            (event) => this._targetObject[name] = event.target.value
        );
        return this;
    }
}

export class CallbackFunction {
    constructor(callback) {
        this._callbackFunction = callback;
    }

    to(control) {
        control.callbackFunction = this._callbackFunction;
        return control;
    }
}

export class EventController {
    static for = (simulation) => new EventController(simulation);

    constructor(simulation = null) {
        this._simulation = simulation;
        this._onCanvasClickEventHandler = null;
    }

    /**
     * Add a mouse-click event listener to a simulation canvas. It defaults to start/stop.
     * When calling this function with a custom callback, the default start/stop functionality is
     * lost and needs to be re-added if needed!!
     */
    addStartStopMouseClickEventListenerTo(canvas, callback = (event) => this._simulation.toggleRunStatus()) {
        // Pass a mouse click on the canvas on to the simulation:
        this._onCanvasClickEventHandler = callback;
        canvas.htmlCanvas.addEventListener("click", (event) => callback(event) );
    }

    removeStartStopMouseClickEventListenerFrom(canvas, callback = (event) => this._simulation.toggleRunStatus()) {
        canvas.htmlCanvas.removeEventListener("click", this._onCanvasClickEventHandler);
    }

    /**
     * Adds a custom event listener (callback function) to a control.
     */
    add(control) {
        control.htmlElement.addEventListener(control.actionType, (event) => {
            if (control.htmlSpanElement)
                this._updateValueInReadOut(control, event.target.value);
            control.callbackFunction(event);

            // After user interaction, all views need to be rendered/updated, as static views may have changed too!
            this._simulation.forceAllViewsToBeRendered = true;
        });
    }

    _updateValueInReadOut(control, value) {
        const numberValue = Number(value);
        if (typeof value === 'boolean')
            control.htmlSpanElement.innerText = value ? 'true' : 'false';
        else if (Number.isNaN(numberValue))
            control.htmlSpanElement.innerText = value;
        else
            control.htmlSpanElement.innerText = numberValue.toFixed(2);
    }

    /**
     * Sets a value from the control for a property an any type of object, as long as it exposes the property name.
     */
    attach(control) {
        control.htmlElement.addEventListener(control.actionType, (event) => {
            const target = event.target;
            const value = target.type === 'checkbox' ? target.checked : target.value;
            control.objectToModify[control.objectPropertyName] = value;

            if (control.htmlSpanElement)
                this._updateValueInReadOut(control, value);

            // After user interaction, all views need to be rendered/updated, as static views may have changed too!
            this._simulation.forceAllViewsToBeRendered = true;
        });
    }
}
