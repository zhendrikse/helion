import { MeshStandardMaterial } from 'three';
import { Block, Box, Simulation, Vec3 } from "../../../src/index.js";

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

    #orientationForContinuousNormal(normalVector) {
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

    rotateLayer(key, reverse) {
        this.rotating = true;
        const move = Cube.MovesGroup[key];
        const layer = this.cubies.filter(cubie => cubie.grid[move.axis] === move.layer);
        let direction = move.direction;

        if (reverse)
            direction *= -1;
        this.rotateIfNeeded(layer, move.axis, direction);
    }

    rotateIfNeeded(layer, axis, direction) {
        const startPositions = layer.map(cubie => cubie.position.clone());
        const startNormals = layer.map(cubie => cubie.stickers.map(sticker => sticker.normal.clone()));
        const duration = 180;
        const start = performance.now();

        const animate = now => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);

            // Smoothstep
            const smooth = progress * progress * (3 - 2 * progress);
            const angle = direction * Math.PI / 2 * smooth;

            // Animatie van de positie
            for (let i = 0; i < layer.length; i++) {
                const cubie = layer[i];
                const p = this.#rotateContinuous(startPositions[i], axis, angle);
                cubie.position.copy(p);

                for (let j = 0; j < cubie.stickers.length; j++) {
                    const sticker = cubie.stickers[j];
                    const normal = this.#rotateContinuous(startNormals[i][j], axis, angle);

                    // During the animation we temporarily keep track of the normal
                    sticker.position.set(
                        p.x + normal.x * STICKER_OFFSET,
                        p.y + normal.y * STICKER_OFFSET,
                        p.z + normal.z * STICKER_OFFSET
                    );

                    sticker.orientation.copy(this.#orientationForContinuousNormal(normal));
                }
            }

            if (progress >= 1)
                this.finishRotation(layer, axis, direction);
            else
                requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    finishRotation(layer, axis, direction) {
        for (const cubie of layer) {
            // Exact new grid position
            cubie.grid = this.#rotateDiscrete(cubie.grid, axis, direction);
            cubie.position.set(cubie.grid.x * STEP, cubie.grid.y * STEP, cubie.grid.z * STEP);

            // Exact rounding off of normal vectors
            for (const sticker of cubie) {
                sticker.normal = this.#rotateDiscrete(sticker.normal, axis, direction);
                sticker.update();
            }
        }

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
    });

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
