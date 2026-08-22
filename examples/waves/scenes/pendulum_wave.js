import {
    Vec3, Simulation, Sphere, Floor, Vec2, AxialSymmetricBody, Cylinder, RadialSymmetricBody, ThreeJsScene
} from "../../../src/index.js";
import {Color, MeshStandardMaterial} from "three";

const g = 9.8;

class Pendulum extends AxialSymmetricBody {
    constructor({
        T,
        position,
        theta0 = Math.PI / 6,
        mass = 1,
        pivotY = -2
    } = {}) {
        super({
            position: new Vec3(position, pivotY, 0),
            axis: new Vec3(),
            radius: 0.01
        });
        this._xPosition = position;
        this._length = (T * T * 9.8) / (4 * Math.PI * Math.PI);

        this._ball = new RadialSymmetricBody({
            position: this.position,
            radius: 0.1
        })
        this._omega = 0;
        this._theta = theta0;
        this._mass = mass;
        this._pivotY = pivotY;

        this.updatePosition();
    }

    update(dt) {
        const alpha = (-g / this._length) * Math.sin(this._theta);
        this._omega += alpha * dt;
        this._theta += this._omega * dt;
        this.updatePosition();
    }

    updatePosition() {
        const newPos = new Vec3(
            this._xPosition,
            this._pivotY - this._length * Math.cos(this._theta),
            this._length * Math.sin(this._theta)
        );

        const pivot = new Vec3(this._xPosition, this._pivotY, 0);
        this.axis.copy(newPos.clone().sub(pivot).negate());
        this.state.position.copy(newPos);
    }

    reset() {
        super.reset();
        this._omega = 0;
        this._theta = Math.PI / 6;
        this.updatePosition();
    }
}

const Tpw = 50;
const N = 15;
const total = 20;

const Tmax = Tpw / N;
const Lmax = (Tmax ** 2 * 9.8) / (4 * Math.PI ** 2);
const width = Lmax;

const pendulums = [];
for (let i = 0; i < total; i++) {
    const T = Tpw / (N + i);
    const x = width * (-0.5 + i / (total - 1));
    pendulums.push(new Pendulum({
        T,
        position: x,
        pivotY: -2
    }));
}

const simulation = Simulation
    .with({
        htmlDivId: "pendulumWaveContainer",
        camera: {
            target: new Vec3(0.2, -3.3, -0.4),
            fieldOfView: 50,
            position: new Vec3(-5.5, -3.3, 0.4)
        },
        scene: {
            background: ThreeJsScene.Background.FOG,
        },
        lighting: {
            shadows: true
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .addObject3D(new Floor({
        position: new Vec3(0, -5, 0),
        planeSizeXy: new Vec2(100, 100),
        granularity: 15,
        type: Floor.Type.WOOD_WICKER
    }))
    .bind(new AxialSymmetricBody({
            axis: new Vec3(3, 0 , 0),
            position: new Vec3(-1.5, -2, 0),
            radius: 0.04
        }).alwaysWith(new Cylinder({ color: 0xDEB887 })))
    .bind(new AxialSymmetricBody({
            axis: new Vec3(0, -3 - 0.04 , 2),
            position: new Vec3(-1.5, -2, 0),
            radius: 0.04
        }).alwaysWith(new Cylinder({ color: 0x855E42 })))
    .bind(new AxialSymmetricBody({
            axis: new Vec3(0, -3 - 0.04 , -2),
            position: new Vec3(-1.5, -2, 0),
            radius: 0.04
        }).alwaysWith(new Cylinder({ color: 0x855E42 })))
    .bind(new AxialSymmetricBody({
            axis: new Vec3(0, -3 - 0.04 , 2),
            position: new Vec3(1.5, -2, 0),
            radius: 0.04
    }).alwaysWith(new Cylinder({ color: 0x855E42 })))
    .bind(new AxialSymmetricBody({
            axis: new Vec3(0, -3 - 0.04 , -2),
            position: new Vec3(1.5, -2, 0),
            radius: 0.04
        }).alwaysWith(new Cylinder({ color: 0x855E42 })))
    .onStep((clock, dt) => {
        for (const pendulum of pendulums)
         pendulum.update(dt);
    });

pendulums.forEach((pendulum, i) =>
    simulation.bind(pendulum._ball.alwaysWith(
        new Sphere({
            castShadow: true,
            color: new Color().setHSL(i / (total - 1), 1, 0.5)
        }))
    )
);

pendulums.forEach(pendulum =>
    simulation.bind(pendulum.alwaysWith(
        new Cylinder({
            color: 0xBB8F68,
            material: new MeshStandardMaterial({
                roughness: 0.8,
                metalness: 0.2
            }),
            castShadow: true
        }))
    )
);
