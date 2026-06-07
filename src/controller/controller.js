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
//
// export class HtmlSelect {
//     static populate(selectId, values) {
//         const select = document.getElementById(selectId);
//
//         select.innerHTML = "";
//
//         for (const key of Object.keys(values)) {
//             const option = document.createElement("option");
//             option.value = key;
//             option.textContent = key;
//             select.appendChild(option);
//         }
//     }
// }
//
// export class Registry {
//     constructor(entries = {}) {
//         this._entries = entries;
//     }
//
//     get(name) {
//         return this._entries[name];
//     }
//
//     names() {
//         return Object.keys(this._entries);
//     }
//
//     add(name, value) {
//         this._entries[name] = value;
//     }
// }
//
// export const ColorMappers = new Registry({
//     RdYlBu: new RdYlBuColorMapper(),
//     Seismic: new SeismicColorMapper(),
//     Viridis: new ViridisColorMapper(),
//     ...
// });
//
// HtmlSelect.populate(
//     "colorMapSelect",
//     ColorMappers.names()
// );
//
// export const SurfaceViews = new Registry({
//     Surface: StandardSurfaceView,
//     Spheres: SphereSurfaceView,
//     Points: PointSurfaceView,
//     Squares: SquareSurfaceView
// });
//
// export const SurfaceViews = {
//     Surface: {
//         label: "Surface",
//         constructor: StandardSurfaceView
//     },
//
//     Spheres: {
//         label: "Spheres",
//         constructor: SphereSurfaceView
//     },
//
//     Points: {
//         label: "Points",
//         constructor: PointSurfaceView
//     }
// };
//
// {
//     label: "Spheres",
//         icon: "⚫",
//     category: "Discrete",
//     constructor: SphereSurfaceView
// }
