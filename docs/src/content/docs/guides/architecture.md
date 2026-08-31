---
title: "🏛️ Architecture"
description: "How Helion is structured: state, operators, solvers, and the separation between model and view."
---

Helion is a browser-native framework for interactive math and physics. Its API is designed to express scientific intent directly, with a clear separation between mathematical/physical models and their visual representation.

```
Operator ──► State ──► View
  apply()        synchronize()
              ▲
              │ evolve()
              │
            Solver (uses Equation)
```

## Doctrine

In mathematics and physics, change is often expressed as

$$
\text{state} \xrightarrow{\text{operator}} \text{state}
\qquad\text{and}\qquad
\frac{d}{dt}\text{state} = \mathcal{L}(\text{state})
$$

Everything can be seen as states and operators. Software adds other constraints — intent, performance, memory, maintainability — so the most elegant mathematical abstraction is not always the best programming abstraction.

Helion follows one rule:

> **Unify concepts, not syntax.**

Different kinds of state share the same grammar, but keep their own semantics and types.

## Core grammar: State / apply / evolve / bind
<div class="header_line"></div>

| Concept | Question | Example |
|---------|----------|---------|
| `State` | What is the current state? | `DiscreteScalarField`, `DiscreteComplexField`, `RadialSymmetricBody` |
| `apply()` | How is the state transformed instantly? | `field.apply(new GaussianImpulse(...))` |
| `evolve()` | How does the state evolve in time? | `field.evolve(solver, dt)` |
| `bind()` | How is the state represented? | `simulation.bind(field.alwaysWith(view))` |

```js
// Instantaneous transformation: x ↦ O(x), no time
field.apply(new FFT2D());
field.apply(new GaussianImpulse({ amplitude: 1 }));

// Time evolution: x(t) ↦ x(t + Δt), explicit time step
field.evolve(solver, dt);

// Visualization: declarative binding, then synchronized each frame
simulation.bind(field.alwaysWith(view));
```

`apply` and `evolve` are deliberately distinct. An FFT is not a time step; a Schrödinger step is. Forcing both under `apply` hides that difference. Keeping `evolve` makes the physics readable:

```js
psi.apply(new GaussianImpulseComplex2D({ ... }))
   .evolve(new SchrodingerSolver(equation), dt);
```

State owns itself. The solver does not own the field:

```js
const solver = new SchrodingerSolver(equation);
solver.step(psi, dt);   // imperative form
psi.evolve(solver, dt); // preferred: state stays owner
```

This also allows one solver to evolve multiple fields.

## State, Operator, Equation, Solver
<div class="header_line"></div>

**State** — the thing that changes. All states extend `MathPhysicsModelBehavior` and share `apply()` / `alwaysWith()` / `onceWith()`.

```js
DiscreteScalarField
DiscreteComplexField
RadialSymmetricBody, Block, Lattice
```

**Operator** — an instantaneous algebraic or geometric transformation `x ↦ O(x)`.

```js
GaussianImpulse, PerlinNoiseOperator, DiamondSquareOperator
DoubleSlitOperator, ShapeMask, Potential, Softness
FFT2D, FFTShift2D, LaplaceOperator
```

Declarative composition is the norm:

```js
potential.reset()
  .apply(new DoubleSlit({ size: 40, energy: 0.1 }))
  .apply(new Softness(4));
```

**Equation** — a physical law, not a numerical scheme.

```js
BarrierWaveEquation   // and other equations in src/model/math/equations.js
```

**Solver** — a numerical procedure that realizes a discrete evolution operator `x(t+Δt) = U(Δt) x(t)`.

```js
WaveEquationSolver
SchrodingerSolver
```

Conceptually a solver *is* an operator (the time-evolution operator), but Helion keeps the syntax separate because the time step `dt` belongs to `evolve`, not `apply`.

Not everything is a `Field`. A `RadialSymmetricBody` has mass, momentum, and collisions; a `DiscreteComplexField` does not. The unification is

```
Everything is State
State is transformed by Operators
```

— not `Everything is a Field`.

## Fields, Surfaces and Views
<div class="header_line"></div>

**Field** — a mathematical object with `sample(u, v, target)` (continuous) or `valueAt(i, j, target)` (discrete). The `target` is written into (duck typing): a number, a `Complex`, or a `Vec3`.

- `Field` — abstract `sample(u, v, target)`
- `DiscreteScalarField` — grid `Float32Array`, `valueAt(x,y)`, `sample` via bilinear interpolation
- `DiscreteComplexField` — two `Float32Array`s, `valueAt(i,j,target: Complex)`
- `VectorField` — `sample(positionVector, target)`

**Surface** — a representation of a field, still a mathematical object. Base `Surface` exposes `frameAt(u, v, target)` via `DifferentialGeometry` (positions, normals, curvatures `k1/k2`, principal directions `d1/d2`).

- `ParametricSurface` — `(u,v) → (x,y,z)` over a `Domain`
- `MultivariateFunctionSurface` — `z(x, y, t)` with animatable `time`
- `ComplexSurface` — `sample` writes `Complex`
- `DiscreteFieldSurface` — adapter that wraps a `DiscreteScalarField` and implements `frameAt` with `valueAt` + central-difference `_normalAt`, so a raster field can be rendered as a continuous surface

This adapter is the unification layer. The 3D view does not need to know whether the surface is analytic or discrete:

```js
SurfaceVisualization.canBindTo = model => typeof model.frameAt === "function"
```

For complex discrete fields the same pattern is planned as `DiscreteComplexFieldSurface` (height = `|z|` or `Re(z)`, phase as color).

**View** — rendering only. Checked via `canBindTo`:

- `SurfaceVisualization` + `SurfaceResolution` + `FixedIntervalNormalizer` + layers (`HeightLayer`, `ColorLayer`, `ContoursLayer`, `PrincipalDirectionsLayer`) — for anything with `frameAt`
- `ComplexScalarFieldSurfaceRaster` / `PotentialField3DRaster` — legacy discrete rasters that bind via `valueAt`
- `ScalarFieldIntensityPixelRaster`, `ComplexScalarFieldRaster` — 2D canvas rasters

Sampling always goes through the surface:

```
View.synchronizeWith()
  → Surface.frameAt(u, v, frame)
    → DifferentialGeometry or discrete _normalAt
  → Layer builds Three.js geometry
```

## Simulation and Binding
<div class="header_line"></div>

`Simulation` is a builder that owns the render loop and the DOM plumbing (`Viewport` → `ThreeJsRenderer`). Typical setup:

```js
Simulation.with({
  htmlDivId: "container",
  cameraPosition: new Vec3(3, 3, 3),
  scale: 1,
  headUpDisplay: true
})
  .runsEvery(0.016)                          // wall-clock scheduling
  .onStep((clock, dt) => {                   // called at fixed dt
    field.evolve(solver, dt);
  })
  .bind(field.alwaysWith(surfaceView))       // continuous sync
  .bind(potential.onceWith(barrierView))     // one-shot sync (static)
  .append(slider)                            // controls → details element
  .provideAxesAround(surfaceView)
  .frameSceneOn(surfaceView)
  .start();
```

Key loop (`Simulation.animate`):

```
requestAnimationFrame
  → SimulationClock accumulates wall time (realTimeStep vs simulationTimeStep)
  → _updatePhysics(): while (accumulator >= realTimeStep) stepFunction(clock, dt)
  → Binding.synchronize(): view.synchronizeWith(model) if ALWAYS or dirty
  → ThreeJsRenderer.render()
```

- `runsEvery(dt)` — wall-clock interval. `advancesBy(dt)` / `atSpeed(scale)` — simulated time per step.
- `onStep(fn)` — fixed-step mode (deterministic). `maxOutCpu(fn)` — adaptive mode that tunes `iterationsPerFrame` to hit a target frame rate.
- `alwaysWith(view)` — synchronized every frame. `onceWith(view)` — synchronized once at `initialize` (for static geometry).
- `Viewport` builds `container → canvasWrapper → canvas + HUD + CSS2D labels + controls`.
- `SimulationClock` separates `realTimeStep`, `simulationTimeStep`, `accumulator`, and `timeScale`.

Design principle:

> A model is bound to a view exactly once. Afterwards the view may change internally without the binding or the simulation knowing.

## Layers and directory map
<div class="header_line"></div>

```
src/
  core/helion.js              Simulation, Binding, Viewport, SimulationClock, Registry
  core/controls.js            Slider, DropdownMenu, Checkbox, RadioGroup, Button
  model/math/math.js          Vec2, Vec3, Complex, Interval, Range, Domain
  model/math/fields.js        Field, DiscreteScalarField, DiscreteComplexField
  model/math/surfaces.js      Surface, ParametricSurface, ComplexSurface, DiscreteFieldSurface
  model/math/numerics/        DifferentialGeometry, solvers, integrators
  model/phys/bodies.js        Body, RadialSymmetricBody, Block, Lattice, BodyPair
  model/phys/forces.js        Force, GravitationalForce, CoulombForce, SpringForce
  model/transformations/      Operators (FFT2D, GaussianImpulse, DoubleSlit, …)
  view/3d/surfaces/           SurfaceVisualization, layers, normalizers
  view/3d/renderer.js         ThreeJsRenderer
  view/3d/primitives/         Sphere, Box, Arrow, Trail, VectorView, …
  view/3d/composite/          PointCloudView, LatticeView, …
  view/2d/views.js            2D rasters
```

Conceptually:

```
Mathematical layer   Field, Surface, DifferentialGeometry
        ↓
Discretization       Domain, SurfaceResolution, sampling grids
        ↓
View layer           SurfaceVisualization, layers, color mappers
        ↓
Rendering            ThreeJsRenderer, materials, shaders
        ↓
Simulation           Simulation, Binding, clock, controls
```

The physics/simulation layers know nothing about visual scale; the render layer maps physics units to world units via `Simulation.with({ scale })`.

## Further reading

- Getting Started — first simulation with bodies (`guides/getting_started`)
- `src/index.js` — public exports (the reference surface)
- `examples/mathematics/scenes/real_surfaces.js` — continuous surface + `SurfaceVisualization`
- `examples/quantumphysics/scenes/quantum_wave_scattering.js` — discrete complex field + `SchrodingerSolver`
- `README.md` — project overview and positioning
