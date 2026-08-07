![GitHub commit activity](https://img.shields.io/github/commit-activity/m/zhendrikse/helion?logo=git&logoColor=yellow)
![GitHub last commit](https://img.shields.io/github/last-commit/zhendrikse/helion?color=blue)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/zhendrikse/helion?color=blue&logo=git&logoColor=yellow)
[![Pull requests](https://img.shields.io/github/issues-pr/zhendrikse/helion?logo=git&color=blue&logoColor=yellow)](https://github.com/zhendrikse/helion/pulls)

# ✨ Helion
<div class="header_line"><br/></div>

### ❤️ Visualizing the beauty of math &amp; physics

Helion is a _browser-native_ framework for interactive mathematics and physics.
Its API is designed to express scientific ideas as
directly as possible by offering a scientific domain-specific language
embedded in JavaScript.

As a consequence, semantics that are immediately familiar to mathematicians
and physicists take precedence over software abstractions that would introduce an
unnecessary learning curve. Examples of such semantics are concepts such as
transformations, fields, parametric geometries, operators, and numerical solvers.

Helion is built around the concept of transformations and maintains a clear separation
between mathematical or physical models and their visual representations. Models evolve
by applying transformations to them, while one or more views visualize their state.

Helion is the product of decades of exploration in mathematics, physics, programming,
and education, driven by a lifelong fascination with the beauty and patterns of nature.

📌 Code _expresses scientific intent_ directly<br/>
📌 Browser-native JavaScript &mdash; no installation or build steps<br/>
📌 Model-driven API built around fields, operators, geometries, and transformations<br/>
📌 Multiple synchronized views can observe the same model<br/>
📌 Designed for education, exploration, and interactive simulations <br/>

#### Examples

##### Physical transformations

```js
body.apply(gravity);
particle.apply(electricField);
pair.apply(spring);
pair.apply(collision);
```

##### Mathematical transformations

```js
field.apply(new FFT2D());
field.apply(new Laplacian());
field.apply(new ShapeMask(...));
```

## 🧠 Core concepts
<div class="header_line"></div>

Helion provides a [low-cognitive-overhead](https://en.wikipedia.org/wiki/Cognitive_load) environment for expressing
mathematical and physical systems, where models, simulations, and visualizations
remain tightly synchronized and can be explored interactively in the browser.

The following concepts form the core of Helion:

| Concept         | Question                      | Example                  |
| --------------- | ------------------------------| ------------------------ |
| `State`    | What is the current state?    | Field / Body / Particle cloud |
| `apply()`  | How is the state transformed? | GaussianImpulseOperator       |
| `evolve()` | How does the state evolve?    | SchrödingerSolver             |
| `bind()`   | How is the state represented? | `bind(body.alwaysWith(view))` |

These concepts are interacting with one another in the following way:

```
       Equation (physical law)
                  ▲
                  │
                uses
                  │
               Solver
                  ▲
                  │
              evolve()
                  │
                  ▼
   Operator ──► State ──► View
     apply()          synchronize()
```

## 🎓 Focus on teaching &amp; learning

Helion is designed for:

👩🏻‍🎓 students learning physics and mathematics
👨🏻‍🏫 educators building interactive explanations
🧑‍💻 learners developing physical intuition
🕵️ researchers prototyping ideas


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
🌡️ [Thermodynamics](https://www.hendrikse.name/helion/thermodynamics/)<br/>
🌊 [Waves](https://www.hendrikse.name/helion/waves/)<br/>


