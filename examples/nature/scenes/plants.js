import {
    DropdownMenu, HexValueColorMapper, LineSegmentsView, Registry,
    Simulation, Slider, Range, Turtle, Vec3, LindenmayerSystem
} from '../../../src/index.js';

const SYSTEMS = {
    'Binary tree': {
        axiom: 'F',
        textContent: '<h4>Binary tree</h4>Angle: 10 || Axiom: <code>F</code> || Rules:<br/>  <code>F → FF[-F+F+F]+[+F-F-F]</code>',
        rules: { F: 'FF[-F+F+F]+[+F-F-F]' },
        angle: 10,
        maxIterations: 4,
        order: 3,
        scaleFactor: 0.45,
        startAngle: 270
    },
    'Pythagoras tree': {
        order: 10,
        maxIterations: 12,
        scaleFactor: 1 / Math.sqrt(2),
        angle: 45,
        textContent: '<h4>Pythagoras tree</h4>Angle: 45° || Axiom: <code>F++F++FX++F</code> || Rules:<br/>  <code>F → F<br/>  X → [-FY--F--FF++F++FX++FF]<br/>  Y → [+FY--F--FF++F++FX++FF]</code>',
        axiom: 'F++F++FX++F',
        rules: {
            'F' : 'F',
            'X' : '[-FY--F--FF++F++FX++FF]',
            'Y' : '[+FY--F--FF++F++FX++FF]',
        }
    },
    'Plant 1': {
        order: 4,
        startAngle: 270,
        maxIterations: 5,
        angle: 23.5,
        textContent: '<h4>Plant 1</h4>Angle: 23.5°, Axiom: <code>F</code>Rules:  <code>F → F[+F]F[-F]F</code>',
        axiom: 'F',
        rules: {
            'F' : 'F[+F]F[-F]F',
        }
    },
    'Plant 2': {
        order: 4,
        maxIterations: 5,
        angle: 22.5,
        startAngle: 270,
        textContent: '<h4>Plant 2</h4>Angle: 22.5° || Axiom: <code>F</code> || Rules:<br/>  F → FF-[-F+F+F]+[+F-F-F]</code>',
        axiom: 'F',
        rules: {
            'F' : 'FF-[-F+F+F]+[+F-F-F]',
        }
    },
    'Plant 3': {
        axiom: 'F',
        rules: {
            'F' : 'F[-FF]F[+FF][F]',
        },
        angle: 30,
        startAngle: 270,
        textContent: '<h4>Plant 3</h4>Angle: 30° || Axiom: <code>F</code> || Rules:<br/> <code> F → F[-FF]F[+FF][F]</code>',
        maxIterations: 6,
        order: 4
    },
    'Plant 4': {
        axiom: 'X',
        rules: {
            'X' : 'F[+X]F[-X]+X',
            'F' : 'FF',
        },
        angle: 20,
        startAngle: 270,
        textContent: '<h4>Plant 4</h4>Angle: 20° || Axiom: <code>X</code> || Rules:<br/> <code> F → FF, X → F[+X]F[-X]+X</code>',
        maxIterations: 8,
        order: 7
    },
    'Plant 5': {
        axiom: 'X',
        rules: {
            'X' : 'F[+X][-X]FX',
            'F' : 'FF',
        },
        angle: 25.7,
        startAngle: 270,
        textContent: '<h4>Plant 5</h4>Angle: 25.7° || Axiom: <code>X</code> || Rules:<br/> <code> F → FF, X → F[+X][-X]FX</code>',
        maxIterations: 9,
        order: 7
    },
    'Plant 6': {
        axiom: 'SLFFF',
        rules: {
            'S' : '[+++Z][---Z]TS',
            'Z' : '+H[-Z]L',
            'H' : '-Z[+H]L',
            'T' : 'TL',
            'L' : '[-FFF][+FFF]F',
            'F' : 'F',
        },
        angle: 18,
        startAngle: 270,
        textContent: '<h4>Plant 6</h4>Angle: 18° || Axiom: <code>X</code> || Rules:<br/> <code> S → [+++Z][---Z]TS,  Z → +H[-Z]L<br/>  H → -Z[+H]L,  T → TL<br/>  L → [-FFF][+FFF]F,  F → F</code>',
        maxIterations: 12,
        order: 10
    },
    'Plant 7': {
        axiom: 'X',
        rules: {
            X: 'F+[[X]-X]-F[-FX]+X',
            F: 'FF'
        },
        angle: 25,
        startAngle: 270,
        textContent: '<h4>Plant 7</h4>Angle: 25° || Axiom: <code>X</code> || Rules:<br/> <code>X → F[+X]F[-X]+X<br/>  F → FF</code>',
        maxIterations: 8,
        order: 7
    },
    'Plant 8': {
        axiom: 'F',
        scaleFactor: 0.6,
        rules: {
            'F' : 'F[+F][-F]',
        },
        angle: 30,
        startAngle: 270,
        textContent: '<h4>Plant 8</h4>Angle: 30° || Axiom: <code>F</code> || Rules:<br/> <code>F → F[+F][-F]</code>',
        maxIterations: 10,
        order: 7
    }
};

const newView = () => new LineSegmentsView({
    lineWidth: 1.5,
    colorMapper: new HexValueColorMapper()
});
const turtle = new Turtle();
let turtleView = newView();

let lSystemDefinition = new LindenmayerSystem(SYSTEMS['Plant 7']);
function redraw() {
    try {
        const sentence = lSystemDefinition.passOnTo(turtle);
        simulation.setBottomText(`${sentence.length.toLocaleString()} symbols`);

        // frameSceneOn() needs the view geometry to reflect the newly generated segments.
        turtleView.visible = false;
        turtleView.dispose();
        turtleView = newView();
        simulation.bind(turtle.alwaysWith(turtleView));
        simulation.frameSceneOn(turtleView, {padding: 1.05});
    } catch (error) {
        console.warn('Unable to generate L-system:', error);
        turtle.clear();
        simulation.setBottomText('Generation too large — reduce iterations');
    }
}

const systemMenu = new DropdownMenu()
    .for(new Registry({
        label: 'Pick a plant',
        entries: Object.fromEntries(Object.keys(SYSTEMS).map(name => [name, name]))
    }))
    .withValue('Plant 7')
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
        htmlDivId: 'plantsContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: { orthographic: true, controls: false },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌿 L-systems</strong><br/>' +
                '📌 <code>F</code> draws, <code>f</code> moves without drawing, other capitals are grammar variables<br/>' +
                '📌 <code>1</code> disappears during rewriting but draws as <code>F</code> in the final generation<br/>' +
                '👉 Choose a fractal, change the number of generations, and adjust the turn angle.'
        }
    })
    .bind(turtle.alwaysWith(turtleView))
    .setHtmlTitle(lSystemDefinition.textContent)
    .append(systemMenu)
    .append(iterationsSlider)
    .append(angleSlider)

redraw();
