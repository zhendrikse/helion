import {
    DropdownMenu, HexValueColorMapper, LineSegmentsView, Registry,
    Simulation, Slider, Range, Turtle, LindenmayerSystem
} from '../../../src/index.js';

const standardRules = {
    '1' : '',
    '|' : '|',
    '+' : '+',
    '-' : '-',
    '[' : '[',
    ']' : ']'
};

const SYSTEMS = {
    'Box fractal': {
        order: 4,
        angle: 90,
        maxIterations: 6,
        textContent: '<h4>Box fractal</h4> || Angle: 90° || Axiom: <code>F-F-F-F</code> || Rules:<br/> <code>F → F-F+F+F-F</code>',
        axiom: 'F-F-F-F',
        rules: {
            'F' : 'F-F+F+F-F',
        }
    },
    'Dragon curve': {
        axiom: 'FX',
        rules: { F: 'F', X: 'X+YF+', Y: '-FX-Y' },
        angle: 90,
        textContent: '<h4>Dragon curve</h4>Angle: 90° || Axiom: <code>FX</code> || Rules:<br/> <code>F → F\n  X → X+YF+\n  Y → -FX-Y</code>',
        maxIterations: 15,
        order: 13,
        startAngle: 90
    },
    'Gosper curve': {
        angle: 60,
        order: 4,
        maxIterations: 6,
        textContent: '<h4>Gosper curve</h4>Angle: 60° || Axiom: <code>XF</code> || Rules:<br/> <code>F → F<br/>  X → X+YF++YF-FX--FXFX-YF+<br/> Y → -FX+YFYF++YF+FX--FX-Y</code>',
        axiom: 'XF',
        rules: {
            'F' : 'F',
            'X' : 'X+YF++YF-FX--FXFX-YF+',
            'Y' : '-FX+YFYF++YF+FX--FX-Y',
        }
    },
    'Hilbert curve': {
        maxIterations: 8,
        order: 6,
        angle: 90,
        textContent: '<h4>Hilbert curve</h4>Angle: 90° || Axiom: <code>A</code> || Rules:<br/>  <code>A → -BF+AFA+FB-<br/>  B → +AF-BFB-FA+<br/>  F → F</code>',
        axiom: 'A',
        rules: {
            'A' : '-BF+AFA+FB-',
            'B' : '+AF-BFB-FA+',
            'F' : 'F',
            ...standardRules
        }
    },
    'Island and lakes': {
        maxIterations: 3,
        order: 2,
        angle: 90,
        startAngle: 30,
        textContent: '<h4>Island and lakes</h4>Angle: 90° || Axiom: <code>F+F+F+F</code> || Rules:<br/>  <code>F → F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF<br/>  f → ffffff</code>',
        axiom: 'F+F+F+F',
        rules: {
            'F' : 'F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF',
            'f' : 'ffffff',
        }
    },
    'Koch curve': {
        axiom: 'F',
        rules: { F: 'F+F--F+F' },
        textContent: '<h4>Koch curve</h4>Angle: 60° || Axiom: <code>F</code> || Rules:<br/> <code>F → F+F--F+F</code>',
        angle: 60,
        maxIterations: 8,
        order: 4
    },
    'Koch snowflake': {
        axiom: 'F--F--F',
        rules: { F: 'F+F--F+F' },
        textContent: '<h4>Koch snow flake</h4>Angle: 60° || Axiom: <code>F--F--F</code> || Rules:<br/> <code>F → F+F--F+F</code>',
        angle: 60,
        maxIterations: 8,
        order: 4
    },
    'Lévy C curve': {
        axiom: 'F',
        rules: { F: '+F--F+' },
        textContent: '<h4>Lévy C curve</h4>Angle: 45° || Axiom: <code>F</code> || Rules:<br/> <code>F → +F--F+</code>',
        angle: 45,
        maxIterations: 16,
        order: 12
    },
    'Peano curve': {
        order: 4,
        maxIterations: 5,
        angle: 90,
        textContent: '<h4>Peano curve</h4>Angle: 90° || Axiom: <code>X</code> || Rules:<br/> <code>X → XFYFX+F+YFXFY-F-XFYFX<br/>  Y → YFXFY-F-XFYFX+F+YFXFY<br/>  F → F</code>',
        axiom: 'X',
        rules: {
            'X' : 'XFYFX+F+YFXFY-F-XFYFX',
            'Y' : 'YFXFY-F-XFYFX+F+YFXFY',
            'F' : 'F',
        }
    },
    'Penrose tiling': {
        angle: 36,
        order: 6,
        textContent: '<h4>Penrose tiling</h4>Angle: 36° || Axiom: <code>[B]++[B]++[B]++[B]++[B]</code> || Rules:<br/>  <code>A → C1++D1----B1[-C1----A1]++<br/>  B → +C1--D1[---A1--B1]+<br/>  C → -A1++B1[+++C1++D1]-<br/>  D → --C1++++A1[+D1++++B1]--B1</code>',
        axiom: '[B]++[B]++[B]++[B]++[B]',
        rules: {
            'A' : 'C1++D1----B1[-C1----A1]++',
            'B' : '+C1--D1[---A1--B1]+',
            'C' : '-A1++B1[+++C1++D1]-',
            'D' : '--C1++++A1[+D1++++B1]--B1',
        },
        maxIterations: 6
    },
    'Pentaplexity': {
        order: 4,
        maxIterations: 5,
        startAngle: 72.5,
        angle: 36,
        textContent: '<h4>Penta Plexity Curve</h4> || Angle: 36° || Axiom: <code>F++F++F++F++F</code> || Rules:<br/> <code>F → F++F++F|F-F++F</code>',
        axiom: 'F++F++F++F++F',
        rules: {
            'F' : 'F++F++F|F-F++F',
            ...standardRules
        }
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
    'Quadratic Koch island': {
        axiom: 'F+F+F+F',
        rules: { F: 'F-F+F+F+F-F-F+F' },
        textContent: '<h4>Koch island</h4>Angle: 20° || Axiom: <code>F+F+F+F</code> || Rules:<br/> <code>F → F-F+F+F+F-F-F+F</code>',
        angle: 90,
        maxIterations: 5,
        order: 3
    },
    'Rings': {
        order: 4,
        maxIterations: 5,
        angle: 90,
        textContent: '<h4>Rings</h4> || Angle: 90° || Axiom: <code>F+F+F+F</code> || Rules:<br/> <code>F → FF+F+F+F+F+F-F</code>',
        axiom: 'F+F+F+F',
        rules: {
            'F' : 'FF+F+F+F+F+F-F',
        }
    },
    'Sierpinski carpet': {
        order: 4,
        maxIterations: 5,
        startAngle: 45,
        angle: 90,
        textContent: '<h4>Sierpinski Carpet</h4>Angle: 90° || Axiom: <code>F</code> || Rules:<br/> <code>f → fff, F → F+F-F-FF-F-F-fF</code>',
        axiom: 'F',
        rules: {
            'F' : 'F+F-F-FF-F-F-fF',
            'f' : 'fff',
        }
    },
    'Sierpinski triangle': {
        order: 6,
        startAngle: 180,
        maxIterations: 8,
        angle: 60,
        textContent: '<h4>Sierpinski triangle</h4>Angle: 60° || Axiom: <code>FXF--FF--FF</code> || Rules:<br/> <code>X → --FXF++FXF++FXF--, F → FF</code>',
        axiom: 'FXF--FF--FF',
        rules: {
            'X' : '--FXF++FXF++FXF--',
            'F' : 'FF',
        }
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
        simulation.frameSceneOn(turtleView, {padding: 1.1});
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
    .withValue('Hilbert curve')
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
