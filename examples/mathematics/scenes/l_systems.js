import {
    DropdownMenu, HexValueColorMapper, LineSegmentsView, Registry,
    Simulation, Slider, Range, Turtle, Vec3, Colour, Vec2
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
    'Hilbert curve': {
        iterations: 7,
        startPosition: new Vec2(-50, 50),
        angle: 90,
        stepLength: 1,
        textContent: '<h3>Hilbert curve</h3>Angle: 90°<br/>Axiom: <code>A</code><br/>Rules:  <code>A → -BF+AFA+FB-<br/>  B → +AF-BFB-FA+<br/>  F → F</code>',
        axiom: 'A',
        rules: {
            'A' : '-BF+AFA+FB-',
            'B' : '+AF-BFB-FA+',
            'F' : 'F',
            ...standardRules
        }
    },
    'Gosper curve': {
        startPosition: new Vec2(0, -10),
        angle: 60,
        iterations: 3,
        textContent: '<h3>Gosper curve</h3>Angle: 60°<br/>Axiom: <code>XF</code><br/>Rules: <code>F → F<br/>  X → X+YF++YF-FX--FXFX-YF+<br/> Y → -FX+YFYF++YF+FX--FX-Y</code>',
        axiom: 'XF',
        rules: {
            'F' : 'F',
            'X' : 'X+YF++YF-FX--FXFX-YF+',
            'Y' : '-FX+YFYF++YF+FX--FX-Y',
            ...standardRules
        }
    },
    'Koch curve': {
        startPosition: new Vec2(-12.5, -5),
        axiom: 'F',
        rules: { F: 'F+F--F+F' },
        textContent: '<h3>Koch curve</h3>Angle: 60°<br/>Axiom: <code>F</code><br/>Rules: <code>F → F+F--F+F</code>',
        angle: 60,
        stepLength: .3,
        iterations: 4,
    },
    'Koch snowflake': {
        startPosition: new Vec2(-10, 5),
        axiom: 'F--F--F',
        rules: { F: 'F+F--F+F' },
        textContent: '<h3>Koch snow flake</h3>Angle: 60°<br/>Axiom: <code>F--F--F</code><br/>Rules: <code>F → F+F--F+F</code>',
        angle: 60,
        stepLength: .25,
        iterations: 4
    },
    'Quadratic Koch island': {
        axiom: 'F+F+F+F',
        rules: { F: 'F-F+F+F+F-F-F+F' },
        textContent: '<h3>Koch island</h3>Angle: 20°<br/>Axiom: <code>F+F+F+F</code><br/>Rules: <code>F → F-F+F+F+F-F-F+F</code>',
        angle: 90,
        iterations: 3,
        stepLength: 2,
    },
    'Fractal plant': {
        startPosition: new Vec2(0, -10),
        axiom: 'X',
        rules: {
            X: 'F+[[X]-X]-F[-FX]+X',
            F: 'FF'
        },
        angle: 25,
        textContent: '<h3>Plant</h3>Angle: 20°<br/>Axiom: <code>X</code><br/>Rules: <code>X → F[+X]F[-X]+X<br/>  F → FF</code>',
        iterations: 4,
        stepLength: 0.5,
        startAngle: 270
    },
    'Plant 3': {
        startPosition: new Vec2(-2, -12),
        iterations: 4,
        angle: 22.5,
        startAngle: 270,
        stepLength: .8,
        textContent: '<h3>Plant 3</h3>Angle: 22.5°<br/>Axiom: <code>F</code><br/>Rules:  F → <code></code>FF-[-F+F+F]+[+F-F-F]</code>',
        axiom: 'F',
        rules: {
            'F' : 'FF-[-F+F+F]+[+F-F-F]',
            ...standardRules
        }
    },
    'Binary tree': {
        startPosition: new Vec2(7.5, -5),
        axiom: 'F',
        textContent: '<h3>Binary tree</h3>Angle: 10°<br/>Axiom: <code>F</code><br/>Rules:  <code>F → FF[-F+F+F]+[+F-F-F]</code>',
        rules: { F: 'FF[-F+F+F]+[+F-F-F]' },
        angle: 10,
        iterations: 3,
        startAngle: 270
    },
    'Dragon curve': {
        startPosition: new Vec2(-2.5, 5),
        axiom: 'FX',
        rules: { F: 'F', X: 'X+YF+', Y: '-FX-Y' },
        angle: 90,
        textContent: '<h3>Dragon curve</h3>Angle: 90°<br/>Axiom: <code>FX</code><br/>Rules: <code>F → F\n  X → X+YF+\n  Y → -FX-Y</code>',
        iterations: 10,
        startAngle: 90,
        stepLength: .55,
    },
    'Penrose tiling': {
		angle: 36,
        textContent: '<h3>Penrose tiling</h3>Angle: 36°<br/>Axiom: <code>[B]++[B]++[B]++[B]++[B]</code><br/>Rules:  <code>A → C1++D1----B1[-C1----A1]++<br/>  B → +C1--D1[---A1--B1]+<br/>  C → -A1++B1[+++C1++D1]-<br/>  D → --C1++++A1[+D1++++B1]--B1</code>',
		axiom: '[B]++[B]++[B]++[B]++[B]',
		rules: {
			'A' : 'C1++D1----B1[-C1----A1]++',
			'B' : '+C1--D1[---A1--B1]+',
			'C' : '-A1++B1[+++C1++D1]-',
			'D' : '--C1++++A1[+D1++++B1]--B1',
            ...standardRules
		},
        stepLength: 2,
        iterations: 3
    }
};

const MAX_SYMBOLS = 500000;
const turtle = new Turtle();
const turtleView = new LineSegmentsView({
    lineWidth: 1.5,
    colorMapper: new HexValueColorMapper()
});

class LSystemDefinition {
    constructor({
        name = '',
        axiom = '',
        iterations = 0,
        angle = 0,
        startAngle = 0,
        scaleFactor = 1,
        stepLength = 1,
        textContent = '',
        startPosition = new Vec2(),
        rules = {}
    } = {}) {
        this.startPosition = startPosition;
        this.name = name;
        this.iterationCount = iterations;
        this.turnAngle = angle;
        this.startAngle = startAngle;
        this.scaleFactor = scaleFactor;
        this.stepLength = stepLength;
        this.rules = rules;
        this.textContent = textContent;
        this.axiom = axiom;
    }

    _rewrite(sentence) {
        let next = '';
        for (const symbol of sentence) {
            if (symbol === '1')
                continue;
            next += this.rules[symbol] ?? symbol;
            if (next.length > MAX_SYMBOLS)
                throw new Error(`This generation exceeds the ${MAX_SYMBOLS.toLocaleString()} symbol limit.`);
        }
        return next;
    }

    expandLSystem() {
        let sentence = this.axiom;
        for (let i = 0; i < this.iterationCount; i++)
            sentence = this._rewrite(sentence);
        return sentence;
    }
}

let lSystemDefinition = new LSystemDefinition(SYSTEMS['Hilbert curve']);

function interpret(sentence, system) {
    turtle.reset()
        .penUp()
        .right(system.startAngle)
        .goto(system.startPosition.x, system.startPosition.y);
    const stack = [];
    const color = new Colour();
    let drawnSegments = 0;

    for (let i = 0; i < sentence.length; i++) {
        const symbol = sentence[i];

        switch (symbol) {
            case 'F':
            case '1': {
                color.setHSL(i / sentence.length, 0.85, 0.58);
                turtle.color(color).penDown().forward(system.stepLength);
                drawnSegments++;
                break;
            }
            case 'f':
                turtle.penUp().forward(system.stepLength);
                break;
            case '+':
                turtle.left(system.turnAngle);
                break;
            case '-':
                turtle.right(system.turnAngle);
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
                system.stepLength *= system.scaleFactor;
                break;
            case ']': {
                const state = stack.pop();
                if (state) {
                    turtle.penUp().goto(state.x, state.y);
                    turtle.angle = state.angle;
                    turtle.penState = state.penState;
                    turtle.color(state.color);
                }
                system.stepLength /= system.scaleFactor;
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

    for (const segment of turtle) {
        segment.from.x -= centerX;
        segment.from.y -= centerY;
        segment.to.x -= centerX;
        segment.to.y -= centerY;
    }
}

function redraw() {
    turtleView.reset();
    try {
        const sentence = lSystemDefinition.expandLSystem();
        interpret(sentence, lSystemDefinition);
        simulation.setBottomText(`${sentence.length.toLocaleString()} symbols`);
        simulation.frameSceneOn(turtleView);
    } catch (error) {
        console.warn('Unable to generate L-system:', error);
        turtle.clear();
        simulation.setBottomText('Generation too large — reduce iterations');
    }
}

const systemMenu = new DropdownMenu()
    .for(new Registry({
        label: 'Pick a fractal',
        entries: Object.fromEntries(Object.keys(SYSTEMS).map(name => [name, name]))
    }))
    .withValue(lSystemDefinition.name)
    .onChange(name => {
        lSystemDefinition = new LSystemDefinition({name, ...SYSTEMS[name]});
        iterationsSlider.withValue(lSystemDefinition.iterationCount);
        angleSlider.withValue(lSystemDefinition.turnAngle);
        simulation.setHtmlTitle(lSystemDefinition.textContent);
        stepLengthSlider.withValue(lSystemDefinition.stepLength);
        redraw();
    });

const iterationsSlider = new Slider('Iterations')
    .withRange(new Range(0, 10, 1))
    .withValue(lSystemDefinition.iterationCount)
    .onChange(value => {
        lSystemDefinition.iterationCount = Math.round(value);
        redraw();
    });

const angleSlider = new Slider('Turn angle')
    .withRange(new Range(5, 180, 1))
    .withValue(lSystemDefinition.turnAngle)
    .withUnits('°')
    .onInput(value => {
        lSystemDefinition.turnAngle = value;
        redraw();
    });

const stepLengthSlider = new Slider('Step length')
    .withRange(new Range(0.1, 3, 0.1))
    .withValue(lSystemDefinition.stepLength)
    .onInput(value => {
        lSystemDefinition.stepLength = value;
        redraw();
    });

const simulation = Simulation
    .with({
        htmlDivId: 'lSystemsContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 0, 100), orthographic: true
        },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌿 L-systems</strong><br/>' +
                '👉 Learn more about <a href=\'https://en.wikipedia.org/wiki/L-system\'>L-systems</a><br/>' +
                '👉 Choose a fractal, change the number of generations, and adjust the turn angle.'
        }
    })
    .bind(turtle.alwaysWith(turtleView))
    .setHtmlTitle(lSystemDefinition.textContent)
    .append(systemMenu)
    .append(iterationsSlider)
    .append(angleSlider)
    .append(stepLengthSlider);

redraw();
