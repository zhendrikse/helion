# ✨ Helion
<div class="header_line"><br/></div>

Helion is a modular math & physics visualization toolkit for the browser. It provides a low-cognitive-overhead 
environment for visually expressing physical and mathematical ideas. These ideas can then easily be 
translated into code and rendered on the web.

## 🧠 Core idea
<div class="header_line"><br/></div>

A Helion program should read like a laboratory notebook with
one or more scientific experiment scripts, that
you can read and understand almost without knowing the framework at all.

If you cannot immediately explain what a line of code is doing in terms of 
physics or mathematics, it is likely too abstract!

👉 Experiments are meant to be **explicit, isolated, and readable**

## 📊 Code example
<div class="header_line"><br/></div>

Helion code expresses intent:

```js
// 1. Define renderer (visual layer)
const renderer = ThreeJsRenderer.on(HtmlDiv
        .withElementId("canvasWrapper")
        .contains(Canvas.withElementId("canvas")))
    .with(threeJsRendererOptions);

// 2. Bind physics objects to visual representations
renderer.add(physicsBody.to(new Sphere()));
renderer.add(coneGeometry.to(new IsoparametricContoursSurface()));

// 3. Run simulation
Simulation
    .with(renderer)
    .onScale(1e-10)
    .run((clockTime, simulatedTime) => {
        // physics update
    });
```

## 🎓 Educational focus
<div class="header_line"><br/></div>

Helion is designed for:

* students of physics and mathematics
* researchers prototyping ideas
* educators building interactive explanations
* learners exploring physical intuition

## 🧭 Design rule of thumb
<div class="header_line"><br/></div>

If a feature does not directly improve scientific understanding in code, it is not included.

Helion is designed with the following guidelines in mind:

- 📖 Readability over abstraction
- 🧠 Cognitive clarity over architectural generality
- 🔬 Scientific intent over software patterns
- 🧩 Explicit composition over implicit orchestration
- 🎯 Local reasoning over global framework state

Complex orchestration layers are intentionally avoided.

## 🧪 Live demos
<div class="header_line"><br/></div>

TODO

````

---
