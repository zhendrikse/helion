import {
    Block, Box, Colour, RadialSymmetricBody, sampleNormalDistribution, Simulation, Sphere, BindableCollection,
    Vec3, ViewsCollection
} from "../../../src/index.js";

const hollowSize = new Vec3(5, 12, .01);
const permeableLayerSize = new Vec3(0.2, 12, 1);
const hollow = new Block({ size: hollowSize });
const bowl = new Block({ size: new Vec3(22, 12, 7) });
const permeable_layer = new Block({ size: permeableLayerSize });

const box_size = new Vec3(hollowSize.x, hollowSize.y, hollowSize.z).multiplyScalar(.5);
const K = 100000;
const drag = 800;
const E = new Vec3(0, 0, 0);
const k = 9e9;
const g = new Vec3(0, -5000, 0);

class Particle extends RadialSymmetricBody {
    constructor(position, radius, mass=0.3) {
        super({ position, radius });
        this._q0 = 1e-4;
        this._mass = mass;
        this._momentum = new Vec3(0, 0, 0);
        this._force = new Vec3(0, 0, 0);
    }
    
    initialize(v0) {
        const v = sampleNormalDistribution(v0, 1)
        if (this.radius === 0.5)
            this._mass = 0.13
        else if (this.radius === 0.4)
            this._mass = 0.08

        this._momentum = new Vec3(2 * Math.random() - 1, 2 * Math.random() - 1, 2 * Math.random() - 1)
            .normalize()
            .multiplyScalar(v * this._mass);
        this.radius = this.radius / 1.5;
    }
    
    initialize_force() {
        // Keep the force terms separate, as in the original VPython demo:
        // F = -drag * momentum + q * E + mass * g.
        this._force = this._momentum.clone().multiplyScalar(-drag)
            .add(E.clone().multiplyScalar(this._q0))
            .add(g.clone().multiplyScalar(this._mass));
    }
    
     update(dt) {
         this._momentum.add(this._force.clone().multiplyScalar(dt));
         this.position.add(this._momentum.clone().multiplyScalar(dt / this._mass));
         this._force.set(0, 0, 0);
     }

    collide_with(other_ball) {
        const rt = this.positionVectorTo(other_ball);
        const length = rt.length();
        if (length < 0.01) {
            this._force.set(0, 0, 0);
        } else if (length < 1.5) {
            const mag_rt_squared = this.distanceToSquared(other_ball);
            const mag_rt_cubed = mag_rt_squared * length;
            this._force.add(rt.clone().normalize().multiplyScalar(k * this._q0 * other_ball._q0 / mag_rt_squared));
            this._force.add(rt.clone().normalize().multiplyScalar(-3 * k * this._q0 * other_ball._q0 / mag_rt_cubed));
        }
    }
    
    process_box_collisions(dt) {
        const r = this.position;
        if (r.x > box_size.x)
            this._force.x += -K * (Math.abs(r.x) - box_size.x);
        if (r.x < -box_size.x)
            this._force.x += K * (Math.abs(r.x) - box_size.x);
        if (r.y > box_size.y)
            this._force.y += -K * (Math.abs(r.y) - box_size.y);
        if (r.y < -box_size.y)
            this._force.y += K * (Math.abs(r.y) - box_size.y);
        if (r.z > box_size.z)
            this._force.z += -K * (Math.abs(r.z) - box_size.z);
        if (r.z < -box_size.z)
            this._force.z += K * (Math.abs(r.z) - box_size.z);

        this._momentum.add(new Vec3(2 * Math.random() - 1, 2 * Math.random() - 1, 2 * Math.random() - 1).multiplyScalar(7));
        let left_count = 0;
        let right_count = 0;

        if (this.isLayerSensitive() && r.x < permeableLayerSize.x)
            this._force.x += -K * (r.x - permeableLayerSize.x);

        if (this.position.x > permeableLayerSize.x)
            right_count += 1;
        else
            left_count += 1;

        this._momentum.add(this._force.clone().multiplyScalar(dt));
        this.position.add(this._momentum.clone().multiplyScalar(dt / this._mass));
    }

    isLayerSensitive() {
        return true;
    }
}

class Jar {
    constructor(total_balls=40, v0=0) {
        this._balls = []
        this._create_balls(total_balls)
        this._initialize_ball_movements(v0)
    }

    get balls() { return this._balls; }

    _initialize_ball_movements(v0) {
        for (const particle of this._balls)
            particle.initialize(v0);
    }
    
    _create_balls(total_balls) {
        while (this._balls.length < total_balls) {
            const rt = new Vec3(2 * Math.random() - 1, 2 * Math.random() - 1, 0).multiplyScalar(10);
            const decider = Math.random();
            if (decider < 0.0 &&
                rt.x > permeable_layer.size.x &&
                Math.abs(rt.x) <= box_size.x &&
                Math.abs(rt.y) <= box_size.y &&
                Math.abs(rt.z) <= box_size.z)
                this._balls.push(new Block({position: rt.clone(), size: new Vec3(0.7, 0.7, 0.7)}));
            else if (Math.abs(rt.x) <= box_size.x &&
                Math.abs(rt.y) <= box_size.y &&
                Math.abs(rt.z) <= box_size.z)
                this._balls.push(new Particle(rt, 0.6));
        }

        const extra_balls = 30
        for (let i = 0; i < extra_balls; i++) {
            let position = new Vec3(2 * Math.random() - 1, 2 * Math.random() - 1, 0);
            this._balls.push(new Particle(position, 0.5, 0.03));
            position = new Vec3(2 * Math.random() - 1, 2 * Math.random() - 1, 0)
            this._balls.push(new Particle(position, 0.4, 0.01));
        }
    }

    update(dt) {
        for (let i = 0; i < this._balls.length; i++) {
            this._balls[i].initialize_force();
            for (let j = 0; j < this._balls.length; j++) {
                if (i === j)
                    continue;

                this._balls[i].collide_with(this._balls[j]);
            }
            this._balls[i].update(dt);
        }

        for (const particle of this._balls)
            particle.process_box_collisions(dt);
    }
}

const jar = new Jar();
const balls = new BindableCollection();
jar.balls.forEach(ball => balls.add(ball));

Simulation
    .with({
        htmlDivId: 'fluidLayersContainer',
        camera: { position: new Vec3(10, 10, 10) }
    })
    .bind(balls.alwaysWith(ViewsCollection.of(Sphere).with({ color: Colour.Yellow })))
    .runsEvery(0.001)
    .onStep((clock, dt) => {
        // Advance the simulation once per step. A while-loop here would
        // never finish because simulatedTime advances outside this callback.
        if (clock.simulatedTime < 300)
            jar.update(dt);
    })
    .start();
