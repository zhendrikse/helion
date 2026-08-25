import {
    Euler, MeshStandardMaterial, Quaternion, Vector3
} from 'three';
import {Block, Box, Simulation, Slider, Vec3, Range, Button, Transformation} from "../../../src/index.js";

const SIZE = 1;
const GAP = 0.06;
const STEP = SIZE + GAP;
const STICKER_OFFSET = 0.515;

const vec = (x, y, z) => new Vec3(x, y, z);
const Direction = Object.freeze({
    forward: 1,
    backward: -1
});

const Axis = Object.freeze({
    x: "x",
    y: "y",
    z: "z"
})

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

const FaceCoordinate = Object.freeze({
    right:  1,
    left:  -1,
    up:     1,
    down:  -1,
    front:  1,
    back:  -1
});

const Face = Object.freeze({
    right:  "right",
    left:   "left",
    up:     "up",
    down:   "down",
    front:  "front",
    back:   "back"
});

const sidesFrom = (x, y, z) => {
    const sides = [];
    if (z === 1)
        sides.push(Face.front);

    if (z === -1)
        sides.push(Face.back);

    if (x === 1)
        sides.push(Face.right);

    if (x === -1)
        sides.push(Face.left);

    if (y === 1)
        sides.push(Face.up);

    if (y === -1)
        sides.push(Face.down);

    return sides;
}

function rotateDiscrete(vector, axis, direction) {
    const {x, y, z} = vector;

    if (axis === Axis.x)
        return direction === Direction.forward ? vec(x, -z, y) : vec(x, z, -y);

    if (axis === Axis.y)
        return direction === Direction.forward ? vec(z, y, -x) : vec(-z, y, x);

    if (axis === Axis.z)
        return direction === Direction.forward ? vec(-y, x, z) : vec(y, -x, z);

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
    constructor(cubiePosition, side, stickerData) {
        super({ size: new Vec3(0.85, 0.85, 0.035) });
        this._side = side;
        this.normal= stickerData.normal.clone(); // Normal vector with respect to coordinate frame of cube
        this.orientation = stickerData.orientation.clone();
        this.update(cubiePosition);
    }

    update(cubiePosition) {
        this.position.set(
            cubiePosition.x + this.normal.x * STICKER_OFFSET,
            cubiePosition.y + this.normal.y * STICKER_OFFSET,
            cubiePosition.z + this.normal.z * STICKER_OFFSET
        );
    }

    rotate(axis, direction) {
        this.normal = rotateDiscrete(this.normal, axis, direction);
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
        this._sides = sidesFrom(x, y, z);
        this._sides.forEach(side => this._stickers.push(new Sticker(this.position, side, StickerData[side])));
    }

    /**
     * @returns {ArrayIterator<Sticker>}
     */
    [Symbol.iterator]() {
        return this._stickers[Symbol.iterator]();
    }

    update(axis, direction, startOrientation) {
        this._grid = rotateDiscrete(this._grid, axis, direction);
        this.position.set(this._grid.x * STEP, this._grid.y * STEP, this._grid.z * STEP);
        this.orientation.copy(rotatedOrientation(startOrientation, axis, direction * Math.PI / 2));
        for (const sticker of this) {
            sticker.rotate(axis, direction);
            sticker.update(this.position);
        }
        this._sides = sidesFrom(this._grid.x, this._grid.y, this._grid.z);
    }
}

class Move extends Transformation {
    static MovesGroup = {
        r: { axis: Axis.x, direction: Direction.backward, side: Face.right },
        l: { axis: Axis.x, direction: Direction.forward,  side: Face.left },
        u: { axis: Axis.y, direction: Direction.backward, side: Face.up },
        d: { axis: Axis.y, direction: Direction.forward,  side: Face.down },
        f: { axis: Axis.z, direction: Direction.backward, side: Face.front },
        b: { axis: Axis.z, direction: Direction.forward,  side: Face.back }
    };

    constructor(key, reverse=false) {
        super();
        this._key = key.toLowerCase();
        this._direction = reverse ? -Move.MovesGroup[this._key].direction : Move.MovesGroup[this._key].direction;
    }

    get moveData() { return Move.MovesGroup[this._key]; }
    get direction() { return this._direction; }

    applyTo(cube) {
        if (!Move.MovesGroup[this._key])
            return;

        cube.addToQueue(this);
        cube.processQueue();
    }
}

class Cube {
    constructor() {
        this._cubies = [];

        for (let x = FaceCoordinate.left; x <= FaceCoordinate.right; x++)
            for (let y = FaceCoordinate.down; y <= FaceCoordinate.up; y++)
                for (let z = FaceCoordinate.back; z <= FaceCoordinate.front; z++)
                    this._cubies.push(new Cubie(x, y, z));

        this._rotating = false;
        this._queue = [];
        this._rotation = null;
        this._duration = 500;
    }

    cubiesInLayerFor = (move) => this._cubies.filter(cubie => cubie._sides.includes(move.side));

    apply(move) {
        move.applyTo(this);
    }

    /**
     * @returns {ArrayIterator<Cubie>}
     */
    [Symbol.iterator]() {
        return this._cubies[Symbol.iterator]();
    }

    addToQueue(move) {
        this._queue.push(move);
    }

    processQueue() {
        if (this._rotating)
            return;

        if (this._queue.length === 0)
            return;

        const move = this._queue.shift();
        this.rotateLayer(move);
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

    update(timeStamp) {
        if (!this._rotation)
            return;

        const rotation = this._rotation;

        if (rotation.start === null)
            rotation.start = timeStamp;

        const elapsed = timeStamp - rotation.start;
        const progress = Math.min(elapsed / rotation.duration, 1);
        const smooth = progress * progress * (3 - 2 * progress);
        const angle = rotation.direction * Math.PI / 2 * smooth;

        const { layer, move } = rotation;

        // Cubies
        for (let row = 0; row < layer.length; row++) {
            const cubie = layer[row];
            const position = this.#rotateContinuous(rotation.startPositions[row], move.axis, angle);
            cubie.position.copy(position);
            cubie.orientation.copy(rotatedOrientation(rotation.startOrientations[row], move.axis, angle));

            // Stickers
            let col = 0;
            for (const sticker of cubie) {
                const normal = this.#rotateContinuous(rotation.startNormals[row][col], move.axis, angle);
                sticker.position.set(
                    position.x + normal.x * STICKER_OFFSET,
                    position.y + normal.y * STICKER_OFFSET,
                    position.z + normal.z * STICKER_OFFSET
                );

                sticker.orientation.copy(rotatedOrientation(rotation.startStickerOrientations[row][col], move.axis, angle));
                col++;
            }
        }

        if (progress >= 1)
            this.finishRotation();
    }

    rotateLayer(move) {
        const layer = this.cubiesInLayerFor(move.moveData);
        this._rotating = true;
        this._rotation = {
            layer,
            move: move.moveData,
            direction: move.direction,
            startPositions: layer.map(cubie => cubie.position.clone()),
            startOrientations: layer.map(cubie => cubie.orientation.clone()),
            startNormals: layer.map(cubie => Array.from(cubie, sticker => sticker.normal.clone())),
            startStickerOrientations: layer.map(cubie => Array.from(cubie, sticker => sticker.orientation.clone())),
            start: null,
            duration: this._duration
        };
    }

    set duration(value) { this._duration = value; }

    finishRotation() {
        const rotation = this._rotation;
        const {layer, move, direction} = rotation;

        for (let i = 0; i < layer.length; i++) {
            const cubie = layer[i];
            cubie.update(move.axis, direction, rotation.startOrientations[i]);
        }

        this._rotation = null;
        this._rotating = false;

        this.processQueue();
    }
}

const cube = new Cube();

const simulation = Simulation.with(
    {
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
                        .togetherWith(new Button().withText("L").addEventListener("click", () => cube.apply(new Move("l")))
                        )
                    )
                )
            )
        )
    )
    .append(new Button("Backward: ").withText("F").addEventListener("click", () => cube.apply(new Move("f", true)))
        .togetherWith(new Button().withText("B").addEventListener("click", () => cube.apply(new Move("b", true)))
            .togetherWith(new Button().withText("U").addEventListener("click", () => cube.apply(new Move("u", true)))
                .togetherWith(new Button().withText("D").addEventListener("click", () => cube.apply(new Move("d", true)))
                    .togetherWith(new Button().withText("R").addEventListener("click", () => cube.apply(new Move("r", true)))
                        .togetherWith(new Button().withText("L").addEventListener("click", () => cube.apply(new Move("l", true)))
                        )
                    )
                )
            )
        )
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

    for (const sticker of cubie) {
        simulation.bind(sticker.alwaysWith(
            new Box({
                color: Colors[sticker.side],
                material: new MeshStandardMaterial({
                    emissive: Colors[sticker.side],
                    emissiveIntensity: 0.2,
                    roughness: 0.45
                })
            })
        ));
    }
}

const validKeys = new Set(["r", "l", "u", "d", "f", "b"]);
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (!validKeys.has(key))
        return;

    cube.apply(new Move(key, event.shiftKey));
});
