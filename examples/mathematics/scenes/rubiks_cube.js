import { MeshStandardMaterial } from 'three';
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
    front: { orientation: vec(0, 0, 0),            offset: vec(0, 0, STICKER_OFFSET) },
    back:  { orientation: vec(0, Math.PI, 0),         offset: vec(0, 0, -STICKER_OFFSET) },
    right: { orientation: vec(0, Math.PI / 2, 0),  offset: vec(STICKER_OFFSET, 0, 0) },
    left:  { orientation: vec(0, -Math.PI / 2, 0), offset: vec(-STICKER_OFFSET, 0, 0) },
    up:    { orientation: vec(-Math.PI / 2, 0, 0), offset: vec(0, STICKER_OFFSET, 0) },
    down:  { orientation: vec(Math.PI / 2, 0, 0),  offset: vec(0, -STICKER_OFFSET, 0) }
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
        super({
            size: new Vec3(0.85, 0.85, 0.035),
            orientation: stickerData.orientation.clone()
        });

        this.side = side;
        this.offset = stickerData.offset.clone();
        this.localOrientation = stickerData.orientation.clone();
        this.updateWorldPosition(position);
        Object.freeze(this);
    }

    updateWorldPosition(position, offset=this.offset) {
        this.position.set(position.x + offset.x, position.y + offset.y, position.z + offset.z);
    }
}


class StickerCollection {
    constructor() {
        this._stickers = [];
    }

    /**
     * @returns {ArrayIterator<Sticker>}
     */
    [Symbol.iterator]() {
        return this._stickers[Symbol.iterator]();
    }

    add(sticker) { this._stickers.push(sticker); }
}

class Cubie extends Block {
    constructor(x, y, z) {
        super({
            position: vec(x, y, z).multiplyScalar(STEP),
            size: new Vec3(SIZE, SIZE, SIZE)
        });

        this._grid = vec(x, y, z);
        this._stickers = new StickerCollection();

        if (z === 1)
            this._stickers.add(new Sticker(this.position, Face.front, StickerData.front));

        if (z === -1)
            this._stickers.add(new Sticker(this.position, Face.back, StickerData.back));

        if (x === 1)
            this._stickers.add(new Sticker(this.position, Face.right, StickerData.right));

        if (x === -1)
            this._stickers.add(new Sticker(this.position, Face.left, StickerData.left));

        if (y === 1)
            this._stickers.add(new Sticker(this.position, Face.up, StickerData.up));

        if (y === -1)
            this._stickers.add(new Sticker(this.position, Face.down, StickerData.down));
    }

    isPartOfMove = (move) => this._grid[move.axis] === move.layer;

    get stickers() { return this._stickers; }

    commit(move) {
        const rotatedGrid = this._grid.clone().rotate(move.axis, move.angle);

        this._grid.set(Math.round(rotatedGrid.x), Math.round(rotatedGrid.y), Math.round(rotatedGrid.z));
        this.position.set(this._grid.x * STEP, this._grid.y * STEP, this._grid.z * STEP);
        this.rotateWorld(move.axis, move.angle);
        for (const sticker of this._stickers) {
            sticker.offset.rotate(move.axis, move.angle);
            sticker.updateWorldPosition(this.position);
            sticker.localOrientation.copy(sticker.orientation);
        }
    }

    rotateStickers(axis, angle) {
        for (const sticker of this.stickers) {
            const offset = sticker.offset.clone().rotate(axis, angle);
            sticker.orientation.copy(sticker.localOrientation);
            sticker.updateWorldPosition(this.position, offset);
            sticker.rotateWorld(axis, angle);
        }
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

class Rotation {
    constructor(cubies) {
        this._cubies = cubies;
        this._startPositions = this._cubies.map(cubie => cubie.position.clone());
        this._startOrientations = this._cubies.map(cubie => cubie.orientation.clone());
        Object.freeze(this);
    }

    commit = move => this._cubies.forEach(cubie => cubie.commit(move));

    animate(progress, move) {
        const smoothAngle = move.angle * progress * progress * (3 - 2 * progress);
        this._cubies.forEach((cubie, row) => {
            cubie.position.copy(this._startPositions[row].clone().rotate(move.axis, smoothAngle));
            cubie.orientation.copy(this._startOrientations[row]);
            cubie.rotateWorld(move.axis, smoothAngle);
            cubie.rotateStickers(move.axis, smoothAngle);
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

        this._queue = [];
        this._currentMove = null;
        this._rotation = null;
        this._duration = 500;
        this._rotationStartTime = 0;
    }

    apply = move => move.applyTo(this);

    addToQueue = move => this._queue.push(move);

    /**
     * @returns {ArrayIterator<Cubie>}
     */
    [Symbol.iterator]() {
        return this._cubies[Symbol.iterator]();
    }

    #cubiesFor = move => this._cubies.filter(cubie => cubie.isPartOfMove(move));

    processQueue() {
        if (this._currentMove || this._queue.length === 0) // We cannot process a new move when a move is ongoing
            return;

        const move = this._queue.shift();
        this._currentMove = move;
        this._rotation = new Rotation(this.#cubiesFor(move));
    }

    evolve(timeStamp) {
        if (!this._rotation)
            return;

        if (this._rotationStartTime === 0)
            this._rotationStartTime = timeStamp;

        const elapsed = timeStamp - this._rotationStartTime;
        const progress = Math.min(elapsed / this._duration, 1);
        this._rotation.animate(progress, this._currentMove);

        if (progress >= 1)
            this.finishRotation();
    }

    set duration(value) { this._duration = value; }

    finishRotation() {
        this._rotation.commit(this._currentMove);
        this._rotation = null;
        this._currentMove = null;
        this._rotationStartTime = 0;
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
    .onFrame(timeStamp => cube.evolve(timeStamp))
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

    for (const sticker of cubie.stickers)
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
