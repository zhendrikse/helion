import {
    Button, LineSegmentsView, Simulation, Vec3, Turtle, HexValueColorMapper,
    Colour
} from '../../../src/index.js';
import {Color} from 'three';

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
    turtle.reset()
        .goto(-300, -100)
        .penDown()
        .color(Colour.Yellow);

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
    turtle.reset()
        .goto(-300, -200)
        .penDown()
        .color(Colour.Green);

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

        turtle.backward(length / 2)
            .left(60)
            .forward(length / 2)
            .right(60);

        sierpinskiTriangle(turtle, length / 2, depth - 1);

        turtle.left(60)
            .backward(length / 2)
            .right(60);
    }
}

function drawSierpinskiTriangle(turtle) {
    turtle.reset()
        .goto(-200, -150)
        .penDown()
        .color(Colour.Cyan);

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

    turtle.penUp()
        .goto(x0 * scale + offsetX, y0 * scale + offsetY)
        .penDown();

    const color = new Colour();
    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        color.setHSL(i / points.length, 1, .5);
        turtle.color(color);
        turtle.goto(
            x * scale + offsetX,
            y * scale + offsetY
        );
    }
}

function tSquare(turtle, n, x, y, w) {
    if (n === 0)
        return;

    const color = new Colour();
    color.setHSL(w * .25, 1, .5);

    turtle.color(color)
        .goto(x, y)
        .penDown()
        .goto(x + w, y)
        .goto(x + w, y + w)
        .goto(x, y + w)
        .goto(x, y)
        .penUp();

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

    turtle.color(Colour.Yellow)
        .penUp();

    tSquare(turtle, n, -150, -150, w);
}

const turtle = new Turtle();
const turtleView = new LineSegmentsView({ colorMapper: new HexValueColorMapper() });

drawDragonCurve(turtle);
Simulation
    .with({
        htmlDivId: 'fractalsContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: {
            fieldOfView: 30,
            position: new Vec3(0, 0, 1100),
            controls: false
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .bind(turtle.alwaysWith(turtleView))
    .append(new Button()
        .withText('T-square fractal 🔶')
        .onClick(() => drawTSquare(turtle))
        .togetherWith(new Button()
            .withText('Dragon curve 🐦‍🔥')
            .onClick(() => drawDragonCurve(turtle))
        )
    )
    .append(new Button()
        .withText('Koch snowflake ❄️')
        .onClick(() => drawSnowflake(turtle))
        .togetherWith(new Button()
            .withText('Cesaro fractal 🏛️')
            .onClick(() => drawCesaro(turtle))
        )
    )
    .append(new Button()
        .withText('Sierpinski triangle 🔺️')
        .onClick(() => drawSierpinskiTriangle(turtle))
    );
