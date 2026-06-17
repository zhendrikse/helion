import {
    ColorMapper, DiscreteScalarField, ScalarFieldIntensityPixelRaster, Simulation, uniform, Vec3
} from "../../../src/index.js";

const img_x = 512
const img_y = 512

class BarnsleyFern {
    constructor() {
        this._field = new DiscreteScalarField({ nx: img_x, ny: img_y });
        this._positionVector = new Vec3();
    }

    get field() { return this._field }

    transform(position) {
        const rand = uniform(0, 100);
        const x = position.x;
        const y = position.y;

        if (rand < 1)
            position.set(0, 0.16 * y, 0);
        else if (rand <= 1 && rand < 86)
            position.set(0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6, 0);
        else if (rand <= 86 && rand < 93)
            position.set(0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6);
        else
            position.set(-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44);
    }

    iterate() {
        this.transform(this._positionVector);
        const px = Math.round((this._positionVector.x + 3) / 6 * (img_x - 1));
        const py = Math.round(this._positionVector.y / 10 * (img_y - 1));
        this._field.setValueAt(Math.round(px), Math.round(py), 1);
    }
}

//
// class BarnsleyFern3D:
// def __init__(self, pixel_radius=0.95, paint_color=vec(0, .8, 0)):
// self.paint_color = paint_color
// self.pixels = points(radius=pixel_radius)
//
// def transform(self, x, y, z):
// r = random()
// if r <= 0.1:  # 10% probability
// xn = 0.0
// yn = 0.18 * y
// zn = 0.0
// elif 0.1 < r <= 0.7:  # 60% probability
// xn = 0.85 * x
// yn = 0.85 * y + 0.1 * z + 1.6
// zn = -0.1 * y + 0.85 * z
// elif 0.7 < r <= 0.85:  # 15 % probability
// xn = 0.2 * x - 0.2 * y
// yn = 0.2 * x + 0.2 * y + 0.8
// zn = 0.3 * z
// else:
// xn = -0.2 * x + 0.2 * y  # 15% probability
// yn = 0.2 * x + 0.2 * y + 0.8
// zn = 0.3 * z
// return xn, yn, zn
//
// def iterate(self, iterations):
// x, y, z = 0.5, 0.0, -0.2
// for i in range(1, iterations):
// x, y, z = self.transform(x, y, z)
// xc = 4.0 * x  # linear TF for plot
//     yc = 2.0 * y - 7
// zc = z
// self.pixels.append(pos=vec(xc, yc, zc), color=self.paint_color)
//
//
// def toggle_fractal(event):
// if event.name == "fern":
// clear_canvas(range_=5.5, forward=vector(0, 0, -1), center=vector(0, 5, 0))
// BarnsleyFern().iterate(100000)
// fern_3d_radio.checked = False
// else:
// clear_canvas(range_=10, forward=vector(-.85, -.13, -.51), center=vector(.93, 1.51, -1.02))
// BarnsleyFern3D().iterate(20000)
// fern_radio.checked = False
//
//
// display.append_to_caption("\n")
// fern_radio = radio(text="Barnsley&apos;s fern ", checked=True, name="fern", bind=toggle_fractal)
// fern_3d_radio = radio(text="3D Barnsley&apos;s fern ", checked=False, name="fern_3d", bind=toggle_fractal)
//
// #MathJax.Hub.Queue(["Typeset", MathJax.Hub])
// BarnsleyFern().iterate(100000)
// while True:
// rate(10)

class FernColorMapper extends ColorMapper {
    map(value, targetColor) {
        if (value === 1)
            targetColor.setRGB(0, 0.8 * 255, 0);
    }
}

const fernImage = new ScalarFieldIntensityPixelRaster({
    width: img_x,
    height: img_y,
    colorMapper: new FernColorMapper()
});
const fern = new BarnsleyFern();

Simulation
    .with({
        htmlDivId: "fernContainer",
        cameraPosition: new Vec3(2, .5, .75).multiplyScalar(10)
    })
    .synchronize(fern.field.alwaysWith(fernImage))
    .onClockTick(() => fern.iterate())
    .start();