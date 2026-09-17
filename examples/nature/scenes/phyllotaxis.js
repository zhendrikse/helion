import {
    ParticleView2D, Simulation, Vec3, Vec2, Slider, Range, Button, Checkbox,
    HueColorMapper, RadialSymmetricBody
} from '../../../src/index.js';

const numberOfDots = 360;
let c = 15;
let n = 0; // number of seeds
let drawBorderAroundDots = false;

/** @param {number} value */
const normalizeHue = value => ((value % 360) + 360) % 360 / 360;

class FlowerParticle extends RadialSymmetricBody {
    /**
     * @param {number} cValue 
     * @param {number} index 
     */
    constructor(cValue, index) {
        super({
            radius: 8
        });

        this.n = index;
        this.angle = 0;
        this.distance = 0;
        this.updateWith(cValue);
    }

    /** @param {number} newCvalue */
    updateWith(newCvalue) {
        const angle = this.n * 137.5;
        const radius = newCvalue * Math.sqrt(this.n);
        const rad = Math.PI * angle / 180;
        this.angle = angle;
        this.distance = radius;
        this.state.position.copy(new Vec2(radius * Math.cos(rad), radius * Math.sin(rad)));
    }
}

const colorSchemes = [
    (/** @type {{ angle: number; distance: number; }} */ p) => normalizeHue(p.angle - p.distance), // (angle - radius) % 360
    (/** @type {{ n: number; }} */ p) => normalizeHue(p.n), // n % 360
    (/** @type {{ angle: number; }} */ p) => normalizeHue(p.angle), // angle % 360
    (/** @type {{ angle: number; }} */ _p) => 65 / 360 // monochrome 65°
];

/** @type {FlowerParticle[]} */
const flowerSeeds = [];
/** @type {ParticleView2D[]} */
const particleViews = [];
const resetParticleViews = () => particleViews.forEach(view => view.visible = false);

const simulation = Simulation
    .with({
        htmlDivId: 'flowerContainer',
        camera: { controls: false, position: new Vec3(0, 0, 750), orthographic: true },
        infoPanel: { text: '' },
        parameterMenuCollapsed: false
    })
    .withMouseClickEventListener()
    .onReset(() => {
        n = 0;
        flowerSeeds.forEach(seed => seed.updateWith(c));
        updateTitle(c, n);
    })
    .runsEvery(0.02)
    .onStep(() => {
        if (n > numberOfDots)
            return; 

        for (let i = 0; i < n; i++)
            particleViews[i].visible = true;
        updateTitle(c, n);
        n++;
    })
    .append(new Slider('Growth rate')
        .withRange(new Range(10, 20, 0.5))
        .withValue(c)
        .onInput(event => {
            // @ts-ignore
            c = Number(event.target.value);
            n = 0;
            flowerSeeds.forEach(seed => seed.updateWith(c));
            updateTitle(c, n);
        })
    )
    .append(
        new Button().withText('Colors 1').onClick(() => setColoringSchemeTo(0))
            .togetherWith(new Button().withText('Colors 2').onClick(() => setColoringSchemeTo(1))
                .togetherWith(new Button().withText('Colors 3').onClick(() => setColoringSchemeTo(2))
                    .togetherWith(new Button().withText('Monochrome').onClick(() => setColoringSchemeTo(3)))))
    )
    .append(new Checkbox('Border around dots')
        .checked(drawBorderAroundDots)
        .addEventListener('click', event => {
            for (const view of particleViews) 
                // @ts-ignore
                view.hasBorder = event.target.checked;
        })
    )
    .start();

for (let index = 0; index < numberOfDots; index++) {
    flowerSeeds.push(new FlowerParticle(c, index));
    const view = new ParticleView2D({ 
        colorFunction: colorSchemes[3], 
        colorMapper: new HueColorMapper(), 
        hasBorder: drawBorderAroundDots 
    });
    particleViews.push(view);
    simulation.bind(flowerSeeds[index].alwaysWith(view));
}
resetParticleViews();

/** @param {number} index */
function setColoringSchemeTo(index) {
    n = 0;
    resetParticleViews();
    for (const view of particleViews) 
        view.colorFunction = colorSchemes[index];
    updateTitle(c, n);
}

/**
 * @param {number} cValue 
 * @param {number} nValue 
 */
function updateTitle(cValue, nValue) {
    // Origineel: $$\begin{cases} \phi &= n·137.5π/180 \\ r &= c√n \end{cases} ⇒ {x = r cos φ, y = r sin φ}
    const latex = `\\begin{cases} \\phi &= ${nValue} \\cdot \\dfrac{137.5\\pi}{180} \\\\ r &= ${cValue}\\sqrt{${nValue}} \\end{cases} \\Rightarrow  \\begin{cases} x &= r \\cdot \\cos(\\phi) \\\\ y &= r \\cdot \\sin(\\phi) \\end{cases}`;
    simulation.setLatexTitle(latex);
}

