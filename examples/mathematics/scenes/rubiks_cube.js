import { Euler, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import {Block, Box, Simulation, Slider, Vec3, Range, Button, Transformation} from "../../../src/index.js";

const SIZE = 1;
const GAP = 0.06;
const STEP = SIZE + GAP;
const STICKER_OFFSET = 0.515;

const vec = (x, y, z) => new Vec3(x, y, z);

const Direction = Object.freeze({ forward: 1, backward: -1});
const Axis = Object.freeze({ x: "x",  y: "y", z: "z" })

const Colors = Object.freeze({
    right:  0xff0000,
    left:   0xff8800,
    back:   0xffff00,
    up:     0x3333cc,
    front:  0xffffff,
    down:   0x33cc33
});

const StickerData = Object.freeze({
    front: {orientation: vec(0, 0, 0), normal: vec( 0,  0,  1)},
    back:  {orientation: vec(0, Math.PI, 0), normal: vec( 0,  0, -1)},
    right: {orientation: vec(0, Math.PI / 2, 0), normal: vec( 1,  0,  0)},
    left:  {orientation: vec(0, -Math.PI / 2, 0), normal: vec(-1,  0,  0)},
    up:    {orientation: vec(-Math.PI / 2, 0, 0), normal: vec( 0,  1,  0)},
    down:  {orientation: vec(Math.PI / 2, 0, 0), normal: vec( 0, -1,  0)}
});

const Face = Object.freeze({
    right:  "right",
    left:   "left",
    up:     "up",
    down:   "down",
    front:  "front",
    back:   "back"
});

class Sticker extends Block {
    constructor(position, side, stickerData) {
        super({ size: new Vec3(0.85, 0.85, 0.035), orientation: stickerData.orientation.clone() });
        this._side = side;
        this.normal= stickerData.normal.clone(); // Normal vector with respect to coordinate frame of cube
        this.update(position);
        Object.freeze(this);
    }

    update(position, normal=this.normal) {
        this.position.set(
            position.x + normal.x * STICKER_OFFSET,
            position.y + normal.y * STICKER_OFFSET,
            position.z + normal.z * STICKER_OFFSET
        );
    }

    commit(move, cubePosition) {
        this.normal.rotate(move.axis, move.angle);
        this.update(cubePosition);
    }

    get side() { return this._side; }
}

class Cubie extends Block {
    constructor(x, y, z) {
        super({
            position: vec(x, y, z).multiplyScalar(STEP),
            size: new Vec3(SIZE, SIZE, SIZE)
        });

        this._grid = vec(x, y, z);
        this._stickers = [];
        this._startOrientation = this.orientation.clone();

        if (z === 1)
            this._stickers.push(new Sticker(this.position, Face.front, StickerData.front));

        if (z === -1)
            this._stickers.push(new Sticker(this.position, Face.back, StickerData.back));

        if (x === 1)
            this._stickers.push(new Sticker(this.position, Face.right, StickerData.right));

        if (x === -1)
            this._stickers.push(new Sticker(this.position, Face.left, StickerData.left));

        if (y === 1)
            this._stickers.push(new Sticker(this.position, Face.up, StickerData.up));

        if (y === -1)
            this._stickers.push(new Sticker(this.position, Face.down, StickerData.down));
    }

    isPartOfMove = (move) => this._grid[move.axis] === move.layer;

    /**
     * @returns {ArrayIterator<Sticker>}
     */
    [Symbol.iterator]() {
        return this._stickers[Symbol.iterator]();
    }

    commit(move) {
        const rotatedGrid = this._grid.clone().rotate(move.axis, move.angle);
        this._grid.set(Math.round(rotatedGrid.x), Math.round(rotatedGrid.y), Math.round(rotatedGrid.z));

        this.position.set(this._grid.x * STEP, this._grid.y * STEP, this._grid.z * STEP);
        this.rotateWorld(move.axis, move.angle);

        this._stickers.forEach(sticker => sticker.commit(move, this.position));
    }
}

class Move extends Transformation {
    static MovesGroup = Object.freeze({
        r: { axis: Axis.x, layer:  1, direction: Direction.backward },
        l: { axis: Axis.x, layer: -1, direction: Direction.forward  },
        u: { axis: Axis.y, layer:  1, direction: Direction.backward },
        d: { axis: Axis.y, layer: -1, direction: Direction.forward  },
        f: { axis: Axis.z, layer:  1, direction: Direction.backward },
        b: { axis: Axis.z, layer: -1, direction: Direction.forward  }
    });

    constructor(key, reverse=false) {
        super();
        const data = Move.MovesGroup[key.toLowerCase()];
        if (!data)
            throw new Error(`Unknown move: ${key}`);

        this.key = key.toLowerCase();
        this.axis = data.axis;
        this.layer = data.layer;
        const direction = reverse ? -data.direction : data.direction;
        this.angle = direction * Math.PI / 2;
        Object.freeze(this);
    }

    applyTo(cube) {
        cube.addToQueue(this);
        cube.processQueue();
    }
}

class Layer {
    constructor(cubies) {
        this._cubies = cubies;
        this._startPositions = this._cubies.map(cubie => cubie.position.clone());
        this._startStickerOrientations = this._cubies.map(cubie => Array.from(cubie, sticker => sticker.orientation.clone()));
        Object.freeze(this);
    }

    commit = move => this._cubies.forEach(cubie => cubie.commit(move));

    animate(progress, axis, angle) {
        const smoothAngle = angle * progress * progress * (3 - 2 * progress);
        this._cubies.forEach((cubie, row) => {
            cubie.position.copy(this._startPositions[row].clone().rotate(axis, smoothAngle));
            cubie.orientation .copy(cubie._startOrientation);
            cubie.rotateWorld(axis, smoothAngle);

            // Stickers
            let col = 0;
            for (const sticker of cubie) {
                const normal = sticker.normal.clone().rotate(axis, smoothAngle);
                sticker.update(cubie.position, normal);
                sticker.orientation.copy(this._startStickerOrientations[row][col]);
                sticker.rotateWorld(axis, smoothAngle);
                col++;
            }
        });
    }
}

class Cube {
    constructor() {
        this._cubies = [];
        for (let x = -1; x <= 1; x++)
            for (let y = -1; y <= 1; y++)
                for (let z = -1; z <= 1; z++)
                    this._cubies.push(new Cubie(x, y, z));

        this._rotating = false;
        this._queue = [];
        this._rotation = null;
        this._duration = 500;
    }

    cubiesInLayerFor = move => this._cubies.filter(cubie => cubie.isPartOfMove(move));

    apply = move => move.applyTo(this);

    addToQueue = move => this._queue.push(move);

    /**
     * @returns {ArrayIterator<Cubie>}
     */
    [Symbol.iterator]() {
        return this._cubies[Symbol.iterator]();
    }

    processQueue() {
        if (this._rotating || this._queue.length === 0)
            return;

        this.rotateLayer(this._queue.shift());
    }

    update(timeStamp) {
        if (!this._rotation)
            return;

        const rotation = this._rotation;
        if (rotation.start === null)
            rotation.start = timeStamp;

        const elapsed = timeStamp - rotation.start;
        const progress = Math.min(elapsed / this._duration, 1);
        rotation.layer.animate(progress, rotation.move.axis, rotation.move.angle);

        if (progress >= 1)
            this.finishRotation(rotation.layer, rotation.move);
    }

    rotateLayer(move) {
        const layer = new Layer(this.cubiesInLayerFor(move));
        this._rotating = true;
        this._rotation = {layer, move, start: null};
    }

    set duration(value) { this._duration = value; }

    finishRotation(layer, move) {
        layer.commit(move);
        this._rotation = null;
        this._rotating = false;
        this.processQueue();
    }
}

const cube = new Cube();

const simulation = Simulation.with({
        htmlDivId: "rubiksCubeContainer",
        infoPanel: {
            text: "<strong>Rubik's cube 🧊</strong><br>\n" +
                "R L B U F D = turn forward<br>\n" +
                "Shift + key = opposite direction"
        },
        camera: {
            position: new Vec3(9, 8, 11).multiplyScalar(.5),
            fieldOfView: 45
        },
        headUpDisplay: false,
        parameterMenuCollapsed: false
    })
    .onFrame(timeStamp => cube.update(timeStamp))
    .append(new Button("Forward: ").withText("F").addEventListener("click", () => cube.apply(new Move("f")))
        .togetherWith(new Button().withText("B").addEventListener("click", () => cube.apply(new Move("b")))
            .togetherWith(new Button().withText("U").addEventListener("click", () => cube.apply(new Move("u")))
                .togetherWith(new Button().withText("D").addEventListener("click", () => cube.apply(new Move("d")))
                    .togetherWith(new Button().withText("R").addEventListener("click", () => cube.apply(new Move("r")))
                        .togetherWith(new Button().withText("L").addEventListener("click", () => cube.apply(new Move("l"))))))))
    )
    .append(new Button("Backward: ").withText("F").addEventListener("click", () => cube.apply(new Move("f", true)))
        .togetherWith(new Button().withText("B").addEventListener("click", () => cube.apply(new Move("b", true)))
            .togetherWith(new Button().withText("U").addEventListener("click", () => cube.apply(new Move("u", true)))
                .togetherWith(new Button().withText("D").addEventListener("click", () => cube.apply(new Move("d", true)))
                    .togetherWith(new Button().withText("R").addEventListener("click", () => cube.apply(new Move("r", true)))
                        .togetherWith(new Button().withText("L").addEventListener("click", () => cube.apply(new Move("l", true))))))))
    )
    .append(new Slider("Rotation speed")
        .on(cube)
        .withProperty("duration")
        .withValue(500)
        .withRange(new Range(10, 1000, 1))
    );

// Bind view to model
for (const cubie of cube) {
    simulation.bind(cubie.alwaysWith(new Box({ color: 0x111111 })));

    for (const sticker of cubie)
        simulation.bind(sticker.alwaysWith(
            new Box({
                color: Colors[sticker.side],
                material: new MeshStandardMaterial({
                    emissive: Colors[sticker.side],
                    emissiveIntensity: 0.2,
                    roughness: 0.45
            })})));
}

const validKeys = new Set(["r", "l", "u", "d", "f", "b"]);
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (!validKeys.has(key))
        return;

    cube.apply(new Move(key, event.shiftKey));
});
