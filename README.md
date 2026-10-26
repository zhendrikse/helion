![GitHub commit activity](https://img.shields.io/github/commit-activity/m/zhendrikse/helion?logo=git&logoColor=yellow)
![GitHub last commit](https://img.shields.io/github/last-commit/zhendrikse/helion?color=blue)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/zhendrikse/helion?color=blue&logo=git&logoColor=yellow)
[![Pull requests](https://img.shields.io/github/issues-pr/zhendrikse/helion?logo=git&color=blue&logoColor=yellow)](https://github.com/zhendrikse/helion/pulls)

# ✨ Helion

#### ❤️ Visualizing the beauty of math &amp; physics

[Helion](https://github.com/zhendrikse/helion) is a browser-native framework for interactive mathematics and physics.
It turns the browser into a virtual laboratory where scientific ideas can be explored through code,
numerical experiments, and interactive visualizations.

Helion is built around a simple principle: **scientific code should express scientific intent**.
Mathematical and physical concepts such as fields, transformations, forces, geometries, and numerical
solvers should be recognizable in the code, rather than hidden behind layers of generic software abstractions.

The result is a JavaScript environment (fast feedback loops!)
for building simulations that are both computationally
meaningful and visually engaging.

#### From scientific model to interactive visualization

Helion separates a scientific model from the way it is visualized.
A model describes the mathematical or
physical system; transformations modify its state, and solvers advance it according to the equations
or numerical methods being used. Views translate that state into a visual representation.

This separation makes it possible to explore the same model through different views,
to change how a system is solved without redesigning its visualization,
and to build interactive experiments from reusable components.

For example, Helion supports patterns such as:

```js
body.apply(gravity);
particle.apply(electricField);
pair.apply(spring);
pair.apply(collision);
```

Mathematical fields can likewise be transformed using operators:

```js
field.apply(new FFT2D());
field.apply(new Laplacian());
field.apply(new ShapeMask(...));
```

The goal is not to hide the mathematics, but to make the implementation reflect it.

📌 **Scientific intent first** — code that reads in terms of mathematical and physical ideas<br/>
📌 **Model-driven architecture** — scientific state is separate from its visual representation<br/>
📌 **Reusable numerical methods** — solvers and transformations can be combined with different models<br/>
📌 **Interactive 2D and 3D graphics** — observe the behavior of a system as it evolves<br/>
📌 **Browser-based exploration** — run the published demonstrations directly in your browser<br/>
📌 **Built for curiosity** — from individual mathematical objects to complex physical simulations

### 🧠 Core concepts

Helion organizes scientific simulations around a small set of complementary ideas. Each has a distinct responsibility.

| Concept            | Responsibility                                                  | Example                                                           |
| ------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Model / state**  | Represents the system being studied                             | A body, particle cloud, field, or wave function                   |
| **Transformation** | Changes a model or applies a physical or mathematical operation | A force, collision, or Fourier transform                          |
| **Solver**         | Computes the evolution or solution of a mathematical problem    | A wave-equation or Schrödinger solver                             |
| **View**           | Represents a model visually                                     | A sphere, field visualization, curve, or probability-density view |
| **Binding**        | Connects a model to its view and synchronizes their state       | `body.alwaysWith(view)`                                           |
| **Simulation**     | Coordinates time stepping, interaction, and rendering           | `Simulation.with(...).onStep(...)`                                |

A simplified picture of the architecture is:

```text
       Mathematical or physical system
                     │
                     ▼
                   Model
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   Transformation             Solver
       apply()                evolve()
          │                     │
          └──────────┬──────────┘
                     ▼
              Updated model
                     │
                     ▼
                Binding
                     │
                     ▼
                   View
                     │
                     ▼
          Interactive visualization
```

This is a conceptual overview rather than a strict execution pipeline:
transformations, solvers, and views play different roles and can be combined according to the problem.

### 🔬 One framework, many scientific domains

Helion is intended to support a broad range of mathematical and physical exploration.
The same architectural ideas can be used to study very different systems:

- **Classical mechanics:** forces, collisions, trajectories, and interacting particles.
- **Fields and waves:** scalar and vector fields, electromagnetic phenomena, wave propagation, and interference.
- **Quantum physics:** wave functions, quantum potentials, eigenstates, and probability distributions.
- **Mathematics:** complex functions, Fourier analysis, parametric surfaces, differential geometry, fractals, and numerical algorithms.
- **Molecular and statistical physics:** molecular interactions, particle systems, and thermodynamic behavior.
- **Nature-inspired systems:** procedural geometry, growth, and simulations of natural patterns.
- **Astronomy and relativity:** visual models of celestial systems and relativistic phenomena.

The published examples are an important part of Helion: they show how the underlying concepts
can be used in practice, from compact mathematical demonstrations to more elaborate simulations.

### 🎓 Designed for learning and exploration

Helion is particularly suited to situations where seeing a system evolve is as important as understanding its equations.

- 👩🏻‍🎓 **Students** exploring mathematics and physics through experiments.
- 👨🏻‍🏫 **Educators** building interactive demonstrations and explanations.
- 🧑‍💻 **Developers and learners** investigating algorithms and developing physical intuition.
- 🕵️ **Researchers and curious minds** prototyping models and exploring numerical behavior.

Rather than treating visualization as a final, separate step, Helion brings the model and its visual
representation together throughout the experiment. Parameters can be changed, simulations can be restarted,
and different representations can help reveal patterns that are difficult to see in equations alone.

### 🎯 Positioning

| Project         | Browser    | Nice 3D | Math semantics | Phys semantics | API        |
| --------------- | ---------- | ------- | -------------- | -------------- | ---------- |
| VPython         | 🤞         | 💪     | 🤏             | 🤏             | very basic |
| Three.js        | ✔️         | 🎖️     | ❌             | ❌             | low level  |
| p5.js           | ✔️         | 🤏     | ❌             | ❌             | basic      |
| Babylon.js      | ✔️         | 🎖️     | ❌             | ❌             | low level  |
| Mathematica     | ❌ (cloud) | 🎖️     | 💪💪💪        | 💪             | high level  |
| MATLAB          | ❌         | 👍     | 💪             | 🤏             | high level |
| Manim           | ❌         | 👍     | 💪             | ❌             | high level |
| Helion          | ✔️         | 👍     | 💪             | 💪             | high level |


### 🧪 Explore the live demonstrations

Browse the examples and explore the mathematics and physics interactively.

💫 [Astrophysics](https://www.hendrikse.name/helion/astrophysics/)<br/>
🎮️ [Games](https://www.hendrikse.name/helion/electromagnetism/games/)<br/>
⚡ [Electromagnetism](https://www.hendrikse.name/helion/electromagnetism/)<br/>
⚡ [Games](https://www.hendrikse.name/helion/electromagnetism/)<br/>
🏃 [Kinematics](https://www.hendrikse.name/helion/kinematics/)<br/>
🧮️ [Mathematics](https://www.hendrikse.name/helion/mathematics/)<br/>
🏕️ [Nature](https://www.hendrikse.name/helion/nature/)<br/>
🔦 [Optics](https://www.hendrikse.name/helion/optics/)<br/>
🔱 [Quantum physics](https://www.hendrikse.name/helion/quantumphysics/)<br/>
🌃 [Relativity](https://www.hendrikse.name/helion/relativity/)<br/>
🌡️ [Thermodynamics](https://www.hendrikse.name/helion/thermodynamics/)<br/>
🌊 [Waves](https://www.hendrikse.name/helion/waves/)<br/>

### 📚 Explore the code

Helion is an evolving open-source project. The source code, examples, and documentation provide a starting point for 
understanding how the framework works and for experimenting with new scientific ideas.

- [Source code on GitHub](https://github.com/zhendrikse/helion)
- [Browse the examples](https://github.com/zhendrikse/helion/tree/main/examples)



