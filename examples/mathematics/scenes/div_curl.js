import {
    Arrow, Checkbox,
    Label,
    RadialSymmetricBody,
    Simulation,
    Sphere,
    Vec3,
    VectorField,
    VectorModel
} from "../../../src/index.js";

class DemoVectorField extends VectorField {
    constructor(sourcePosition, sinkPosition, curlPosition=null) {
        super();
        this._source = sourcePosition;
        this._sink = sinkPosition;
        this._curl = curlPosition;
    }

    sample(position, target) {
        target.set(0, 0, 0);

        // Source: repelling
        const radiusToSource = position.clone().sub(this._source);
        const distanceToSource = Math.max(radiusToSource.length(), 0.05);
        target.add(radiusToSource.multiplyScalar(1 / (distanceToSource * distanceToSource)));

        // Sink: attracting
        const radiusToSink = this._sink.clone().sub(position);
        const distanceToSink = Math.max(radiusToSink.length(), 0.05);
        target.add(radiusToSink.multiplyScalar(1 / (distanceToSink * distanceToSink)));

        // Curl effect (optional)
        if (this._curl) {
            const radiusToCurl = position.clone().sub(this._curl);
            const curlV =
                new Vec3(-radiusToCurl.y, radiusToCurl.x, 0).multiplyScalar(0.3 / (radiusToCurl.length() + 0.1));
            target.add(curlV);
        }

        // Limit velocity
        const maxLen = 2;
        if (target.length() > maxLen) target.multiplyScalar(maxLen / target.length());
    }
}

const x_max = 2,
    x_min = -x_max,
    y_max = 0.75 * x_max,
    y_min = -y_max;

class OriginalDemoVectorField extends VectorField {
    constructor(sourcePosition, sinkPosition, curlPosition=null) {
        super();
        this._source = sourcePosition;
        this._sink = sinkPosition;
        this._curl = curlPosition;
        this._radius = 0.75;
    }
    
    sample(position, target) {
        if (this._curl.x - this._radius <= position.x &&
            position.x <= this._curl.x + this._radius &&
            this._curl.y - this._radius <= position.y &&
            position.y <= this._curl.y + this._radius)
        {
            const theta = Math.atan2((position.y - this._curl.y), (position.x - this._curl.x));
            target.set(-Math.sin(theta), Math.cos(theta), 0);
        } else if (this._sink.x - this._radius <= position.x &&
            position.x <= this._sink.x + this._radius &&
            this._sink.y - this._radius <= position.y &&
            position.y <= this._sink.y + this._radius)
        {
            const theta = Math.atan2((position.y - this._sink.y), (position.x - this._sink.x));
            target.set(-Math.cos(theta), -Math.sin(theta), 0);
        } else if (this._source.x - this._radius <= position.x &&
            position.x <= this._source.x + this._radius &&
            this._source.y - this._radius <= position.y &&
            position.y <= this._source.y + this._radius)
        {
            const theta = Math.atan2((position.y - this._source.y), (position.x - this._source.x));
            target.set(Math.cos(theta), Math.sin(theta), 0);
        } else if ((x_max - position.x <= 0.2 || position.x - x_min <= 0.2) &&
            (y_max - position.y <= 0.2 || position.y - y_min <= 0.2))
        {
            const vx = (x_max - position.x <= 0.2) ? -1 : 1;
            const vy = (y_max - position.y <= 0.2) ? -1 : 1;
            target.set(vx, vy, 0)
        } else if (x_max - position.x <= 0.2)
            target.set(0, 1, 0);
        else if (position.x - x_min <= 0.2)
            target.set(0, -1, 0);
        else if (y_max - position.y <= 0.2)
            target.set(-1, 0, 0);
        else if (position.y - y_min <= 0.2)
            target.set(1, 0, 0);
        else
            target.set(0.5, 1.5, 0);
    }
}

function createParticles() {
    const particles = [];
    for (let x = x_min; x <= x_max; x += 0.25)
        for (let y = y_min; y <= y_max; y += 0.25)
            particles.push(new RadialSymmetricBody({ position: new Vec3(x, y, 0), radius: 0.05 }));
    return particles;
}

function createArrows() {
    const arrows = [];
    const axisVector = new Vec3();
    for (let x = x_min; x <= x_max; x += 0.25)
        for (let y = y_min; y <= y_max; y += 0.25) {
            vectorField.sample(new Vec3(x, y, 0), axisVector);
            const axis = axisVector.clone().multiplyScalar(.2);
            const shift = axis.clone().multiplyScalar(-0.1);
            arrows.push(new VectorModel(new Vec3(x, y, 0).add(shift), axis));
        }
    return arrows;
}

const source = new RadialSymmetricBody({
    position: new Vec3(-1, 0.5, 0),
    radius: 0.25,
});
const sourceLabel = new Label({
    text: () => "Source",
    fontSize: "30px",
    visible: false,
    color: "#aaaaaa"
});
const sink = new RadialSymmetricBody({
    position:  new Vec3(-1, -0.5, 0),
    radius: 0.25,
});
const sinkLabel = new Label({
    text: () => "Sink",
    fontSize: "30px",
    visible: false,
    color: "#aaaaaa"
});
const curl = new RadialSymmetricBody({
    position:  new Vec3(1, 0.5, 0),
    radius: 0.25
});
const curlLabel = new Label({
    text: () => "Zero divergence",
    offset: () => new Vec3(0, -1.25, 0),
    fontSize: "30px",
    visible: false,
    color: "#aaaaaa"
});

let vectorField = new OriginalDemoVectorField(source.position, sink.position, curl.position);
const particles = createParticles();
const arrows = createArrows();
const arrowViews = [];
let opacity = 0;
for (const arrow of arrows)
    arrowViews.push(new Arrow({
        color: "yellow",
        opacity: opacity,
        round: true,
        size: .04
    }));

const velocity = new Vec3();
let resetCounter = 0;
const simulation = Simulation.with({
        htmlDivId: "divCurlDemoContainer",
        camera: {
            position: new Vec3(0, 0, 4.5),
            controls: false
        },
        infoPanel: {
            text: "<strong>Divergence:</strong><br/>" +
                "$$\\overrightarrow{\\nabla} =\\begin{pmatrix} \\partial/\\partial x \\\\ \\partial/\\partial y \\\\ \\partial/\\partial y \\end{pmatrix} " +
                "\\Rightarrow$$$$ \\overrightarrow{\\nabla} \\cdot \\overrightarrow{V} = \\dfrac{\\partial V_x}{\\partial x} + \\dfrac{\\partial V_y}{\\partial y} + \\dfrac{\\partial V_z}{\\partial z}" +
                "$$<strong>Curl:</strong><br/>$$\\overrightarrow{\\nabla} \\times \\overrightarrow{V} = " +
                "\\begin{vmatrix} \\hat{x} & \\hat{y} & \\hat{z} \\\\ " +
                "\\dfrac{\\partial}{\\partial x} & \\dfrac{\\partial}{\\partial y} & \\dfrac{\\partial}{\\partial z} \\\\ " +
                "V_x & V_y & V_z \\end{vmatrix} $$$$ = \\begin{pmatrix} \\partial V_z/\\partial y - \\partial F_y/\\partial z \\\\ " +
                "\\partial V_x/\\partial z - \\partial F_z/\\partial x \\\\ \\partial V_y/\\partial x - \\partial F_x/\\partial y" +
                "\\end{pmatrix}$$"
        }
    })
    .withMouseClickEventListener()
    .bind(source.onceWith(new Sphere({color: "red", opacity: 0.7 })))
    .bind(sink.onceWith(new Sphere({color: "green", opacity: 0.7 })))
    .bind(curl.onceWith(new Sphere({color: "cyan", opacity: 0.7 })))
    .bind(source.onceWith(sourceLabel))
    .bind(sink.onceWith(sinkLabel))
    .bind(curl.onceWith(curlLabel))
    .runsEvery(0.02)
    .advancesBy(0.0025)
    .onReset(() => {
        vectorField = (resetCounter++ % 2 === 0) ?
            new DemoVectorField(source.position, sink.position, curl.position) : 
            new OriginalDemoVectorField(source.position, sink.position, curl.position);
        opacity = 0;
        for (const arrow of arrowViews)
            arrow.opacity = opacity;
    })
    .onStep((clock, dt) => {
        // Update particles
        for (const particle of particles) {
            const position = particle.position;
            vectorField.sample(position, velocity);
            particle.state.position.addScaledVector(velocity, dt);
        }

        // Fading effect for arrows
        if (opacity < 1 && clock.simulatedTime > 0.1) {
            opacity += dt * .5;
            for (const arrow of arrowViews)
                arrow.opacity = opacity;
        }
    })
    .append(new Checkbox("Labels")
        .checked(false)
        .onChange(event => {
            sourceLabel.visible = event.target.checked;
            sinkLabel.visible = event.target.checked;
            curlLabel.visible = event.target.checked;
        }));

for (const particle of particles)
    simulation.bind(particle.alwaysWith(new Sphere({ color: "orange"})));

arrows.forEach((arrow, index) => simulation.bind(arrow.alwaysWith(arrowViews[index])));


