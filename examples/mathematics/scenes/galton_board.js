import {
    Simulation, AxialSymmetricBody, BindableCollection, Cylinder, Sphere, RadialSymmetricBody, Vec3, ViewsCollection,
    Colour, Block, Box
} from "../../../src/index.js";

const num_nails = 10
const num_balls = 200

const bars = new BindableCollection()
    .add(new AxialSymmetricBody({ // Left
        position: new Vec3(-1 - num_nails, 18.5, 0),
        axis: new Vec3(0, -.1825 * num_balls, 0),
        radius: 0.175
    }))
    .add(new AxialSymmetricBody({ // Right
        position: new Vec3(num_nails + 1, 18.5, 0),
        axis: new Vec3(0, -.1825 * num_balls, 0),
        radius: 0.175
    }))
    .add(new AxialSymmetricBody({ // Bottom
        position: new Vec3(-num_nails - 1, 17 -.175 * num_balls, 0),
        axis: new Vec3(22, 0, 0),
        radius: 0.175
    }))
    .add(new AxialSymmetricBody({ // Top
        position: new Vec3(-num_nails - 1, 18.5, 0),
        axis: new Vec3(22, 0, 0),
        radius: 0.175
    }));

const pins = new BindableCollection();
for (let i = 0; i < num_nails; i++) {
    bars.add(new AxialSymmetricBody({
        position: new Vec3(i + .5 - num_nails / 2, 3.5, 0).multiplyScalar(2),
        axis: new Vec3(0, -.125 * num_balls, 0),
        radius: 0.175
    }));

    for (let j = -i; j < i + 1; j += 2)
        pins.add(new RadialSymmetricBody({
            position: new Vec3(j, 17 -i, 0),
            radius: 0.2
        }));
}

const simulation = new Simulation
    .with({
        htmlDivId: 'galtonBoardContainer',
        viewport: { aspectRatio: '3/4' },
        camera: { fieldOfView: 30, position: new Vec3(0, 0, 38), orthographic: true }
    })
    .bind(new Block({
            position: new Vec3(0, 0, -0.05),
            size: new Vec3(2 * (num_nails + 1.1), num_balls * .1825, .1)
        }).alwaysWith(new Box({ color: new Colour(0x855E42) }))
    )
    .onStep(() => {

    })
    .withMouseClickEventListener()
    .bind(bars.onceWith(ViewsCollection.of(Cylinder).with({color: new Colour(0xDEB887)})))
    .bind(pins.onceWith(ViewsCollection.of(Sphere).with({color: Colour.Yellow})));