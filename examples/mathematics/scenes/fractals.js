import {
    Button, LineSegmentsView, Simulation, Vec3, Turtle, hsvToHexValue, ColorMappers
} from "../../../src/index.js";

function kochSnowflake(turtle, length, depth) {
    if (depth === 0) {
        turtle.forward(length);
    } else {
        length /= 3.0;

        kochSnowflake(turtle, length, depth - 1);

        turtle.left(60);
        kochSnowflake(turtle, length, depth - 1);

        turtle.right(120);
        kochSnowflake(turtle, length, depth - 1);

        turtle.left(60);
        kochSnowflake(turtle, length, depth - 1);
    }
}

function drawSnowflake(turtle) {
    turtle.reset();
    turtle.goto(-300, -100);
    turtle.penDown();
    turtle.color(0xffff00);

    for (let i = 0; i < 3; i++)
        kochSnowflake(turtle, 200, 4);

    turtle.right(120);
}

function cesaroFractal(turtle, depth, length) {
    if (depth === 0) {
        turtle.forward(length);
    } else {
        const angles = [85, -170, 85, 0];

        for (const angle of angles) {
            cesaroFractal(turtle, depth - 1, length / 3);
            turtle.left(angle);
        }
    }
}

function drawCesaro(turtle) {
    turtle.reset();
    turtle.goto(-300, -200);
    turtle.penDown();
    turtle.color(0x00ff00);

    cesaroFractal(turtle, 6, 4000);
}

function sierpinskiTriangle(turtle, length, depth) {
    if (depth === 0) {
        for (let i = 0; i < 3; i++) {
            turtle.forward(length);
            turtle.left(120);
        }
    } else {
        sierpinskiTriangle(turtle, length / 2, depth - 1);

        turtle.forward(length / 2);

        sierpinskiTriangle(turtle, length / 2, depth - 1);

        turtle.backward(length / 2);
        turtle.left(60);
        turtle.forward(length / 2);
        turtle.right(60);

        sierpinskiTriangle(turtle, length / 2, depth - 1);

        turtle.left(60);
        turtle.backward(length / 2);
        turtle.right(60);
    }
}

function drawSierpinskiTriangle(turtle) {
    turtle.reset();
    turtle.goto(-200, -150);
    turtle.penDown();
    turtle.color(0xffffff);

    sierpinskiTriangle(turtle, 400, 5);
}

function dragonCurve(n) {
    if (n === 0)
        return [[0, 0], [1, 0]];

    const prevPoints = dragonCurve(n - 1);
    const newPoints = [];

    for (let i = 0; i < prevPoints.length - 1; i++) {
        const [x1, y1] = prevPoints[i];
        const [x2, y2] = prevPoints[i + 1];

        const dx = x2 - x1;
        const dy = y2 - y1;

        let newDx;
        let newDy;

        if (i % 2 === 0) {
            newDx = dy;
            newDy = -dx;
        } else {
            newDx = -dy;
            newDy = dx;
        }

        const newX = x1 + dx / 2 + newDx / 2;
        const newY = y1 + dy / 2 + newDy / 2;

        newPoints.push(
            [x1, y1],
            [newX, newY]
        );
    }

    newPoints.push(prevPoints[prevPoints.length - 1]);

    return newPoints;
}

function drawDragonCurve(turtle) {
    turtle.reset();
    const points = dragonCurve(12);

    const scale = 300;
    const offsetX = -150;
    const offsetY = 0;

    const [x0, y0] = points[0];

    turtle.penUp();
    turtle.goto(x0 * scale + offsetX, y0 * scale + offsetY);
    turtle.penDown();

    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        turtle.color(hsvToHexValue(i / points.length, 1, 1));
        turtle.goto(
            x * scale + offsetX,
            y * scale + offsetY
        );
    }
}

function tSquare(turtle, n, x, y, w) {
    if (n === 0)
        return;

    turtle.color(hsvToHexValue(w * .25, 1, 1));

    turtle.goto(x, y);
    turtle.penDown();

    turtle.goto(x + w, y);
    turtle.goto(x + w, y + w);
    turtle.goto(x, y + w);
    turtle.goto(x, y);

    turtle.penUp();

    const newW = w / 3;

    tSquare(turtle, n - 1, x + newW, y + newW, newW);
    tSquare(turtle, n - 1, x + newW, y + newW * 5, newW);
    tSquare(turtle, n - 1, x + newW * 5, y + newW * 5, newW);
    tSquare(turtle, n - 1, x + newW * 5, y + newW, newW);
}

function drawTSquare(turtle) {
    turtle.reset();
    const n = 8;
    const w = 2 ** n;

    turtle.color(0xff0000);
    turtle.penUp();

    tSquare(turtle, n, -150, -150, w);
}

const turtle = new Turtle();
const turtleView = new LineSegmentsView({
    colorMapper: ColorMappers.get(ColorMappers.HexValueColorMapper)
});

drawDragonCurve(turtle);
Simulation
    .with({
        htmlDivId: "fractalsContainer",
        fieldOfView: 30,
        cameraPosition: new Vec3(0, 0, 1100),
        parameterMenuCollapsed: false
    })
    .bind(turtle.alwaysWith(turtleView))
    .append(new Button()
        .withText("T-square fractal 🔶")
        .addEventListener("click", () => drawTSquare(turtle))
        .togetherWith(new Button()
            .withText("Dragon curve 🐦‍🔥")
            .addEventListener("click", () => drawDragonCurve(turtle))
        )
    )
    .append(new Button()
        .withText("Koch snowflake ❄️")
        .addEventListener("click", () => drawSnowflake(turtle))
        .togetherWith(new Button()
            .withText("Cesaro fractal 🏛️")
            .addEventListener("click", () => drawCesaro(turtle))
        )
    )
    .append(new Button()
        .withText("Sierpinski triangle 🔺️")
        .addEventListener("click", () => drawSierpinskiTriangle(turtle))
    );
