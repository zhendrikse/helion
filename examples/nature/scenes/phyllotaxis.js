import {
    Circle, Simulation, Vec3, Vec2, Slider, Range, Button, Checkbox, BindingsCollection,
    RadialSymmetricBody, Colour, ModelObjectsCollection, ViewsCollection
} from '../../../src/index.js';

const numberOfDots = 360;
let c = 13;
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
        super({ radius: 8 });
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

/**
 * @param {number} cValue 
 * @param {number} nValue 
 */
const updateTitle = (cValue, nValue) =>
    simulation.setLatexTitle(
        `\\begin{cases} \\phi &= ${nValue} \\cdot \\dfrac{137.5\\pi}{180} \\\\ r &= ${cValue}\\sqrt{${nValue}} \\end{cases}` + 
        `\\Rightarrow  \\begin{pmatrix} x \\\\ y \\end{pmatrix} = r \\begin{pmatrix} \\cos(\\phi) \\\\ \\sin(\\phi) \\end{pmatrix}`
    );

const colorSchemes = [
    (/** @type {{ angle: number; distance: number; }} */ p) => normalizeHue(p.angle - p.distance), // (angle - radius) % 360
    (/** @type {{ n: number; }} */ p) => normalizeHue(p.n), // n % 360
    (/** @type {{ angle: number; }} */ p) => normalizeHue(p.angle), // angle % 360
    (/** @type {{ angle: number; }} */ _p) => 65 / 360 // monochrome 65°
];

const flowerSeeds = new ModelObjectsCollection();
const flowerSeedsViews = ViewsCollection.of(Circle).with({ fillColor: Colour.Yellow });
for (let index = 0; index <= numberOfDots; index++)
    flowerSeeds.add(new FlowerParticle(c, index));

const seedBindings = new BindingsCollection();
const simulation = Simulation
    .with({
        htmlDivId: 'flowerContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: { controls: false, position: new Vec3(0, 0, 750), orthographic: true },
        infoPanel: { text: '' }
        })
    .withMouseClickEventListener()
    .onReset(() => {
        n = 0;
        flowerSeeds.forEach(seed => seed.updateWith(c));
        updateTitle(c, n);
    })
    .bind(flowerSeeds.alwaysWith(flowerSeedsViews).capture(seedBindings))
    .runsEvery(0.02)
    .onStep(() => {
        if (n > numberOfDots)
            return; 

        flowerSeedsViews.forEach((view, index) => view.visible = index <=n);
        updateTitle(c, n);
        n++;
    })
    .append(new Slider('Growth rate')
        .withRange(new Range(10, 20, 0.5))
        .withValue(c)
        .onInput(value => {
            c = value;
            n = 0;
            flowerSeeds.forEach(seed => seed.updateWith(c));
            updateTitle(c, n);
        })
    )
    .append(
        new Button().withText('Colors 1').onClick(() => updateFlowerSeeds(0))
            .togetherWith(new Button().withText('Colors 2').onClick(() => updateFlowerSeeds(1))
                .togetherWith(new Button().withText('Colors 3').onClick(() => updateFlowerSeeds(2))
                    .togetherWith(new Button().withText('Monochrome').onClick(() => updateFlowerSeeds(3)))))
    )
    .append(new Checkbox('Border around dots')
        .checked(drawBorderAroundDots)
        .onChange(checked => {
            showBorder = checked;
            updateFlowerSeeds();
        })
    )
    .start();

let currentScheme = 0
let showBorder = false
updateFlowerSeeds();

/** @param {number} schemeNr */
function updateFlowerSeeds(schemeNr= currentScheme) {
    currentScheme = schemeNr;
    n = 0;
    seedBindings.forEach(binding => {
        const seedColour = new Colour().setHSL(colorSchemes[schemeNr](binding.model), 1, .5);
        binding.view.fillColor = seedColour;
        binding.view.borderColor = showBorder ? Colour.White : seedColour;
    })
    updateTitle(c, n);
}
