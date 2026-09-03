---
title: "📖 Reference"
description: "API reference for the Helion library — what exists, what options each class takes, and how to wire it together."
---

This is the API surface of Helion as exported from `src/index.js`. Import via ES modules — no build step required:

```js
import {
  Simulation, Vec3, DiscreteScalarField, SurfaceVisualization,
  GaussianImpulse, SchrodingerSolver
} from "helion";
// or via importmap in the browser
import { Simulation } from "../../../src/index.js";
```

See also: [Architecture](/helion/guides/architecture/) for concepts (`State` / `apply` / `evolve` / `bind`) and [Getting Started](/helion/guides/getting_started/) for a first simulation.

---

## 1. Core — Simulation, Binding, Registry
<div class="header_line"></div>

### `Simulation`

Factory: `Simulation.with(options)` → `Simulation` instance. All methods are chainable.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `htmlDivId` | `string` | auto-created | Container div id |
| `background` | `Simulation.Background` | `TRANSPARENT` | `PLAIN`, `FOG`, `TRANSPARENT`, `STARS` |
| `backgroundColor` | hex | `0x0088ff` | Used with `PLAIN` |
| `scale` | `number` | `1` | Physics → world mapping |
| `cameraPosition` | `Vec3` | `(3,3,3)` | Initial camera |
| `controlsTarget` | `Vec3` | `(0,0,0)` | OrbitControls target |
| `fieldOfView` | `number` | `50` | Perspective FOV |
| `orthographic` | `boolean` | `false` | `camera:{orthographic:true}` or `simulation.setOrthographic(bool)` — orthographic disables rotate/pan, only zoom |
| `shadowsEnabled` | `boolean` | `false` | Three.js shadows |
| `headUpDisplay` | `boolean` | `false` | HUD overlay |
| `parameterMenuCollapsed` | `boolean` | `true` | Controls collapsed |

Chaining API:

```js
Simulation.with({ htmlDivId: "container", scale: 1e-9, headUpDisplay: true })
  .runsEvery(0.016)                         // wall-clock step
  .advancesBy(0.01)                         // simulated time per step
  .atSpeed(1)                               // timeScale multiplier
  .substeps(1)                              // steps per clock tick
  .onStep((clock, dt) => {                  // fixed-step mode
    field.evolve(solver, dt);
  })
  // or: .maxOutCpu((clock) => field.evolve(solver, dt), 30, 10)
  .onFrame((t) => {})
  .bind(model.alwaysWith(view))             // continuous sync
  .bind(model.onceWith(view))               // one-shot sync
  .append(new Slider("k").withRange(...))   // controls
   .provideAxesAround(view)                  // axes + AxesUI
   .frameSceneOn(view, { padding: 1.2 })
   .setOrthographic(true)                      // switch to orthographic top-down for 2D
   .removeAxes() / setAxesVisible(false)       // hide axes for 2D
  .setupGraphWith({ dataDefinition, title })
  .plot([t, value])
  .withMouseClickEventListener()             // click → start/pause/reset
  .appendStartStopResetUI()
  .onReset(() => field.reset())
  .start()                                  // .stop(), .reset(), .isRunning
```

`runsEvery` vs `advancesBy`: scheduling interval vs simulated time. `maxOutCpu(fn, minFrameRate=30, iterationsPerFrame=10)` is the adaptive alternative to `onStep`.

### `MathPhysicsModelBehavior` / `Binding` / `Transformation`

```js
class Transformation { applyTo(model) {} }

model.apply(transformation)          // → transformation.applyTo(model)
model.and(other)                     // → BodyPair
model.alwaysWith(view)               // → Binding(ALWAYS)
model.onceWith(view)                 // → Binding(ONCE)
simulation.bind(binding)             // checks view.canBindTo(model)
```

### `Registry`

```js
new Registry({ id, label, entries: { Key: () => value } })
registry.get(name); registry.names; registry.label; registry.id
```

Used for `ColorMappers`, `ColorLayers`, `ShapesFactory`.

---

## 2. Math primitives
<div class="header_line"></div>

### `Vec3(x=0, y=0, z=0)` / `Vec2(x=0, y=0)`

Mutable vectors: `clone()`, `set`, `copy`, `add`, `sub`, `addScaledVector`, `cross`, `dot`, `length`, `normalize`, `multiplyScalar`, `distanceTo`, `projectOnVector`, `random()`.

### `Complex(re, im)`

`clone()`, `phase`, `abs`/`magnitude`/`absSquared`, `multiply(c)`.

### `Interval(from=-Infinity, to=Infinity)`

`range`, `normalize(value)`, `scaleUnitParameter(u)` — maps `[0,1]` → interval, `shrinkTo(value)`.

### `Range(from, to, stepSize=0.1)`

Iterable: `for (const x of new Range(0,10,0.5))`. `count`.

### `Domain(xRange=[-0.5,0.5], yRange=[-0.5,0.5])`

Holds `xRange: Interval`, `yRange: Interval`.

### Helpers

`linspace(start, stop, num)`, `meshgrid(x, y)`, `factorial(n)`, `degToRad`, `toCartesian(r,theta,phi)`, `generateUUID()`, `normalDistribution(mu,sigma)`, `uniform(min,max)`, `randomInt(min,max)`.

---

## 3. Fields and Surfaces
<div class="header_line"></div>

### `Field` — abstract

`sample(u, v, target)` — duck-typed target (`number`, `Complex`, `Vec3`).

### `DiscreteScalarField({ nx=100, ny=100 })`

```js
field.nx; field.ny; field.data; // Float32Array
field.index(x,y); field.valueAt(x,y); field.setValueAt(x,y,v);
field.reset();                    // fill 0
field.evolve(solver, dt);         // → solver.step(this, dt)
field.sample(u,v,target);         // bilinear (stub, uses index())
```

### `DiscreteComplexField({ nx=128, ny=128, real, imag })`

```js
field.nx; field.ny; field.size; field.real; field.imag; // Float32Array
field.index(x,y); field.valueAt(i,j,target); // writes Complex
field.reset(); field.evolve(solver, dt);
```

### `RealFunction({ domain=new Interval(-1,1), func=x=>0 })`

```js
const f = new RealFunction({ domain:new Interval(-3,3), func:x=>Math.sin(x)/x });
f.domain; // Interval
f.evaluate(x); // number
f.sample(u, target=new Vec2()); // u∈[0,1] → Vec2(x,y)
f.setFunction(newFunc); // for Taylor/Fourier demos
```

### `VectorField` / `NormalizedScalarField`

`VectorField.sample(positionVector, target)`. `NormalizedScalarField(scalarField, normalizer)` maps height via normalizer.

### `Surface` — abstract

`frameAt(u, v, target: DifferentialFrame)` via `DifferentialGeometry`. `sampleSpacing(resolution)`.

### `ParametricSurface({ domain, x=(u,v)=>u, y=(u,v)=>v, z=(u,v)=>0 })`

`sample` maps `[0,1]²` → `Domain` → `Vec3(x, z, y)` (Y-up).

### `MultivariateFunctionSurface({ domain, z=(x,y,t)=>0 })`

Adds `time` setter for animation.

### `ComplexSurface({ domain, z=(c)=>c })`

`sample` writes `Complex` (`re`/`im` from domain, then `z(c)`).

### `DiscreteFieldSurface(field)`

Adapter: `field: DiscreteScalarField`. Overrides `frameAt` with `valueAt` + central-difference `_normalAt`. Enables `SurfaceVisualization` for raster fields.

---

## 4. Bodies and Lattices
<div class="header_line"></div>

### `Body({ position, velocity, mass=1, charge=0, fixed=false, orientation })`

`position/velocity/acceleration/mass/charge/force/state`, `reset()`, `integrate(dt, integrator)`, `fieldAt(point)`, `positionVectorTo(other)`, `kineticEnergy`, `momentum`.

### `RadialSymmetricBody({ position, velocity, mass, radius=1, charge, fixed })`

Adds `radius`.

### `AxialSymmetricBody({ position, velocity, axis, radius, mass, charge, fixed })`

Adds `axis: Vec3`.

### `Block({ position, velocity, size=Vec3(1,1,1), mass, charge, fixed })`

Adds `size: Vec3`.

### `Lattice({ k=100, damping=0, bodySize=0.075, bondRadius })`

Spring network: `addBody(body)`, `connect(body1, body2, {k, restLength, damping})`, `bodyAt(i)/bondAt(i)`, `bodyCount/bondCount`, `integrate(dt)`, `fixateBodyAt(i)`, `applyToBodies(transformation)`.

### `ChainTopology({ count=100, length=20, bondRestLength, totalMass=0.025 })`

`applyTo(lattice)` — builds a 1D chain.

### `CubicLatticeTopology({ nx=4, ny=4, nz=4, spacing=0.3, totalMass=1 })`

`applyTo(lattice)`, `index(i,j,k)`.

### `PointCloud` / `BlockSegments` / `LineSegments`

`PointCloud` — `particleStateAt(i, target)` etc. for `PointCloudView`. `LineSegments.add(from, to, color)`, `BlockSegments.push(block)`.

---

## 5. Forces and Interactions
<div class="header_line"></div>

All forces extend `Transformation` and accumulate into `body.force` until `body.integrate()` consumes it.

| Class | Constructor | Description |
|-------|-------------|-------------|
| `Force` | — | Base; `_calculateForceOn(body)` |
| `FieldForce` | `(field)` | Samples field at `body.position` |
| `CoulombForce.in(field)` | `(electricField)` | `F = q·E` |
| `LorentzForce.in(field)` | `(magneticField)` | `F = q v×B` |
| `DragForce` | `(dragCoefficient=-5)` | `F = c·v_y` |
| `UniformGravitationalForce` | `()` | `F = m·g` downward |
| `GravitationalForce` | `()` | Pair: `G·m1·m2/r²` via `BodyPair` |
| `SpringForce` | `({k=200, restLength, damping=0})` | Pair: Hooke + damping |
| `CoulombPairForce` | `()` | Pair: `k·q1·q2/r³·r` |
| `SphereSphereCollision` | `()` | Pair: elastic collision + penetration resolve |

Usage:

```js
body.apply(new DragForce(-2));
bodyA.and(bodyB).apply(new GravitationalForce());
lattice.connect(a, b, { k: 200, restLength: 1, damping: 0.1 });
```

Constants: `G = 6.67e-11`, `K = 9e9`, `EC = 1.602e-19`, `g = 9.81`.

---

## 6. Operators
<div class="header_line"></div>

All extend `Transformation` (`applyTo(field)`). Use declaratively: `field.reset().apply(op1).apply(op2)`.

| Operator | Options | Notes |
|----------|---------|-------|
| `GaussianImpulse` | `{centerX=100, centerY=100, amplitude=1, sigma=3}` | Adds Gaussian in ±5px window |
| `GaussianImpulseComplex2D` | `{wavePacketEnergy=0.05, packetWidth=48}` | Plane wave `exp(i k·r)·exp(-r²/w²)` |
| `DiamondSquareOperator` | `{roughness=1, amplitude=100}` | Fractal terrain; `nx-1` must be power of 2 |
| `PerlinNoiseOperator` | `{scale=50, frequency=0.02, octaves=6, persistence=0.5, z=0}` | Fractal Perlin via `three/ImprovedNoise` |
| `DoubleSlitOperator` | `{wavelength=525, positionSlit1, positionSlit2}` | Interference factor `cos²` |
| `SineImpulseOperator` | `{wavelengthInPixels=10, amplitude=1, periods=1}` | Also has `.ui()` |
| `FFT2D` | `()` | Forward 2D FFT (rows → cols) |
| `FFTShift2D` | `()` | Shift zero-frequency to center |
| `Potential` | `(shapeConfiguration, reflectionStrength=0.1)` | Sets potential where shape samples true |
| `ShapeMask` | `(shapeConfiguration)` | Sets `1` where shape samples true |
| `ComplexShapeMask` | `(shapeConfiguration)` | Sets `real` to `1` |
| `Softness` | `{softness=0}` | Blur by averaging 4-neighbors |
| `ComplexSoftness` | `{softness=0}` | Same on `real` channel |
| `LaplaceOperator` | static only | `LaplaceOperator.at(field,i,j)` |

### Shapes

```js
Shapes // { SingleSlit, DoubleSlit, Grating, Circle, Square, Line, Step }
new ShapeConfiguration({ defaultSize=40, defaultShape=Shapes.DoubleSlit })
shapeConfig.size; shapeConfig.shape; shapeConfig.ui() // Dropdown + Slider
ShapesFactory.create(shapeConfig).sample(x, y, field) // → boolean
```

---

## 7. Equations, Solvers, Integrators
<div class="header_line"></div>

### `BarrierWaveEquation({ obstacleField, velocity=1, damping=0.1 })`

`damping`, `acceleration(field,i,j)` — `(1-obstacle)·v²·Laplacian`, `.ui()` → damping slider.

### `WaveEquationSolver(equation)`

```js
new WaveEquationSolver(equation)
solver.step(field, dt)  // field: DiscreteScalarField
solver.reset()
field.evolve(solver, dt)
```

### `SchrodingerSolver(potential)`

```js
new SchrodingerSolver(potentialField) // potential.data
solver.initialize(psi, dt) // stagger imag by 0.5 dt
solver.step(psi, dt)       // psi: DiscreteComplexField
solver.reset()
psi.evolve(solver, dt)
```

### `Integrators` (static)

```js
Body.integrate(dt, Integrators.symplecticEulerStep)
Integrators.eulerStep(state, dt)
Integrators.symplecticEulerStep(state, dt)
Integrators.rk2Step(state, dt, derivativeFn)
Integrators.rk4Step(state, dt)
```

`state: { position, velocity, acceleration, clone() }`.

---

## 8. Views — 3D primitives
<div class="header_line"></div>

All extend `Renderable3D` (`Object3D`). Contract: `canBindTo(model)`, `initialize(model)`, `synchronizeWith(model)`, `reset()`, `dispose()`, `boundingBox`.

| View | Options | Binds to |
|------|---------|----------|
| `Sphere` | `{color=0xffff00, opacity=1, wireframe, segments=24, castShadow}` | `body.position && body.radius` |
| `Box` | `{color=0xff0000, opacity, castShadow}` | `body.position && body.size && body.orientation` |
| `Cylinder` | `{color, opacity, segments=24, radiusFunction=body=>body.radius}` | `body.position && body.axis` |
| `Arrow` | `{color, size=1, opacity, round, magnitudeMap, colorMap}` | `body.position && body.axis` |
| `VectorView` | `{vectorProperty=body=>body.velocity, color, size, round}` | `body.position && vectorProperty` |
| `Ring` | `{color, thickness=0.1}` | `body.position && body.axis && body.radius` |
| `Helix` | `{color, coils=20, thickness=0.05, radiusFunction}` | `BodyPair` |
| `Trail` | `{maxPoints=200, trailStep=1, color}` | `body.position` |
| `VisibleWhen` | `(view, predicate)` | delegates to `view.canBindTo` |
| `Floor/Aquarium/Ceiling` | — | decorations |

### Composite

| View | Options | Notes |
|------|---------|-------|
| `PointCloudView` | `{material}` | `pointCloud.positionAt` etc. |
| `LatticeView.from({bodyView, bondView, bodyArgs, bondArgs})` | `Lattice` | `bondType`, `nodesVisible`, `.ui()` |
| `DiatomicMolecule` | `{bondType, bondColor, atom1Color, atom2Color}` | `BodyPair` |
| `SwitchableBondView` | `{bondType="Spring"/"Cylinder", color, coils}` | delegates to Helix/Cylinder |
| `ArrowField` | `{xRange, yRange, zRange, scaleFactor, magnitudeMap, colorMap}` | `VectorField` |
| `ElectromagneticWave` | `{electricFieldColor, magneticFieldColor, numArrows=100}` | `Wave.valueAt` |
| `OneDimensionalComplexPlaneWave3D` | `{size, numArrows=70}` | `ComplexWave.valueAt` |

### Surface visualization

```js
new SurfaceVisualization({
  resolution: new SurfaceResolution(100,100),
  colorLayer: new HeightLayer(),        // or GaussianCurvatureLayer etc.
  colorMapper: colorLayer.preferredColorMapper(),
  normalizer: new AdaptiveSymmetricNormalizer(0.05), // or FixedIntervalNormalizer(range)
  opacity: 1,
  display: SurfaceVisualization.Display.Surface, // "surface"|"glyphs"|"none"
  glyphType: GlyphLayer.GlyphTypes.BOXES,
  glyphScale: 0.8
})
vis.canBindTo(model) // → model.frameAt
vis.addOverlayLayer(new ContoursLayer({}))
vis.display(SurfaceVisualization.Display.Glyphs)
vis.ui()          // Color map + opacity
vis.colorLayerUI() // Color layer dropdown
```

- `SurfaceResolution(u=50, v=50)`
- `FixedIntervalNormalizer(interval: Interval)` — `normalize(v)` via `interval.normalize`
- `AdaptiveSymmetricNormalizer(smoothing=0.05)` — EMA of `maxAbs`
- `ColorLayers` registry: `Height`, `PrincipalCurvature1/2`, `GaussianCurvature`, `MeanCurvature`, `ShapeIndex`, `Curvedness`
- Layers: `SurfaceLayer`, `GlyphLayer` (`BOXES|CAPSULES|CYLINDERS|CONES|ICOSAHEDRONS|TILES|SPHERES`), `ContoursLayer`, `PrincipalDirectionsLayer`, `NormalsLayer`

### 3D rasters (discrete fields)

```js
new ComplexScalarFieldSurfaceRaster({ width=200, height=200, zScale=20, showPhaseColor, brightness })
new PotentialField3DRaster({ width=200, height=200, heightScale=100, color, opacity })
 // canBindTo: field.valueAt && field.nx && field.ny
```

### Complex field views (2D/3D)

```js
import { ComplexFunction, ComplexSurfaceView2D, ComplexSurfaceView3D, WaveFunctionSurface3D } from "helion";
// 3D: ComplexFieldViewable base → ComplexSurfaceView3D (tanh height) / WaveFunctionSurface3D (log height, shader + alpha)
// 2D: ComplexFieldViewable2D base → ComplexSurfaceView2D (DataTexture, world 4x4 or nx*ny)
const view3D = new ComplexSurfaceView3D({ defaultResolution:new SurfaceResolution(400,400), maxHeight:4 });
const view2D = new ComplexSurfaceView2D({ defaultResolution:new SurfaceResolution(400,400), brightnessFunction:m=>Math.exp(-0.5*m) });
view3D.colorMapper = view2D.colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsl); // shared control
```

- Both share `sample(u,v, ComplexFunctionSample{input,output})` / `valueAt` contract and `resolution()` logic; `valueAt` is used for discrete grids (performance) without interpolation.
- 2D uses `brightnessFunction` to modulate RGB (kept opaque) to avoid old-frame shine-through.

### 2D rasters

```js
new ScalarFieldIntensityPixelRaster({ width=512, height=512, colorMapper })
new ComplexScalarFieldRaster({ width=512, height=512, showPhaseColour, brightness })
new FieldEdgeIntensityPixelRaster({ nx=100, ny=100, edgeHeight=100 })
new ParticleCloudView({ particleCount=5000, type="Sphere" })
```

### 1D — CurveView (LineSegmentsView subclass)

```js
import { RealFunction, Interval, CurveView } from "helion";
const f = new RealFunction({ domain:new Interval(-3,3), func:x=>Math.sin(x) });
const curve = new CurveView({ resolution:200, lineWidth:3, colorMapper:ColorMappers.get(ColorMappers.Uniform) });
simulation.bind(f.alwaysWith(curve)).frameSceneOn(curve);
// update function later: f.setFunction(x=>Math.cos(x));
```

- `RealFunction` is sampled via `sample(u, Vec2)`; `CurveView` handles `valueAt` fast-path vs `sample` like the 2D/3D complex views.
- Used in `examples/mathematics/scenes/taylor_expansion.js` and `fourier_transform.js` (migrated from `FunctionGraph`).

### Color mappers

`ColorMappers` registry: `Gradient, Inferno, RdYlBu, Seismic, Scientific, Terrain, Uniform, Viridis, Water, WaterAlternative`. `WavelengthColorMapper(lambda=590)`.

---

## 9. Controls
<div class="header_line"></div>

```js
new Slider("Label").withRange(new Range(0,1,0.01)).withValue(0.5).withUnits("m")
new Checkbox("Label").checked(true)
new DropdownMenu().for(registry)              // registry: Registry
new RadioGroup().add("Label", cb).checked(0)
new Button().withText("Run").addEventListener("click", cb)
new CompoundControl().add(controlA).add(controlB)
control.togetherWith(other)                  // same row
control.addEventListener("input", cb)       // also calls simulation.onUserInteraction
control.append(div).to(simulation)
simulation.append(control)                  // → details panel
```

`Range(from,to,stepSize)` used for `Slider.withRange`. `AxesUI(axes).ui()` → Frame/Annotations/XY/XZ/YZ checkboxes.

---

## 10. Import and build

```js
// Browser (examples use Vite + importmap)
import { Simulation, Vec3 } from "../../../src/index.js";

// NPM
import { Simulation } from "helion";
```

Build:

```sh
npm run build:examples  # Vite builds examples/*
npm --prefix docs run build  # Astro Starlight → dist/
```

Public texture assets: `src/textures/`; shaders in `src/textures/shaders/*.glsl`.

---

*This reference mirrors `src/index.js` exports. For implementation details see source files under `src/core`, `src/model`, `src/view` and the example scenes in `examples/`.*
