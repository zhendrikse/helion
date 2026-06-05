# ✨ Helion
<div class="header_line"><br/></div>

### ❤️ Visualizing the beauty of math &amp; physics

Helion is a browser-native framework for mathematical and physical modeling,
simulation, and visualization. It is built around high-level mathematical
concepts such as fields, parametric geometries, operators, and numerical solvers.
The genuine abstraction in Helion is not based on "objects" but on
transformations between mathematical representations instead.

Helion provides a [low-cognitive-overhead](https://en.wikipedia.org/wiki/Cognitive_load) environment for expressing
mathematical and physical systems, where models, simulations, and visualizations
remain tightly synchronized and can be explored interactively in the browser.

Helion is the product of decades of exploration in mathematics, physics, programming,
and education, driven by a lifelong fascination with the beauty and patterns of nature.

#### 🧠 Core ideas
<div class="header_line"></div>

A Helion program should read like a laboratory notebook with
one or more scientific experiment scripts, that
you can read and understand almost without knowing the framework at all.

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

👉 JavaScript / browser-native (no installation or configuration)<br/>
👉 Code expresses scientific intent directly (object orientiation)<br/>
👉 It is model-driven (scalar &amp; vector fields, surfaces, operators)<br/>
👉 Supports multiple real-time views per model (model / view / contoller) <br/>

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


