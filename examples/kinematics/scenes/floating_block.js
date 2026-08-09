import {Vec3, Block, Simulation, Box, Aquarium, UniformGravitationalForce, DragForce, Force } from "../../../src/index.js";

const liquidDensity = 1000;
const g = -9.8;

class WoodenBlock extends Block {
    constructor({ density = 500, size = new Vec3(1, 1, 1) } = {}) {
        super({ size: size, mass: density * size.x * size.y * size.z });
    }

    submergedVolume(water) {
        const topFluid = water.position.y + water.size.y / 2;
        const topBlock = this.position.y + this.size.y / 2;
        const bottomBlock = this.position.y - this.size.y / 2;

        let hSubmerged = 0;
        if (topBlock <= topFluid)
            hSubmerged = this.size.y;
        else if (bottomBlock >= topFluid)
            hSubmerged = 0;
        else
            hSubmerged = topFluid - bottomBlock;

        return this.size.x * hSubmerged * this.size.z;
    }
}

class FloatingForce extends Force {
    constructor(water) {
        super();
        this._water = water;
    }

    _calculateForceOn() {
        this._forceVector.y = liquidDensity * -g * woodenBlock.submergedVolume(this._water);
    }

    applyTo(woodenBlock) {
        this._calculateForceOn(woodenBlock);
        woodenBlock.force.y += this._forceVector.y;
    }
}

const woodenBlock = new WoodenBlock({ size: new Vec3(0.4, 0.4, 0.1) });
const water = new Aquarium({
    color: 0x1e90ff,
    size: new Vec3(2, 2, 0.75),
    frameColor: 0xffff00
});
const floatingForce = new FloatingForce(water);
const gravitationalForce = new UniformGravitationalForce();
const dragForce = new DragForce();

const simulation = Simulation
    .with({
        htmlDivId: "floatingBlockContainer",
        cameraPosition: new Vec3(1, 0.4, 2).multiplyScalar(1.7),
        headUpDisplay: true
    })
    .addObject3D(water)
    .withMouseClickEventListener()
    .runsEvery(3e-3)
    .bind(woodenBlock.alwaysWith(new Box({ color: 0xdeb887 })))
    .onStep((clock) => {
        woodenBlock
            .apply(gravitationalForce)
            .apply(floatingForce)
            .apply(dragForce);
        woodenBlock.integrate(clock.fixedDt);
        simulation.plot([clock.simulatedTime, floatingForce.asVector.y, dragForce.asVector.y]);
    })
    .setupGraphWith({
        dataDefinition: [
            { label: "t [s]", color: "yellow" },
            { label: "buoyancy", color: "magenta" },
            { label: "drag", color: "blue" }
        ],
        title: "Buoyancy & drag forces",
        xLabel: "Simulation time",
        yLabel: "y [m]"
    })
