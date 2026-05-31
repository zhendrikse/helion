---
title: "Getting started"
---

### Introduction
<div class="header_line"></div>

#### 📊 Helion code expresses intent
<div class="header_line"></div>

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
renderer.synchronize(coneGeometry.onceWith(new IsoparametricContoursView()));

// 4. Run simulation
Simulation
    .with(renderer)
    .onScale(1e-10)
    .onClockTick((clockTime, simulatedTime) => {
        // physics update
    });
```


#### 📊 My first simulation
<div class="header_line"></div>

TODO

## Design

Wat je nu hebt lijkt sterk op een kleine ECS/MVC-hybride, en dat schaalt veel beter dan losse imperative canvas-code.

```
Simulation
    updates solver
Solver
    updates field
SurfaceView
    samples field
```


In jouw architectuur (zoals je die nu gebruikt)

Je hebt 3 lagen:

1. Physics layer
   Dipole, Particle, VectorField

→ puur fysica in meters (of SI units)

2. Simulation layer
   Simulation

→ tijd, substeps, integratie

❗ hoort NIETS te weten over visual scale

3. Render layer
   ThreeJsRenderer._world
   ArrowField2
   Sphere
   etc.

→ mapping physics → visuals

```
numerics/
├── solvers/
│   ├── JacobiSolver
│   ├── GaussSeidelSolver
│   ├── MultigridSolver
│   └── FiniteDifferenceWaveSolver
│
├── operators/
│   ├── Laplacian2D
│   ├── Gradient2D
│   └── Divergence2D
│
├── boundaryconditions/
│   ├── Dirichlet
│   ├── Neumann
│   └── Periodic
```

```
SurfaceView
    ↓
Surface.sample()
    ↓
ScalarField.scalarValueAt()
```

```javascript
const field = new ScalarGridField(...);

const solver = new WaveEquationSolver({
    field,
    boundaryCondition: BoundaryCondition.Dirichlet
});

simulation.onClockTick((_, dt) => solver.step(dt));
```