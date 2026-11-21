import { MeshStandardMaterial } from 'three';
import {Block, Segments, BoxSegmentsView, Simulation, Vec3, Checkbox} from '../../../../src/index.js';

const depth = 4;
const finalSize = 200;

/** @type {Segments<Block>} */
const sponge = new Segments();
function mengerSponge(pos, size, currentDepth) {
    if (currentDepth === 0) {
        sponge.add(new Block({position: pos, size: new Vec3(size, size, size)}));
        return;
    }

    const newSize = size / 3;
    for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
            for (let z = -1; z <= 1; z++)
                // Remove the cubes in the middle
                if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 1)
                    mengerSponge( new Vec3(x, y, z).multiplyScalar(newSize).add(pos), newSize, currentDepth - 1);
}

mengerSponge(new Vec3(), finalSize, depth);
const spongeView = new BoxSegmentsView({
    material: new MeshStandardMaterial({ roughness: 0.55, metalness: 0.75 }),
    colorMapper: (segment, index, targetColor) => {
        let hue = 0.175 + segment.position.y / 600;
        targetColor.setHSL(hue % 1, 1.0, 0.5);
    }
});

let autoRotate = true;
Simulation
    .with({
        htmlDivId: 'mengerSpongeContainer',
        headUpDisplay: { enabled: false },
        camera: { position: new Vec3(-360, 330, -400), fieldOfView: 30 },
        infoPanel: {
            text: '<strong>🧽 Menger sponge</strong><br/>' +
                '• Every face is a <a href=\"https://en.wikipedia.org/wiki/Sierpi%C5%84ski_carpet\">Sierpiński carpet</a><br/>' +
                '• Volume: $$V_n=\\left(\\frac{20}{27}\\right)^n \\to 0,\\ n\\to\\infty$$<br/>' +
                '• Area: $$A_n\\propto\\left(\\frac{20}{9}\\right)^n \\to \\infty,\\ n\\to\\infty$$<br/>' +
                '• Dimension <a href=\"https://en.wikipedia.org/wiki/Embedding\">embedded space</a> is 3<br/>' +
                '• <a href=\"https://en.wikipedia.org/wiki/Hausdorff_dimension\">Hausdorff dimension</a> is $$\\frac{\\ln(20)}{\\ln(3)}\\approx 2.726833$$<br/>' +
                '• <a href=\"https://en.wikipedia.org/wiki/Lebesgue_covering_dimension\">Topological dimension</a> is 1<br/>'
        }
    })
    .bind(sponge.onceWith(spongeView))
    .onStep(() => { if (autoRotate) spongeView.rotation.y += 5e-4; })
    .append(new Checkbox('Auto rotate').checked(true).onChange(checked => autoRotate = checked))
    .start();
