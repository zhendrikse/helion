---
title: "Getting started"
---

## Design

Wat je nu hebt lijkt sterk op een kleine ECS/MVC-hybride, en dat schaalt veel beter dan losse imperative canvas-code.

```
                ┌──────────────────────────────┐
                │     Mathematical Layer       │
                │                              │
                │  ScalarField                │
                │  VectorField               │
                │  ParametricSurface         │
                │  DifferentialGeometry       │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │     Discretization Layer     │
                │                              │
                │  Range                      │
                │  SurfaceResolution          │
                │  Sampling (u,v grids)       │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │       View Layer             │
                │                              │
                │  PlaneSurfaceView          │
                │  IsoparametricContoursView  │
                │  ArrowField                │
                │  PointCloudView            │
                │  ScalarFieldSurface         │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │      Rendering Layer         │
                │                              │
                │  ThreeJsRenderer            │
                │  InstancedMesh             │
                │  Materials / Shaders       │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │     Simulation Layer         │
                │                              │
                │  Simulation loop            │
                │  EventController           │
                │  Time evolution            │
                └──────────────────────────────┘
```

MVC: 

```
Simulation
    updates solver
Solver
    updates field
SurfaceView
    samples field
```

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



# Introduction
<div class="header_line"></div>

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

# Getting started
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


# The physics layer
<div class="header_line"></div>

# The simulation layer
<div class="header_line"></div>

# The rendering layer
<div class="header_line"></div>

## Surfaces

```
Surface
↓
ScalarField (ruwe waarde)
↓
NormalizedScalarField (altijd [0,1])
↓
ColorMapper (blind voor fysica)
↓
View (alleen rendering)
```

```javascript
/**
* Scalar field on a surface.
* │
* ├── MeanCurvatureField
* ├── GaussianCurvatureField
* ├── PrincipalCurvatureField
* ├── GeodesicDistanceField
* ├── UserDefinedField
  */
  export class SurfaceScalarField 

```

# User interaction
<div class="header_line"></div>
