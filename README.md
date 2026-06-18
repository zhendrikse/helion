![GitHub commit activity](https://img.shields.io/github/commit-activity/m/zhendrikse/helion?logo=git&logoColor=yellow)
![GitHub last commit](https://img.shields.io/github/last-commit/zhendrikse/helion?color=blue)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/zhendrikse/helion?color=blue&logo=git&logoColor=yellow)
[![Pull requests](https://img.shields.io/github/issues-pr/zhendrikse/helion?logo=git&color=blue&logoColor=yellow)](https://github.com/zhendrikse/helion/pulls)

# ✨ Helion
<div class="header_line"><br/></div>

### ❤️ Visualizing the beauty of math &amp; physics

Helion is a browser-native framework for mathematical and physical modeling,
simulation, and visualization. It is built around high-level mathematical
concepts such as fields<sup>
<a href="https://www.hendrikse.name/helion/electromagnetism/">[1]</a>
</sup>, parametric geometries<sup>
  <a href="https://www.hendrikse.name/helion/mathematics/parametric_surfaces/">[2]</a>
</sup>, 
operators, and numerical solvers<sup>
<a href="https://www.hendrikse.name/helion/mathematics/fourier_transform/">[3]</a>
<a href="https://www.hendrikse.name/helion/nature/raindrops/">[4]</a>
</sup>.

The central abstractions in Helion are operators, **not** classes.
Mathematical entities such as fields, bodies, and geometries are transformed
through composable operations that mirror the structure of the underlying
mathematics.

Helion is the product of decades of exploration in mathematics, physics, programming,
and education, driven by a lifelong fascination with the beauty and patterns of nature.

## 🧠 Core ideas
<div class="header_line"></div>

Helion provides a [low-cognitive-overhead](https://en.wikipedia.org/wiki/Cognitive_load) environment for expressing
mathematical and physical systems, where models, simulations, and visualizations
remain tightly synchronized and can be explored interactively in the browser.

```
   +--------------+
   |    View      |
   +--------------+
          │ reads
          ▼
+--------------+               +-------------+
| Field/object | <-- applies --|   Solver    |
|   (state)    |               | (evolution) |
+--------------+               +-------------+
       │ uses                          │ uses
       ▼                               ▼
   Operator(s)                  Equation (law)
 (Laplace, FFT,                 (physics model)
  gradient, etc.)
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


