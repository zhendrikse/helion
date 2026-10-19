import {
    DropdownMenu, HexValueColorMapper, LineSegmentsView, Registry,
    Simulation, Slider, Range, Turtle, Vec3, LindenmayerSystem
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
    'Binary tree': {
        axiom: 'F',
        textContent: '<h3>Binary tree</h3>Angle: 10°<br/>Axiom: <code>F</code><br/>Rules:  <code>F → FF[-F+F+F]+[+F-F-F]</code>',
        rules: { F: 'FF[-F+F+F]+[+F-F-F]' },
        angle: 10,
        maxIterations: 3,
        order: 3,
        startAngle: 270
    },
    'Dragon curve': {
        axiom: 'FX',
        rules: { F: 'F', X: 'X+YF+', Y: '-FX-Y' },
        angle: 90,
        textContent: '<h3>Dragon curve</h3>Angle: 90°<br/>Axiom: <code>FX</code><br/>Rules: <code>F → F\n  X → X+YF+\n  Y → -FX-Y</code>',
        maxIterations: 15,
        order: 13,
        startAngle: 90
    },
    'Gosper curve': {
        angle: 60,
        order: 4,
        maxIterations: 6,
        textContent: '<h3>Gosper curve</h3>Angle: 60°<br/>Axiom: <code>XF</code><br/>Rules: <code>F → F<br/>  X → X+YF++YF-FX--FXFX-YF+<br/> Y → -FX+YFYF++YF+FX--FX-Y</code>',
        axiom: 'XF',
        rules: {
            'F' : 'F',
            'X' : 'X+YF++YF-FX--FXFX-YF+',
            'Y' : '-FX+YFYF++YF+FX--FX-Y',
            ...standardRules
        }
    },
    'Hilbert curve': {
        maxIterations: 8,
        order: 6,
        angle: 90,
        textContent: '<h3>Hilbert curve</h3>Angle: 90°<br/>Axiom: <code>A</code><br/>Rules:  <code>A → -BF+AFA+FB-<br/>  B → +AF-BFB-FA+<br/>  F → F</code>',
        axiom: 'A',
        rules: {
            'A' : '-BF+AFA+FB-',
            'B' : '+AF-BFB-FA+',
            'F' : 'F',
            ...standardRules
        }
    },
    'Koch curve': {
        axiom: 'F',
        rules: { F: 'F+F--F+F' },
        textContent: '<h3>Koch curve</h3>Angle: 60°<br/>Axiom: <code>F</code><br/>Rules: <code>F → F+F--F+F</code>',
        angle: 60,
        maxIterations: 8,
        order: 4
    },
    'Koch snowflake': {
        axiom: 'F--F--F',
        rules: { F: 'F+F--F+F' },
        textContent: '<h3>Koch snow flake</h3>Angle: 60°<br/>Axiom: <code>F--F--F</code><br/>Rules: <code>F → F+F--F+F</code>',
        angle: 60,
        maxIterations: 8,
        order: 4
    },
    'Penrose tiling': {
        angle: 36,
        order: 6,
        textContent: '<h3>Penrose tiling</h3>Angle: 36°<br/>Axiom: <code>[B]++[B]++[B]++[B]++[B]</code><br/>Rules:  <code>A → C1++D1----B1[-C1----A1]++<br/>  B → +C1--D1[---A1--B1]+<br/>  C → -A1++B1[+++C1++D1]-<br/>  D → --C1++++A1[+D1++++B1]--B1</code>',
        axiom: '[B]++[B]++[B]++[B]++[B]',
        rules: {
            'A' : 'C1++D1----B1[-C1----A1]++',
            'B' : '+C1--D1[---A1--B1]+',
            'C' : '-A1++B1[+++C1++D1]-',
            'D' : '--C1++++A1[+D1++++B1]--B1',
            ...standardRules
        },
        maxIterations: 6
    },
    'Plant': {
        axiom: 'X',
        rules: {
            X: 'F+[[X]-X]-F[-FX]+X',
            F: 'FF'
        },
        angle: 25,
        startAngle: 270,
        textContent: '<h3>Plant</h3>Angle: 20°<br/>Axiom: <code>X</code><br/>Rules: <code>X → F[+X]F[-X]+X<br/>  F → FF</code>',
        maxIterations: 8,
        order: 7
    },
    'Plant 3': {
        order: 4,
        maxIterations: 5,
        angle: 22.5,
        startAngle: 270,
        textContent: '<h3>Plant 3</h3>Angle: 22.5°<br/>Axiom: <code>F</code><br/>Rules:  F → <code></code>FF-[-F+F+F]+[+F-F-F]</code>',
        axiom: 'F',
        rules: {
            'F' : 'FF-[-F+F+F]+[+F-F-F]',
            ...standardRules
        }
    },
    'Quadratic Koch island': {
        axiom: 'F+F+F+F',
        rules: { F: 'F-F+F+F+F-F-F+F' },
        textContent: '<h3>Koch island</h3>Angle: 20°<br/>Axiom: <code>F+F+F+F</code><br/>Rules: <code>F → F-F+F+F+F-F-F+F</code>',
        angle: 90,
        maxIterations: 5,
        order: 3
    }
};

const newView = () => new LineSegmentsView({
    lineWidth: 1.5,
    colorMapper: new HexValueColorMapper()
});
const turtle = new Turtle();
let turtleView = newView();

let lSystemDefinition = new LindenmayerSystem(SYSTEMS['Hilbert curve']);
function redraw() {
    try {
        const sentence = lSystemDefinition.passOnTo(turtle);
        simulation.setBottomText(`${sentence.length.toLocaleString()} symbols`);

        // frameSceneOn() needs the view geometry to reflect the newly generated segments.
        turtleView.visible = false;
        turtleView.dispose();
        turtleView = newView();
        simulation.bind(turtle.alwaysWith(turtleView));
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
        lSystemDefinition = new LindenmayerSystem({name, ...SYSTEMS[name]});
        iterationsSlider.withRange(new Range(0, lSystemDefinition.maxIterations, 1));
        iterationsSlider.withValue(lSystemDefinition.order);
        angleSlider.withValue(lSystemDefinition.turnAngle);
        simulation.setHtmlTitle(lSystemDefinition.textContent);
        redraw();
    });

const iterationsSlider = new Slider('Iterations')
    .withRange(new Range(0, lSystemDefinition.maxIterations, 1))
    .withValue(lSystemDefinition.order)
    .onChange(value => {
        lSystemDefinition.order = Math.round(value);
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

redraw();
