import {generateUUID} from "../model/math/math.js";

export class Registry {
    constructor({
        id = generateUUID(),
        label = 'registryLabel',
        entries = {}
    }) {
        this._entries = entries;
        this._label = label;
        this._id = id;
    }

    /**
     * @param {string} name
     * @returns {any}
     */
    get(name) { return this._entries[name]; }

    get label() { return this._label; }
    get id() { return this._id; }
    get names() { return Object.keys(this._entries); }

    /**
     * @param {string} name
     * @param {any} value
     * @returns {any}
     */
    add(name, value) { this._entries[name] = value; }
}
