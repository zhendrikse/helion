import {
    Group, Vector3, MeshStandardMaterial, Mesh, BufferGeometry, LineBasicMaterial, BoxGeometry, RepeatWrapping,
    DoubleSide, Line, Texture, TextureLoader, Vector2, PlaneGeometry, EdgesGeometry, LineSegments
} from 'three';

import {Vec3, Vec2} from '../../../model/math/objects.js';
import { Colour } from '../../colormappers.js';

class Grid extends Group {
    /**
     * @param {{
     * size?: number,
     * granularity?: number
     * y?: number
     * color?: Colour
     * }} param0 
     */
    constructor({
        size = 1,
        granularity = 20,
        y = 0,
        color = Colour.Green
    } = {}) {
        super();

        const step = (size * 2) / granularity;
        const material = new LineBasicMaterial({ color: color.asThreeJsColor() });
        for (let i = 0; i <= granularity; i++) {
            const x = -size + i * step;
            this.add(new Line(this.#verticalLine(x, y, size), material));
            this.add(new Line(this.#horizontalLine(x, y, size), material));
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} size
     */
    #verticalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(x, y, -size), new Vector3(x, y, size)]);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} size
     */
    #horizontalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(-size, y, x), new Vector3(size, y, x)]);
    }
}

export class Floor extends Group {
    static loader = new TextureLoader();

    /**
     * @param {any} url
     * @param {number} granularity
     * @return {Texture}
     */
    static loadTexture = (url, granularity) => {
        const texture = Floor.loader.load(url);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(granularity, granularity);
        return texture;
    }

    static Type = Object.freeze({
        PLAIN: 'PLAIN',
        GRID: 'Grid',
        CUSTOM: 'Custom'
    });

    /**
     * 
     * @param {{
     * type?: string
     * position?: Vec3
     * planeSizeXy?: Vec2
     * granularity?: number
     * color?: Colour
     * opacity?: number
     * receiveShadow?: boolean
     * }} param0 
     */
    constructor({
        type= Floor.Type.CUSTOM,
        position = new Vec3(),
        planeSizeXy = new Vec2(2, 2),
        granularity = 1,
        color = Colour.Green,
        opacity = 1,
        receiveShadow = true,
        planeMaterial = new MeshStandardMaterial({
            normalScale: new Vector2(planeSizeXy.x, planeSizeXy.y),
            roughness: 1,
            transparent: opacity !== null,
            opacity: opacity,
            side: DoubleSide
        })
    } = {}) {
        super();
        const planeGeometry = new PlaneGeometry(planeSizeXy.x, planeSizeXy.y);
        this._mesh = new Mesh(planeGeometry, planeMaterial);
        this._mesh.receiveShadow = receiveShadow;
        this._mesh.rotation.x = -Math.PI / 2;

        this.position.set(position.x, position.y, position.z);
        this.add(this._mesh);

        switch (type) {
            case Floor.Type.PLAIN:
                color.asThreeJsColor(this._mesh.material.color);
                break;
            case Floor.Type.GRID:
                this.add(new Grid({
                    color,
                    size: planeSizeXy.x * .5, // TODO enable rectangular formats
                    granularity: granularity
                }));
                break;
            case Floor.Type.CUSTOM:
                if (!planeMaterial)
                    throw new Error('Plane material needs to be provided for a floor with custom texture.');
                this._mesh.material = planeMaterial;
                break;
        }
    }

    get level() { return this.position.y; }
}

export class Ceiling extends Mesh {
    constructor({
        position = new Vector3(0, 0, 0),
        size = 12,
        thickness = 0.75,
        color = new Colour(0x8a8a8a)
    } = {}) {
        const ceilingGeometry = new BoxGeometry(size, size, thickness);
        const ceilingMaterial = new MeshStandardMaterial({
            color: color.asThreeJsColor(),
            metalness: 0.05,
            roughness: 0.95,
            side: DoubleSide
        });
        ceilingMaterial.bumpScale = 0.05;
        super(ceilingGeometry, ceilingMaterial);
        this.rotation.x = Math.PI / 2;
        this.position.copy(position);
    }
}

export class Aquarium extends Mesh {
    /**
     * @param {{
     * position?: Vec3
     * size?: Vec3
     * opacity?: number
     * contentColor?: Colour
     * frameColor?: Colour
     * }} options 
     */
    constructor({
        position = new Vec3(0, 0, 0),
        size = new Vec3(1, 1, 1),
        opacity = 0.35,
        contentColor = new Colour(.1, .3, .78),
        frameColor = new Colour(0xaa9900)
    } = {}) {
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshStandardMaterial({
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            depthTest: true,
        });
        contentColor.asThreeJsColor(material.color);

        super(geometry, material);
        this.position.copy(position);
        this._size = size;

        // --- Edges ---
        const edges = new EdgesGeometry(geometry);
        const lineMaterial = new LineBasicMaterial({
            depthTest: true
        });
        frameColor.asThreeJsColor(lineMaterial.color);

        const wireframe = new LineSegments(edges, lineMaterial);
        this.add(wireframe); // make it an integral part of the cube
        this.scale.copy(size);
    }

    get size() { return this._size;}
}
