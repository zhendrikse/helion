import {
    Scene, Group, Fog, Color
} from "three";
import { SkyDome } from "./composite/backgrounds.js";

export class ThreeJsScene {
    static Background = Object.freeze({
        PLAIN: "Plain",
        FOG: "Fog",
        TRANSPARENT: "Transparent",
        STARS: "Stars"
    });

    constructor(cameraPosition, {
        background = ThreeJsScene.Background.TRANSPARENT,
        backgroundColor = 0x0088ff,
        scale = 1
    } = {}) {
        // this._backgroundType = background;
        // this._backgroundColor = backgroundColor;
        // this._scale = scale;

        this._scene = new Scene();
        this._world = new Group();
        this._background = new Group();
        this._scene.add(this._world, this._background);
        this._skydome = null;

        this._world.scale.setScalar(scale);

        this.#initBackground(cameraPosition, background, backgroundColor);
    }

    get skydome() { return this._skydome; }

    #initBackground(cameraPosition, background, backgroundColor) {
        switch (background) {
            case ThreeJsScene.Background.PLAIN:
                this._scene.background = new Color(backgroundColor);
                break;
            case ThreeJsScene.Background.FOG:
                this._scene.background = new Color(backgroundColor);
                this._scene.fog = new Fog(backgroundColor, 1, 100);
                break;
            case ThreeJsScene.Background.STARS:
                this._skydome = new SkyDome({
                    skyRadius: cameraPosition.clone().length() * 10,
                    blinkSpeed: 2.5
                });
                this._background.add(this._skydome);
                break;
            case ThreeJsScene.Background.TRANSPARENT:
            default:
                break;
        }
    }

    addToWorld(threeJsObject) {
        this._world.add(threeJsObject);
    }

    addLight(light) {
        this._scene.add(light);
    }

    get scene() { return this._scene; }

    removeFromWorld(view) {
        this._world.remove(view);
    }
}