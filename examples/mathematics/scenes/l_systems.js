import {
    Button, DropdownMenu, HexValueColorMapper, LineSegmentsView, Registry,
    Simulation, Slider, Range, Turtle, Vec3, Colour
} from '../../../src/index.js';

const standardRules = {
    '1' : '',
    '|' : '|',		
    '+' : '+',
    '-' : '-',
    '[' : '[',
    ']' : ']'
};

/**
 * L-system presets use the notation from the original L-system plotter:
 * F draws, f moves without drawing, capital letters other than F are
 * grammar variables, and 1 disappears during rewriting but draws as F
 * in the final generation.
 */
const SYSTEMS = {
    'Koch curve': {
        axiom: 'F',
        rules: { F: 'F+F--F+F' },
        angle: 60,
        iterations: 4
    },
    'Koch snowflake': {
        axiom: 'F--F--F',
        rules: { F: 'F+F--F+F' },
        angle: 60,
        iterations: 4
    },
    'Quadratic Koch island': {
        axiom: 'F+F+F+F',
        rules: { F: 'F-F+F+F+F-F-F+F' },
        angle: 90,
        iterations: 3
    },
    'Fractal plant': {
        axiom: 'X',
        rules: {
            X: 'F+[[X]-X]-F[-FX]+X',
            F: 'FF'
        },
        angle: 25,
        iterations: 4
    },
    'Binary tree': {
        axiom: 'F',
        rules: { F: 'FF[-F+F+F]+[+F-F-F]' },
        angle: 10,
        iterations: 3
    },
    'Dragon curve': {
        axiom: 'FX',
        rules: { F: 'F', X: 'X+YF+', Y: '-FX-Y' },
        angle: 90,
        iterations: 10
    },
    'Penrose tiling': {
		angle: 36, 
		axiom: '[B]++[B]++[B]++[B]++[B]',
		rules: {
			'A' : 'C1++D1----B1[-C1----A1]++',
			'B' : '+C1--D1[---A1--B1]+',
			'C' : '-A1++B1[+++C1++D1]-',
			'D' : '--C1++++A1[+D1++++B1]--B1',
            ...standardRules
		},
        iterations: 3
    }
};

const MAX_SYMBOLS = 500000;
const turtle = new Turtle();
const turtleView = new LineSegmentsView({
    lineWidth: 1.5,
    colorMapper: new HexValueColorMapper()
});

let selectedSystem = 'Koch snowflake';
let iterationCount = SYSTEMS[selectedSystem].iterations;
let turnAngle = SYSTEMS[selectedSystem].angle;
let drawingScale = 1;

function rewrite(sentence, rules) {
    let next = '';
    for (const symbol of sentence) {
        if (symbol === '1')
            continue;
        next += rules[symbol] ?? symbol;
        if (next.length > MAX_SYMBOLS)
            throw new Error(`This generation exceeds the ${MAX_SYMBOLS.toLocaleString()} symbol limit.`);
    }
    return next;
}

function expandLSystem(system, iterations) {
    let sentence = system.axiom;
    for (let i = 0; i < iterations; i++)
        sentence = rewrite(sentence, system.rules);
    return sentence;
}

function interpret(sentence, angle, stepLength) {
    turtle.reset()
        .penUp()
        .goto(0, 0);
    const stack = [];
    const color = new Colour();
    let drawnSegments = 0;

    for (let i = 0; i < sentence.length; i++) {
        const symbol = sentence[i];

        switch (symbol) {
            case 'F':
            case '1': {
                color.setHSL((drawnSegments / Math.max(1, sentence.length)) % 1, 0.85, 0.58);
                turtle.color(color).penDown().forward(stepLength);
                drawnSegments++;
                break;
            }
            case 'f':
                turtle.penUp().forward(stepLength);
                break;
            case '+':
                turtle.left(angle);
                break;
            case '-':
                turtle.right(angle);
                break;
            case '|':
                turtle.right(180);
                break;
            case '[':
                stack.push({
                    x: turtle.x,
                    y: turtle.y,
                    angle: turtle.angle,
                    penState: turtle.penState,
                    color: turtle.currentColor
                });
                break;
            case ']': {
                const state = stack.pop();
                if (state) {
                    turtle.penUp().goto(state.x, state.y);
                    turtle.angle = state.angle;
                    turtle.penState = state.penState;
                    turtle.color(state.color);
                }
                break;
            }
            default:
                // Other uppercase letters are grammar variables only.
                break;
        }
    }

    centerDrawing();
}

function centerDrawing() {
    if (turtle.count === 0)
        return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const segment of turtle) {
        minX = Math.min(minX, segment.from.x, segment.to.x);
        maxX = Math.max(maxX, segment.from.x, segment.to.x);
        minY = Math.min(minY, segment.from.y, segment.to.y);
        maxY = Math.max(maxY, segment.from.y, segment.to.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY, 1);
    const scale = 16 / span * drawingScale;

    for (const segment of turtle) {
        segment.from.x = (segment.from.x - centerX) * scale;
        segment.from.y = (segment.from.y - centerY) * scale;
        segment.to.x = (segment.to.x - centerX) * scale;
        segment.to.y = (segment.to.y - centerY) * scale;
    }
}

function redraw() {
    const system = SYSTEMS[selectedSystem];
    try {
        const sentence = expandLSystem(system, iterationCount);
        interpret(sentence, turnAngle, 1);
        generateButtonLabel = `Generate (${sentence.length.toLocaleString()} symbols)`;
        generateButton.withText(generateButtonLabel);
    } catch (error) {
        console.warn('Unable to generate L-system:', error);
        turtle.clear();
        generateButton.withText('Generation too large — reduce iterations');
    }
}

let generateButtonLabel = 'Generate';
const generateButton = new Button()
    .withText(generateButtonLabel)
    .onClick(() => redraw());

const systemMenu = new DropdownMenu()
    .for(new Registry({
        label: 'Pick a fractal',
        entries: Object.fromEntries(Object.keys(SYSTEMS).map(name => [name, name]))
    }))
    .withValue(selectedSystem)
    .onChange(name => {
        selectedSystem = name;
        iterationCount = SYSTEMS[name].iterations;
        turnAngle = SYSTEMS[name].angle;
        iterationsSlider.withValue(iterationCount);
        angleSlider.withValue(turnAngle);
        redraw();
    });

const iterationsSlider = new Slider('Iterations')
    .withRange(new Range(0, 10, 1))
    .withValue(iterationCount)
    .onChange(value => {
        iterationCount = Math.round(value);
        redraw();
    });

const angleSlider = new Slider('Turn angle')
    .withRange(new Range(5, 180, 1))
    .withValue(turnAngle)
    .withUnits('°')
    .onInput(value => {
        turnAngle = value;
        redraw();
    });

const scaleSlider = new Slider('Step length')
    .withRange(new Range(0.5, 2, 0.1))
    .withValue(drawingScale)
    .onInput(value => {
        drawingScale = value;
        redraw();
    });

Simulation
    .with({
        htmlDivId: 'lSystemsContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 0, 25),
            orthographic: true,
            controls: true
        },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌿 L-systems</strong><br/>' +
                '👉 Learn more about <a href=\"https://en.wikipedia.org/wiki/L-system\">L-systems</a><br/>' +
                '👉 Choose a fractal, change the number of generations, and adjust the turn angle.'
        }
    })
    .bind(turtle.alwaysWith(turtleView))
    .append(systemMenu)
    .append(iterationsSlider)
    .append(angleSlider)
    .append(scaleSlider)
    .append(generateButton);

redraw();
