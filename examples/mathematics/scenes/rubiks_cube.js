import {
    Euler, MeshStandardMaterial, Quaternion, Vector3
} from 'three';
import { Block, Box, Simulation, Slider, Vec3, Range } from "../../../src/index.js";

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

const Side = Object.freeze({
    right:  1,
    left:  -1,
    up:     1,
    down:  -1,
    front:  1,
    back:  -1
});

const SideNew = Object.freeze({
    right:  { name: "right", normal: vec( 1,  0,  0) },
    left:   { name: "left",  normal: vec(-1,  0,  0) },
    up:     { name: "up",    normal: vec( 0,  1,  0) },
    down:   { name: "down",  normal: vec( 0, -1,  0) },
    front:  { name: "front", normal: vec( 0,  0,  1) },
    back:   { name: "back",  normal: vec( 0,  0, -1) }
});

class Sticker extends Block {
    constructor(cubie, side) {
        super({ size: new Vec3(0.85, 0.85, 0.035) });
        this.cubie = cubie;
        this.side = side.name;
        this.normal = side.normal.clone(); // Normal vector with respect to coordinate frame of cube
        this.update();
    }

    update() {
        const p = this.cubie.position;
        this.position.set(
            p.x + this.normal.x * STICKER_OFFSET,
            p.y + this.normal.y * STICKER_OFFSET,
            p.z + this.normal.z * STICKER_OFFSET
        );

        this.orientation.copy(this.#orientationForNormal());
    }

    #orientationForNormal() {
        if (this.normal.z === Side.front)
            return vec(0, 0, 0);

        if (this.normal.z === Side.back)
            return vec(0, Math.PI, 0);

        if (this.normal.x === Side.right)
            return vec(0, Math.PI / 2, 0);

        if (this.normal.x === Side.left)
            return vec(0, -Math.PI / 2, 0);

        if (this.normal.y === Side.up)
            return vec(-Math.PI / 2, 0, 0);

        if (this.normal.y === Side.down)
            return vec(Math.PI / 2, 0, 0);

        return vec(0, 0, 0);
    }
}

class Cubie extends Block {
    constructor(x, y, z) {
        super({
            position: vec(x, y, z).multiplyScalar(STEP),
            size: new Vec3(SIZE, SIZE, SIZE)
        });
        this.grid = vec(x, y, z);
        this.stickers = [];

        if (z === Side.front)
            this.stickers.push(new Sticker(this, SideNew.front));

        if (z === Side.back)
            this.stickers.push(new Sticker(this, SideNew.back));

        if (x === Side.right)
            this.stickers.push(new Sticker(this, SideNew.right));

        if (x === Side.left)
            this.stickers.push(new Sticker(this, SideNew.left));

        if (y === Side.up)
            this.stickers.push(new Sticker(this, SideNew.up));

        if (y === Side.down)
            this.stickers.push(new Sticker(this, SideNew.down));
    }

    /**
     * @returns {ArrayIterator<Sticker>}
     */
    [Symbol.iterator]() {
        return this.stickers[Symbol.iterator]();
    }
}

class Cube {
    static MovesGroup = {
        r: {
            axis: Axis.x,
            layer: Side.right,
            direction: Direction.backward
        },
        l: {
            axis: Axis.x,
            layer: Side.left,
            direction: Direction.forward,
        },
        u: {
            axis: Axis.y,
            layer: Side.up,
            direction: Direction.backward
        },
        d: {
            axis: Axis.y,
            layer: Side.down,
            direction: Direction.forward
        },
        f: {
            axis: Axis.z,
            layer: Side.front,
            direction: Direction.backward
        },
        b: {
            axis: Axis.z,
            layer: Side.back,
            direction: Direction.forward
        }
    };

    constructor() {
        this.cubies = [];

        for (let x = Side.left; x <= Side.right; x++)
            for (let y = Side.down; y <= Side.up; y++)
                for (let z = Side.back; z <= Side.front; z++)
                    this.cubies.push(new Cubie(x, y, z));

        this.rotating = false;
        this.queue = [];
        this._rotation = null;
        this._duration = 500;
    }

    move(key, reverse = false) {
        key = key.toLowerCase();

        if (!Cube.MovesGroup[key])
            return;

        this.queue.push({key, reverse});
        this.processQueue();
    }

    /**
     * @returns {ArrayIterator<Cubie>}
     */
    [Symbol.iterator]() {
        return this.cubies[Symbol.iterator]();
    }

    processQueue() {
        if (this.rotating)
            return;

        if (this.queue.length === 0)
            return;

        const move = this.queue.shift();
        this.rotateLayer(move.key, move.reverse);
    }

    #rotatedOrientation(orientation, axis, angle) {
        const startRotation = new Quaternion().setFromEuler(new Euler(orientation.x, orientation.y, orientation.z));

        const axisVector = axis === Axis.x ? new Vector3(1, 0, 0) :
                axis === Axis.y ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);

        const rotation = new Quaternion().setFromAxisAngle(axisVector, angle);

        // World-space rotation vóór de bestaande orientation.
        rotation.multiply(startRotation);
        const result = new Euler().setFromQuaternion(rotation);
        return vec(result.x, result.y, result.z);
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

    #rotateDiscrete(v, axis, direction) {
        const {x, y, z} = v;

        if (axis === Axis.x)
            return direction === Direction.forward ? vec(x, -z, y) : vec(x, z, -y);

        if (axis === Axis.y)
            return direction === Direction.forward ? vec(z, y, -x) : vec(-z, y, x);

        if (axis === Axis.z)
            return direction === Direction.forward ? vec(-y, x, z) : vec(y, -x, z);

        return v.clone();
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

        const { selected, definition } = rotation;

        // Cubies
        for (let i = 0; i < selected.length; i++) {
            const cubie = selected[i];
            const position = this.#rotateContinuous(rotation.startPositions[i], definition.axis, angle);
            cubie.position.copy(position);
            cubie.orientation.copy(this.#rotatedOrientation(rotation.startOrientations[i], definition.axis, angle));

            // Stickers
            for (let j = 0; j < cubie.stickers.length; j++) {
                const sticker = cubie.stickers[j];
                const normal = this.#rotateContinuous(rotation.startNormals[i][j], definition.axis, angle);
                sticker.position.set(
                    position.x + normal.x * STICKER_OFFSET,
                    position.y + normal.y * STICKER_OFFSET,
                    position.z + normal.z * STICKER_OFFSET
                );

                sticker.orientation.copy(this.#rotatedOrientation(rotation.startStickerOrientations[i][j], definition.axis, angle));
            }
        }

        if (progress >= 1)
            this.finishRotation();
    }

    rotateLayer(key, reverse) {
        const definition = Cube.MovesGroup[key];
        this.rotating = true;
        const selected = this.cubies.filter(cubie => cubie.grid[definition.axis] === definition.layer);

        let direction = definition.direction;
        if (reverse)
            direction *= -1;

        this._rotation = {
            selected,
            definition,
            direction,

            startPositions: selected.map(cubie => cubie.position.clone()),
            startOrientations: selected.map(cubie => cubie.orientation.clone()),
            startNormals: selected.map(cubie => cubie.stickers.map(sticker => sticker.normal.clone())),
            startStickerOrientations: selected.map(cubie => cubie.stickers.map(sticker => sticker.orientation.clone())),
            start: null,
            duration: this._duration
        };
    }

    set duration(value) { this._duration = value; }

    finishRotation() {
        const rotation = this._rotation;
        const {selected, definition, direction} = rotation;

        for (let i = 0; i < selected.length; i++) {
            const cubie = selected[i];

            // Exact grid position
            cubie.grid = this.#rotateDiscrete(cubie.grid, definition.axis, direction);
            cubie.position.set(cubie.grid.x * STEP, cubie.grid.y * STEP, cubie.grid.z * STEP);

            // Exact orientation
            cubie.orientation.copy(this.#rotatedOrientation(rotation.startOrientations[i], definition.axis, direction * Math.PI / 2));

            // Exact sticker state
            for (const sticker of cubie) {
                sticker.normal = this.#rotateDiscrete(sticker.normal, definition.axis, direction);
                sticker.update();
            }
        }

        this._rotation = null;
        this.rotating = false;

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
        headUpDisplay: false
    })
    .onFrame(timeStamp => cube.update(timeStamp))
    .append(new Slider("Rotation speed")
        .on(cube)
        .withProperty("duration")
        .withValue(500)
        .withRange(new Range(10, 5000, 1))
    );

// Bind view to model
for (const cubie of cube) {
    simulation.bind(cubie.alwaysWith(new Box({ color: 0x111111 })));

    for (const sticker of cubie)
        simulation.bind(sticker.alwaysWith(
            new Box({
                color: Colors[sticker.side],
                material:  new MeshStandardMaterial({
                    emissive: Colors[sticker.side],
                    emissiveIntensity: 0.2,
                    roughness: 0.45
                })
            })
        ));
}

const validKeys = new Set(["r", "l", "u", "d", "f", "b"]);
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (!validKeys.has(key))
        return;

    cube.move(key, event.shiftKey);
});
