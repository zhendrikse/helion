import {
    Button, LineSegmentsView, Simulation, Vec3, Turtle, HexValueColorMapper
} from "../../../src/index.js";
import { Color } from "three";

function drawKite(turtle, length) {
    turtle.forward(length);
    turtle.right(72);
    turtle.forward(length);
    turtle.right(108);
    turtle.forward(length);
    turtle.right(72);
    turtle.forward(length);
}

function drawDart(turtle, length) {
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.right(36);
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.right(36);
    turtle.forward(length);
    turtle.right(144);
}

function penroseTiling(turtle, length, depth) {
    if (depth === 0) return;

    drawKite(turtle, length);

    turtle.right(72);
    turtle.forward(length);
    turtle.right(216);

    drawDart(turtle, length);

    turtle.left(72);
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.right(144);

    penroseTiling(turtle, length / 2, depth - 1);

    turtle.right(72);
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.right(144);

    drawDart(turtle, length);

    turtle.left(72);
    turtle.forward(length);
    turtle.right(216);

    drawKite(turtle, length);

    turtle.right(72);
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.right(144);

    penroseTiling(turtle, length / 2, depth - 1);

    turtle.right(72);
    turtle.forward(length);
    turtle.right(216);
    turtle.forward(length);
    turtle.right(144);
    turtle.forward(length);
    turtle.left(144);
}

function drawPenrose(turtle) {
    turtle.reset();
    turtle.penUp();
    turtle.goto(-200, 0);
    turtle.penDown();
    turtle.color(new Color(0x66ccff).getHex());
    penroseTiling(turtle, 200, 4);
}

const turtle = new Turtle();
const turtleView = new LineSegmentsView({
    colorMapper: new HexValueColorMapper()
});

drawPenrose(turtle);

Simulation
    .with({
        htmlDivId: "penroseTilingContainer",
        camera: {
            fieldOfView: 30,
            position: new Vec3(0, 0, 1100),
            controls: false
        },
        headUpDisplay: { enabled: false },
        parameterMenuCollapsed: false
    })
    .bind(turtle.alwaysWith(turtleView))
    .append(new Button()
        .withText("Penrose tiling ⟡")
        .addEventListener("click", () => drawPenrose(turtle))
    );
