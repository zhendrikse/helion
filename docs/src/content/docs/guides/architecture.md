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

The Field/Surface/View architecture is designed around a simple distinction:

> **A Field describes values. A Surface describes geometry. A View describes how those values and that geometry are rendered.**

A Surface is useful, but it is not a mandatory intermediary between a Field and a View.

### Field

A **Field** is a mathematical object that answers the question:

> What is the value of this field at a given parameter or grid location?

Continuous fields provide a parameter-space operation such as:

```js
field.sample(u, v, target);
```

Discrete fields additionally expose their native grid:

```js
field.valueAt(i, j, target);
field.nx;
field.ny;
```

The distinction between continuous and discrete fields should remain an implementation detail of the data-access layer, rather than something that every View has to understand.

The intended common abstraction is a field sampling/grid capability, for example:

```js
field.sampleGrid(resolution, target);
```

or an equivalent iterator over samples. The important contract is that the Field chooses the most appropriate representation:

- A continuous field samples its mathematical function at the requested resolution.
- A discrete field uses its **native grid directly** when that grid is suitable.
- A discrete field must not be needlessly resampled merely because a View asks for a raster.

This is particularly important for large numerical simulations: the existing grid is already the data representation, so interpolating it into another grid only to render it wastes CPU and memory.

Current examples include:

- `Field` — common field abstraction
- `ScalarField` — real-valued field
- `ComplexField` — complex-valued field
- `VectorField` — vector-valued field
- `MultivariateFunction` — continuous scalar field over a `Domain`
- `ComplexFunction` — continuous complex field over a `Domain`
- `DiscreteScalarField` — scalar values stored on a native grid
- `DiscreteComplexField` — complex values stored on native real/imaginary grids

### Surface

A **Surface** is a geometrical embedding or sampling layer. It answers questions that a Field alone does not answer:

> Where does this value live in 3D space, and what is the local geometry there?

A genuine Surface can provide information such as:

```js
surface.frameAt(u, v, frame);
```

where the frame may contain position, normal, curvature, and principal directions through `DifferentialGeometry`.

Examples include:

- `ParametricSurface` — `(u, v) → (x, y, z)` over a `Domain`
- `ScalarFieldSurface` — embeds a scalar field as a height surface
- `DiscreteFieldSurface` — derives positions and normals from a native scalar grid

The important architectural point is that a Surface is **not simply a wrapper around a Field**. A class whose only purpose is to delegate `sample()` to a Field does not add meaningful geometry and should not be required merely to make the Field visualizable.

Thus a `ComplexFieldSurface`-style adapter should not be the normal route for visualizing a complex field. Complex fields should be directly bindable to Views, while a genuine Surface can still be supplied when a particular geometric embedding is desired.

### Two paths to visualization

The public API should support both of these paths:

```text
                         Field
                           │
              ┌────────────┴────────────┐
              │                         │
        direct visualization      optional geometry
              │                         │
              ▼                         ▼
        FieldView2D/3D               Surface
                                        │
                                   frameAt(u,v)
                                        │
                                        ▼
                                   FieldView3D
```

For ordinary field visualization, the user should be able to write:

```js
field.alwaysWith(new FieldView2D());
field.alwaysWith(new FieldView3D());
```

without first constructing a Surface.

When geometric information is meaningful, a Surface remains available as an explicit layer:

```js
const surface = new ParametricSurface({ ... });

surface.alwaysWith(new FieldView3D({ field }));
```

The exact API may evolve, but the architectural rule remains: **a Field does not need to become a Surface in order to be rendered.**

### View

A **View** is responsible for rendering, not for deciding whether its model is continuous or discrete.

The target public API should converge on two general-purpose field Views:

- `FieldView2D` — 2D visualization of scalar, complex, and other supported field values
- `FieldView3D` — 3D visualization, optionally using Surface geometry

The View should ask the model for the representation it needs rather than branching on concrete field types:

```js
view.canBindTo(model);
view.initialize(model);
view.synchronizeWith(model);
```

Continuous versus discrete data should therefore be handled by the Field's data-access strategy, not by a proliferation of View classes.

This replaces the need for separate public Views such as:

```text
DiscreteFieldSurfaceView
DiscreteComplexFieldSurfaceView2D
ContinuousComplexFieldView
DiscreteComplexFieldSurfaceView
...
```

where those distinctions exist primarily because the source representation differs.

### Native grids versus sampling

There are two fundamentally different rendering cases:

```text
Continuous field
    │
    └── sample at View resolution
             │
             ▼
        rendering grid

Discrete field
    │
    └── native grid
             │
             ▼
        rendering grid
```

A discrete field should normally render its existing grid directly. A continuous field has no native raster, so the View or Field sampling layer must create one at an appropriate resolution.

This principle applies equally to real-valued and complex-valued fields. It should not be special-cased for complex fields.

### Architectural boundary

The resulting responsibilities are:

| Layer | Responsibility |
|-------|----------------|
| **Field** | Values, domain, resolution, and efficient access to continuous or native-grid data |
| **Surface** | Optional geometric embedding, position, normals, and differential geometry |
| **View** | Rendering values and, when present, geometry |
| **Renderer** | Three.js/WebGL mechanics and scene rendering |

The key rule is:

> **A Field is directly visualizable. A Surface is optional geometry, not a mandatory adapter.**

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
  model/math/fields.js        Field, ScalarField, ComplexField, DiscreteScalarField, DiscreteComplexField
  model/math/surfaces.js      Surface, ParametricSurface, ScalarFieldSurface, DiscreteFieldSurface
  model/math/numerics/        DifferentialGeometry, solvers, integrators
  model/phys/bodies.js        Body, RadialSymmetricBody, Block, Lattice, BodyPair
  model/phys/forces.js        Force, GravitationalForce, CoulombForce, SpringForce
  model/transformations/      Operators (FFT2D, GaussianImpulse, DoubleSlit, …)
  view/3d/surfaces/           SurfaceVisualization, layers, normalizers
  view/3d/renderer.js         ThreeJsRenderer
  view/3d/primitives/         Sphere, Box, Arrow, Trail, VectorView, …
  view/3d/composite/          PointCloudView, LatticeView, …
  view/2d/views.js             2D field views and raster views
```

Conceptually:

```
Mathematical layer   Field, Surface, DifferentialGeometry
        ↓
Data representation  Continuous sampling or native discrete grids
        ↓
Geometry (optional)  Surface embedding, frames, normals, curvature
        ↓
View layer           FieldView2D, FieldView3D, layers, color mappers
        ↓
Rendering            ThreeJsRenderer, materials, shaders
        ↓
Simulation           Simulation, Binding, clock, controls
```

The physics/simulation layers know nothing about visual scale; the render layer maps physics units to world units via `Simulation.with({ scale })`.

## Migration direction
<div class="header_line"></div>

The architecture is intended to evolve without breaking existing examples in one step.

1. Introduce the common Field data-access capability for rendering continuous samples and native discrete grids.
2. Make the new 2D and 3D field Views bind directly to Fields.
3. Keep Surface for genuine geometric use cases such as parametric geometry, height surfaces, normals, and differential geometry.
4. Update real-valued and complex-valued examples to use direct Field → View binding where no geometric Surface is required.
5. Preserve existing Surface/View classes temporarily as compatibility adapters or aliases while examples migrate.
6. Remove redundant specialized Views and thin Field→Surface adapters once the public API no longer depends on them.

The goal is not to eliminate abstractions, but to place each abstraction where it provides real value:

```text
Field       = what value exists?
Surface     = where is it, and what is its geometry?
View        = how should it be rendered?
```

This keeps the mathematical model natural, preserves native-grid performance, and prevents the rendering API from being shaped by implementation details of the underlying data representation.

## Further reading

- Getting Started — first simulation with bodies (`guides/getting_started`)
- `src/index.js` — public exports (the reference surface)
- `examples/mathematics/scenes/real_surfaces.js` — continuous surface + `SurfaceVisualization`
- `examples/quantumphysics/scenes/quantum_wave_scattering.js` — discrete complex field + `SchrodingerSolver`
- `README.md` — project overview and positioning
