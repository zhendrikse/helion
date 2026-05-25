# ✨ Helion
<div class="header_line"><br/></div>

### ❤️ Visualizing the beauty of math &amp; physics

Helion is a modular math & physics visualization toolkit for the browser. It provides a low-cognitive-overhead 
environment for visually expressing physical and mathematical ideas. These ideas can then easily be 
translated into code and rendered on the web.

## 🧠 Core idea

A Helion program should read like a laboratory notebook with
one or more scientific experiment scripts, that
you can read and understand almost without knowing the framework at all.

If you cannot immediately explain what a line of code is doing in terms of 
physics or mathematics, it is likely too abstract!

👉 Experiments are meant to be **explicit, isolated, and readable**<br/>
👉 Low cognitive overhead<br/>
👉 Code expresses scientific intent directly<br/>
👉 Purely browser based: zero installation nor configuration<br/>

## 📊 Code example

Helion code expresses intent:

```js
// 1. Do your physics and math
const coneGeometry = new SchwarzschildSurface(sunMass);
const spring = new Spring();
    ...

// 2. Choose renderer (visual layer)
const renderer = ThreeJsRenderer.on(HtmlDiv
        .withElementId("canvasWrapper")
        .contains(Canvas.withElementId("canvas")))

// 3. Bind physics objects to visual representations
renderer.synchronize(spring.alwaysWith(new Helix()));
renderer.synchronize(coneGeometry.onceWith(new IsoparametricContoursSurface()));

// 4. Run simulation
Simulation
    .with(renderer)
    .onScale(1e-10)
    .onClockTick((clockTime, simulatedTime) => {
        // physics update
    });
```

## 🎓 Educational focus

Helion is designed for:

👩🏻‍🎓 students of physics and mathematics<br/>
🕵️ researchers prototyping ideas<br/>
👨🏻‍🏫 educators building interactive explanations<br/>
🧑‍💻 learners exploring physical intuition<br/>

## 🧭 Design rule of thumb

If a feature does not directly improve scientific understanding in code, it is not included.

Helion is designed with the following guidelines in mind:

📖 Readability over abstraction<br/>
🧠 Cognitive clarity over architectural generality<br/>
🔬 Scientific intent over software patterns<br/>
🧩 Explicit composition over implicit orchestration<br/>
🎯 Local reasoning over global framework state<br/>

Complex orchestration layers are intentionally avoided.

## 🧪 Live demos

⚡  [Electromagnetism](https://www.hendrikse.name/helion/electromagnetism/)<br/>
🏃 [Kinematics](https://www.hendrikse.name/helion/kinematics/)<br/>
💫 [Astrophysics](https://www.hendrikse.name/helion/astrophysics/)<br/>
🌊 [Waves](https://www.hendrikse.name/helion/waves/)<br/>



