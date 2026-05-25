import {
    Group, Vector3,
    MeshStandardMaterial, Mesh, BufferGeometry, LineBasicMaterial, Line,
    BoxGeometry, Color, RepeatWrapping, DoubleSide,
    TextureLoader, Vector2, PlaneGeometry, EdgesGeometry, LineSegments
} from "three";

import woodWicketColorUrl from '../../../textures/Wood_Wicker_011_color.png';
import woodWicketNormalUrl from '../../../textures/Wood_Wicker_011_normal.png';
import woodWicketRoughnessUrl from '../../../textures/Wood_Wicker_011_roughness.png';
import pavingColorUrl from '../../../textures/paving_color.jpg';
import pavingRoughnessUrl from '../../../textures/paving_roughness.jpg';
import pavingNormalUrl from '../../../textures/paving_normal.jpg';

/*******************************************
 * Floor, Grid, Ceiling, Aquarium          *
 *******************************************/

class Grid extends Group {
    constructor({
                    size = 1,
                    granularity = 20,
                    y = 0,
                    color = 0x00ff00
                } = {}) {
        super();

        const step = (size * 2) / granularity;
        const material = new LineBasicMaterial({ color: color });
        for (let i = 0; i <= granularity; i++) {
            const x = -size + i * step;
            this.add(new Line(this.#verticalLine(x, y, size), material));
            this.add(new Line(this.#horizontalLine(x, y, size), material));
        }
    }

    #verticalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(x, y, -size), new Vector3(x, y, size)]);
    }

    #horizontalLine(x, y, size) {
        return new BufferGeometry().setFromPoints([new Vector3(-size, y, x), new Vector3(size, y, x)]);
    }
}

export class Floor extends Group {
    static Type = Object.freeze({
        PLAIN: "PLAIN",
        GRID: "Grid",
        PAVING: "Paving",
        WOOD_WICKER: "WoodWicker"  // https://3dtextures.me/2024/06/22/wood-wicker-011/
    });
    constructor({
                    type= Floor.Type.PLAIN,
                    position = new Vector3(),
                    planeSizeXy = new Vector2(2, 2),
                    granularity = 1,
                    color = 0x00ff00,
                    opacity = null,
                    receiveShadow = true
                } = {}) {
        super();
        const planeGeometry = new PlaneGeometry(planeSizeXy.x, planeSizeXy.y);
        const planeMaterial = new MeshStandardMaterial({
            normalScale: planeSizeXy,
            roughness: 1,
            transparent: opacity !== null,
            opacity: opacity ? opacity : 1,
            side: DoubleSide
            //occlusionMap: textureAmbientOcclusion,
            //alphaMap: textureOpacity,
            //aoMap: textureAmbientOcclusion,
            //aoMapIntensity: 0,
        });
        this._mesh = new Mesh(planeGeometry, planeMaterial);
        this._mesh.receiveShadow = receiveShadow;
        this._mesh.rotation.x = -Math.PI / 2;

        this.position.copy(position);
        this.add(this._mesh);

        const loader = new TextureLoader();
        switch (type) {
            case Floor.Type.PLAIN:
                this._mesh.material.color.set(color);
                break;
            case Floor.Type.GRID:
                this.add(new Grid({
                    color,
                    size: planeSizeXy.x * .5, // TODO enable rectangular formats
                    granularity: granularity
                }));
                break;
            case Floor.Type.PAVING:
                this._mesh.material.map = this._loadTexture(loader, pavingColorUrl, granularity);
                this._mesh.material.roughnessMap = this._loadTexture(loader, pavingRoughnessUrl, granularity);
                this._mesh.material.normalMap = this._loadTexture(loader, pavingNormalUrl, granularity);
                break;
            case Floor.Type.WOOD_WICKER:
                this._mesh.material.map = this._loadTexture(loader, woodWicketColorUrl, granularity);
                this._mesh.material.roughnessMap = this._loadTexture(loader, woodWicketRoughnessUrl, granularity);
                this._mesh.material.normalMap = this._loadTexture(loader, woodWicketNormalUrl, granularity);
                break;
        }
    }

    _loadTexture(loader, url, granularity) {
        const texture = loader.load(url);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(granularity, granularity);
        return texture;
    }

    get level() { return this.position.y; }
}

export class Ceiling extends Mesh {
    constructor({
                    position = new Vector3(0, 0, 0),
                    size = 12,
                    thickness = 0.75,
                    color = 0x8a8a8a
                } = {}) {
        const ceilingGeometry = new BoxGeometry(size, size, thickness);
        const ceilingMaterial = new MeshStandardMaterial({
            color: color,
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
    constructor({
                    position = new Vector3(0, 0, 0),
                    size = new Vector3(1, 1, 1),
                    opacity = 0.35,
                    contentColor = new Color(.1, .3, .78),
                    frameColor = 0xaa9900,
                    frameWidth = 1
                } = {}) {
        const geometry = new BoxGeometry(size.x, size.y, size.z);
        const material = new MeshStandardMaterial({
            color: contentColor,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            depthTest: true,
        });

        super(geometry, material);
        this.position.copy(position);
        this._size = size;

        // --- Edges ---
        const edges = new EdgesGeometry(geometry);
        const lineMaterial = new LineBasicMaterial({
            color: frameColor,
            linewidth: frameWidth,
            depthTest: true
        });

        const wireframe = new LineSegments(edges, lineMaterial);
        this.add(wireframe); // make it an integral part of the cube
    }

    get size() { return this._size;}
}
