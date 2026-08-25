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

function rotateDiscrete(vector, move) {
    const {x, y, z} = vector;

    if (move.axis === Axis.x)
        return move.direction === Direction.forward ? vec(x, -z, y) : vec(x, z, -y);

    if (move.axis === Axis.y)
        return move.direction === Direction.forward ? vec(z, y, -x) : vec(-z, y, x);

    if (move.axis === Axis.z)
        return move.direction === Direction.forward ? vec(-y, x, z) : vec(y, -x, z);

    return vector.clone();
}

function rotatedOrientation(orientation, axis, angle) {
    const startRotation = new Quaternion().setFromEuler(new Euler(orientation.x, orientation.y, orientation.z));

    const axisVector = axis === Axis.x ? new Vector3(1, 0, 0) :
        axis === Axis.y ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);

    const rotation = new Quaternion().setFromAxisAngle(axisVector, angle);

    // World-space rotation vóór de bestaande orientation.
    rotation.multiply(startRotation);
    const result = new Euler().setFromQuaternion(rotation);
    return vec(result.x, result.y, result.z);
}

class Sticker extends Block {
    constructor(position, side, stickerData) {
        super({ size: new Vec3(0.85, 0.85, 0.035) });
        this._side = side;
        this.normal= stickerData.normal.clone(); // Normal vector with respect to coordinate frame of cube
        this.orientation = stickerData.orientation.clone();
        this.update(position);
    }

    update(position, normal=this.normal) {
        this.position.set(
            position.x + normal.x * STICKER_OFFSET,
            position.y + normal.y * STICKER_OFFSET,
            position.z + normal.z * STICKER_OFFSET
        );
    }

    rotate(move) {
        this.normal = rotateDiscrete(this.normal, move);
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

    update(move, startOrientation) {
        this._grid = rotateDiscrete(this._grid, move);
        this.position.set(this._grid.x * STEP, this._grid.y * STEP, this._grid.z * STEP);
        this.orientation.copy(rotatedOrientation(startOrientation, move.axis, move.direction * Math.PI / 2));
        for (const sticker of this) {
            sticker.rotate(move);
            sticker.update(this.position);
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
        this.direction = reverse ? -data.direction : data.direction;
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
        this._startOrientations = this._cubies.map(cubie => cubie.orientation.clone());
        this._startNormals = this._cubies.map(cubie => Array.from(cubie, sticker => sticker.normal.clone()));
        this._startStickerOrientations = this._cubies.map(cubie => Array.from(cubie, sticker => sticker.orientation.clone()));
        Object.freeze(this);
    }

    commit(move) {
        this._cubies.forEach((cubie, index) => cubie.update(move, this._startOrientations[index]));
    }

    #rotateContinuous(pos, axis, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        if (axis === Axis.x)
            return vec(pos.x, cos * pos.y - sin * pos.z, sin * pos.y + cos * pos.z);

        if (axis === Axis.y)
            return vec(cos * pos.x + sin * pos.z, pos.y, -sin * pos.x + cos * pos.z);

        if (axis === Axis.z)
            return vec(cos * pos.x - sin * pos.y, sin * pos.x + cos * pos.y, pos.z);

        return pos.clone();
    }

    animate(progress, axis, direction) {
        const smooth = progress * progress * (3 - 2 * progress);
        const angle = direction * Math.PI / 2 * smooth;

        this._cubies.forEach((cubie, row) => {
            cubie.position.copy(this.#rotateContinuous(this._startPositions[row], axis, angle));
            cubie.orientation.copy(rotatedOrientation(this._startOrientations[row], axis, angle));

            // Stickers
            let col = 0;
            for (const sticker of cubie) {
                const normal = this.#rotateContinuous(this._startNormals[row][col], axis, angle);
                sticker.update(cubie.position, normal);
                sticker.orientation.copy(rotatedOrientation(this._startStickerOrientations[row][col], axis, angle));
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
        rotation.layer.animate(progress, rotation.move.axis, rotation.move.direction);

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
