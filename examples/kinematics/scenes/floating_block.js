import {EventController, Vec3, HtmlDiv, UPlotGraph, Block,
    Simulation, Canvas, Overlay, Box, ThreeJsRenderOptions, ThreeJsRenderer, Aquarium
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

const liquidDensity = 1000;
const g = -9.8;

class WoodenBlock extends Block {
    constructor({ density = 500, size = new Vec3(1, 1, 1) } = {}) {
        super({size: size, mass: density * size.x * size.y * size.z});
        this._force = new Vec3();
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

    buoyancyForce(water) {
        return liquidDensity * -g * this.submergedVolume(water);
    }

    dragForce() {
        const dragCoefficient = -5.0;
        return dragCoefficient * this.velocity.y;
    }

    netForce(water) {
        const Fg = this.mass * g;
        this._force.y = Fg + this.buoyancyForce(water) + this.dragForce();
        return this._force;
    }
}

const woodenBlock = new WoodenBlock( {size: new Vec3(0.4, 0.4, 0.1) });
const water = new Aquarium({
    color: 0x1e90ff,
    size: new Vec3(2, 2, 0.75),
    frameColor: 0xffff00,
});

const canvas = Canvas.withElementId("floatingBlockCanvas");
const overlay = Overlay.withElementId("floatingBlockOverlayText");
const canvasWrapper = HtmlDiv.withElementId("floatingBlockContainer").containsBoth(canvas.and(overlay));
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(1, 0.4, 2).multiplyScalar(1.7)
});
const renderer = ThreeJsRenderer.on(canvasWrapper).with(threeJsRendererOptions);

renderer.synchronize(woodenBlock.alwaysWith(new Box({ color: 0xdeb887 })));
renderer.addObject3D(water);

//
// Graph
//
const plot = new UPlotGraph({
    plotDiv: document.getElementById("forceChart"),
    dataDefinition: [
        { label: "t [s]", color: "yellow" },
        { label: "buoyancy", color: "magenta" },
        { label: "drag", color: "blue" }
    ],
    width: canvas.clientWidth,
    height: canvas.clientHeight * 0.5,
    title: "Buoyancy & drag forces",
    xLabel: "Simulation time",
    yLabel: "y [m]"
});

plot.graphData[0] = [0]; // time
plot.graphData[1] = [woodenBlock.buoyancyForce(water)];
plot.graphData[2] = [woodenBlock.dragForce()];

let t = 0;
const dt = 0.001;
const substeps = 20;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick( () => {
        woodenBlock.apply(woodenBlock.netForce(water), dt);

        plot.graphData[0].push(t);
        plot.graphData[1].push(woodenBlock.buoyancyForce(water));
        plot.graphData[2].push(woodenBlock.dragForce());
        plot.update();
}, substeps);

//
// Event controller
//
const eventController = new EventController(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas); // Controller passes event on to simulation and renderers
