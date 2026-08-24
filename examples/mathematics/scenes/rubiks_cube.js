import { MeshStandardMaterial } from 'three';
import { Block, Box, Simulation, Vec3 } from "../../../src/index.js";

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

const SIZE = 1;
const GAP = 0.06;
const STEP = SIZE + GAP;
const STICKER_OFFSET = 0.515;

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
    });

const vec = (x, y, z) => new Vec3(x, y, z);

function rotateDiscrete(v, axis, direction) {
    const {x, y, z} = v;

    if (axis === Axis.x)
        return direction === Direction.forward ? vec(x, -z, y) : vec(x, z, -y);

    if (axis === Axis.y)
        return direction === Direction.forward ? vec(z, y, -x) : vec(-z, y, x);

    if (axis === Axis.z)
        return direction === Direction.forward ? vec(-y, x, z) : vec(y, -x, z);

    return v.clone();
}

class Sticker extends Block {
    constructor(cubie, normal) {
        super({ size: new Vec3(0.85, 0.85, 0.035) });
        this.cubie = cubie;
        this.normal = normal.clone(); // Normal vector with respect to coordinate frame of cube
        this.update();
    }

    update() {
        const p = this.cubie.position;
        this.position.set(
            p.x + this.normal.x * STICKER_OFFSET,
            p.y + this.normal.y * STICKER_OFFSET,
            p.z + this.normal.z * STICKER_OFFSET
        );

        this.orientation.copy(orientationForNormal(this.normal));
    }
}

function orientationForNormal(normalVector) {
    if (normalVector.z === Side.front)
        return vec(0, 0, 0);

    if (normalVector.z === Side.back)
        return vec(0, Math.PI, 0);

    if (normalVector.x === Side.right)
        return vec(0, Math.PI / 2, 0);

    if (normalVector.x === Side.left)
        return vec(0, -Math.PI / 2, 0);

    if (normalVector.y === Side.up)
        return vec(-Math.PI / 2, 0, 0);

    if (normalVector.y === Side.down)
        return vec(Math.PI / 2, 0, 0);

    return vec(0, 0, 0);
}

class Cubie {
    constructor(x, y, z) {
        this.grid = vec(x, y, z);
        this.position = vec(x, y, z).multiplyScalar(STEP);
        this.block = new Block({
            position: this.position,
            size: new Vec3(SIZE, SIZE, SIZE)
        });

        const body = new Box({ color: 0x111111 });
        simulation.bind(this.block.alwaysWith(body));
        this.stickers = [];

        if (z === Side.front)
            this.#addSticker(Colors.front, vec(0, 0, Side.front));

        if (z === Side.back)
            this.#addSticker(Colors.back, vec(0, 0, Side.back));

        if (x === Side.right)
            this.#addSticker(Colors.right, vec(Side.right, 0, 0));

        if (x === Side.left)
            this.#addSticker(Colors.left, vec(Side.left, 0, 0));

        if (y === Side.up)
            this.#addSticker(Colors.up, vec(0, Side.up, 0));

        if (y === Side.down)
            this.#addSticker(Colors.down, vec(0, Side.down, 0));
    }

    #addSticker(color, normal) {
        const sticker = new Sticker(this, normal);
        this.stickers.push(sticker);
        simulation.bind(sticker.alwaysWith(new Box({
            color,
            material:  new MeshStandardMaterial({
                emissive: color,
                emissiveIntensity: 0.2,
                roughness: 0.45
            })})));
    }

    updateStickers() {
        for (const sticker of this.stickers)
            sticker.update();
    }
}

class Cube {
    static Moves = {
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
    }

    move(key, reverse = false) {
        key = key.toLowerCase();

        if (!Cube.Moves[key])
            return;

        this.queue.push({key, reverse});
        this.processQueue();
    }

    processQueue() {
        if (this.rotating)
            return;

        if (this.queue.length === 0)
            return;

        const move = this.queue.shift();
        this.rotateLayer(move.key, move.reverse);
    }

    rotateLayer(key, reverse) {
        const definition = Cube.Moves[key];
        this.rotating = true;
        const selected = this.cubies.filter(cubie => cubie.grid[definition.axis] === definition.layer);
        let direction = definition.direction;

        if (reverse)
            direction *= -1;

        const startPositions = selected.map(cubie => cubie.position.clone());
        const startNormals = selected.map(cubie => cubie.stickers.map(sticker => sticker.normal.clone()));

        const duration = 180;
        const start = performance.now();

        const animate = now => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);

            // Smoothstep
            const smooth = progress * progress * (3 - 2 * progress);
            const angle = direction * Math.PI / 2 * smooth;

            // Animatie van de positie
            for (let i = 0; i < selected.length; i++) {
                const cubie = selected[i];
                const p = rotateContinuous(startPositions[i], definition.axis, angle);
                cubie.position.copy(p);
                cubie.block.position.copy(p);

                for (let j = 0; j < cubie.stickers.length; j++) {
                    const sticker = cubie.stickers[j];
                    const normal = rotateContinuous(startNormals[i][j], definition.axis, angle);

                    // During the animation we temporarily keep track of the normal
                    sticker.position.set(
                        p.x + normal.x * STICKER_OFFSET,
                        p.y + normal.y * STICKER_OFFSET,
                        p.z + normal.z * STICKER_OFFSET
                    );

                    sticker.orientation.copy(orientationForContinuousNormal(normal));
                }
            }

            if (progress < 1)
                requestAnimationFrame(animate);
            else
                this.finishRotation(selected, definition, direction);
        };

        requestAnimationFrame(animate);
    }

    finishRotation(selected, definition, direction) {
        for (const cubie of selected) {
            // Exact new grid position
            cubie.grid = rotateGrid(cubie.grid, definition.axis, direction);
            cubie.position.set(cubie.grid.x * STEP, cubie.grid.y * STEP, cubie.grid.z * STEP);
            cubie.block.position.copy(cubie.position);
            cubie.updateStickers();

            // Exact rounding off of normal vectors
            for (const sticker of cubie.stickers) {
                sticker.normal = rotateGrid(sticker.normal, definition.axis, direction);
                sticker.update();
            }
        }

        this.rotating = false;
        this.processQueue();
    }
}

const rotateGrid= (v, axis, direction) => rotateDiscrete(v, axis, direction);

function rotateContinuous(pos, axis, angle) {
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

function orientationForContinuousNormal(normalVector) {
    // Voor de animatie is de exacte oriëntatie minder
    // belangrijk dan de positie. We gebruiken hier
    // dezelfde conventie als de stickers.

    if (Math.abs(normalVector.z) > 0.99)
        return vec(0, normalVector.z > 0 ? Math.PI : 0, 0);

    if (Math.abs(normalVector.x) > 0.99)
        return vec(0, normalVector.x > 0 ? Math.PI / 2 : -Math.PI / 2, 0);

    if (Math.abs(normalVector.y) > 0.99)
        return vec(normalVector.y > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0);

    return vec(0, 0, 0);
}

const cube = new Cube();
const validKeys = new Set(["r", "l", "u", "d", "f", "b"]);
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (!validKeys.has(key))
        return;

    cube.move(key, event.shiftKey);
});
