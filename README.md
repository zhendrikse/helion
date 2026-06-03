# ✨ Helion
<div class="header_line"><br/></div>

### ❤️ Visualizing the beauty of math &amp; physics

Helion is a browser-native generative math & physics visualization engine.
It is built around explicit mathematical semantics such as scalar fields, vector fields,
and parametric geometry, rather than ad-hoc visual scripting.

It provides a [low-cognitive-overhead](https://en.wikipedia.org/wiki/Cognitive_load) environment for expressing
mathematical and physical systems, where models, simulation, and visualization remain tightly synchronized
in time and are directly executable in the web browser.

## 🧠 Core ideas

Helion provides a semantic layer for mathematics and physics visualization
on the web. A Helion program should read like a laboratory notebook with
one or more scientific experiment scripts, that
you can read and understand almost without knowing the framework at all.

If you cannot immediately explain what a line of code is doing in terms of
physics or mathematics, it is likely too abstract!

👉 JavaScript / Web-native (no installation or configuration)<br/>
👉 Code expresses scientific intent directly<br/>
👉 It is model-driven (scalar &amp; vector fields, surfaces, operators)<br/>
👉 Supports multiple views per model (model / view / contoller) <br/>
👉 Low [cognitive overhead](https://en.wikipedia.org/wiki/Cognitive_load)<br/>

## 💻 Helion code expresses intent

```js
// 1. Do your physics and math
const coneGeometry = new SchwarzschildSurface(sunMass);
const spring = new Spring();

// 2. Choose renderer (visual layer)
const renderer = ThreeJsRenderer.on(HtmlDiv
    .withElementId("canvasWrapper")
    .contains(Canvas.withElementId("canvas")))

// 3. Bind physics objects to visual representations
Simulation
    .with(renderer)
    .synchronize(spring.alwaysWith(new Helix()))
    .synchronize(coneGeometry.onceWith(new IsoparametricContoursView()))
    .onScale(1e-10)
    .onClockTick((clockTime, simulatedTime) => {
        // physics update
    });
```

## 🎓 Focus on teaching &amp; learning

Helion is designed for:

👩🏻‍🎓 students of physics and mathematics<br/>
🕵️ researchers prototyping ideas<br/>
👨🏻‍🏫 educators building interactive explanations<br/>
🧑‍💻 learners exploring physical intuition<br/>


## 🎯 Positioning

| Project         | Browser    | Nice 3D | Math semantics | Phys semantics | API        |
| --------------- | ---------- | ------- | -------------- | -------------- | ---------- |
| VPython         | 🤞         | 🤏     | 🤏             | 💪             | very basic |
| Three.js        | ✔️         | 🎖️     | ❌             | ❌             | low level  |
| p5.js           | ✔️         | 🤏     | ❌             | ❌             | basic      |
| Babylon.js      | ✔️         | 🎖️     | ❌             | ❌             | low level  |
| Observable Plot | ✔️         | 2D     | Statistics     | ❌             | high level  |
| Mathematica     | ❌ (cloud) | 🎖️     | 💪💪💪        | 💪             | high level  |
| MATLAB          | ❌         | 👍     | 💪             | 🤏             | high level |
| Manim           | ❌         | 👍     | 💪             | ❌             | high level |
| Helion          | ✔️         | 👍     | 💪             | 💪             | high level |

## 🧪 Live demos

💫 [Astrophysics](https://www.hendrikse.name/helion/astrophysics/)<br/>
⚡  [Electromagnetism](https://www.hendrikse.name/helion/electromagnetism/)<br/>
🏃 [Kinematics](https://www.hendrikse.name/helion/kinematics/)<br/>
🧮️ [Mathematics](https://www.hendrikse.name/helion/mathematics/)<br/>
🏕️ [Nature](https://www.hendrikse.name/helion/nature/)<br/>
🔦 [Optics](https://www.hendrikse.name/helion/optics/)<br/>
🔱 [Quantum physics](https://www.hendrikse.name/helion/quantumphysics/)<br/>
🌃 [Relativity](https://www.hendrikse.name/helion/relativity/)<br/>
🌊 [Waves](https://www.hendrikse.name/helion/waves/)<br/>


