# Copilot Instructions for Helion

## Project Overview

Helion is a browser-native JavaScript framework for interactive mathematics and physics simulations. It provides a high-level, domain-specific API that prioritizes expressing scientific intent directly, built around core concepts of **State**, **Transformations**, **Evolution**, and **Binding** between models and views.

## Architecture

### Core Concepts

The framework is organized around four fundamental concepts:

| Concept | Role | Example |
|---------|------|---------|
| **State** | What is the current state? | `DiscreteScalarField`, `Body`, `PointCloud` |
| **Transformations** (via `apply()`) | How is the state transformed? | `LaplaceOperator`, `Softness`, `FFT2D` |
| **Evolution** (via `evolve()`) | How does state evolve over time? | `SchrodingerSolver`, `WaveEquationSolver` |
| **Binding** (via `bind()`) | How is state visualized? | `alwaysWith(view)`, `onceWith(view)` |

### Directory Structure

```
src/
├── core/              # Framework infrastructure (Simulation, Registry, controls, UI)
├── model/             # State objects and transformations
│   ├── math/          # Mathematical models (fields, shapes, equations, numerics)
│   ├── phys/          # Physical models (forces, bodies, waves, planets)
│   └── transformations/ # Operators and interactions
└── view/              # Visualization layer
    ├── 2d/            # 2D renderers and views
    ├── 3d/            # 3D renderers (Three.js-based)
    └── colormappers.js # Color mapping utilities
```

### Key Classes and Patterns

**Model-View Separation:**
- Models inherit from `MathPhysicsModelBehavior` (all physics/math models)
- Views inherit from `Renderable3D` (3D views) or implement 2D view interfaces
- Binding is unidirectional: models notify views when state changes
- Use `model.alwaysWith(view)` for continuous synchronization, `model.onceWith(view)` for one-time binding
- In Simulation: `simulation.bind(model.alwaysWith(view))` or `simulation.bind(model.onceWith(view))`

**Operator Pattern:**
- All transformations are classes extending `Transformation`
- Operators implement `applyTo(state)` to modify state in-place
- Complex transformations can be chained: `state.apply(op1).apply(op2).apply(op3)`

**Solver Pattern:**
- Numerical solvers (e.g., `SchrodingerSolver`, `WaveEquationSolver`) implement evolution over time
- Define equations with operators and boundary conditions
- Integrate with `integrate(dt, integrator)` or `evolve()` depending on solver type

**Field Representation:**
- `DiscreteScalarField` for 2D/3D numerical grids
- `DiscreteComplexField` for quantum mechanics (complex-valued)
- `VectorField` for vector-valued data
- Access via `valueAt(x, y)` and `setValueAt(x, y, value)`

**Body/Particle Pattern:**
- `Body` represents a point mass with position, velocity, mass, charge
- `PhysicsState` holds state data (position, velocity, acceleration, mass, charge)
- Bodies can be integrated with `body.integrate(dt, integrator)`
- Create composite structures with `BodyPair` for two-body interactions
- Use `VelocityVector` and `AccelerationVector` wrappers for visualization of forces/acceleration

**Shape/Surface Pattern:**
- `Shapes` (via `ShapesFactory`) defines mathematical shapes for masking/interaction
- `ParametricSurface` and `Surface` define mathematical surfaces
- `DiscreteFieldSurface` creates surfaces from field data
- `ComplexSurface` for complex-valued function visualization

## Build and Development

### Build Commands

```bash
# Build library (ES module)
npm run build:lib

# Build examples for deployment
npm run build:examples

# Build all
npm run build
```

### Build Configuration

- **Library build** (`vite.lib.config.js`): Produces ES module at `dist/helion.es.js`
- **Examples build** (`vite.examples.config.js`): Builds each domain's examples into static sites
- External dependencies: `three` and `uplot` are peer dependencies (not bundled)
- Entry point: `src/index.js` exports all public APIs

### Deployment

Automated via GitHub Actions (`.github/workflows/astro.yml`):
1. Builds the Helion library (`npm run build:lib`)
2. Builds all examples (`npm run build:examples`)
3. Builds Astro documentation (`docs/`)
4. Deploys to GitHub Pages at `gh-pages` branch

Full deployment happens on every push to `main`. Node.js 24 is required.

### No Test Framework

This project currently has no automated tests. Quality assurance relies on:
- Live examples in `examples/` directory (primary validation mechanism)
- Manual testing via the deployed demo sites
- Browser console validation

## Code Conventions

### Class Naming
- Core classes: `ClassName` (e.g., `DiscreteScalarField`, `SchrodingerSolver`)
- Views/Renderables: Suffix with `View` or `Raster` (e.g., `ParticleCloudView`, `FieldEdgeIntensityPixelRaster`)
- Operators: Suffix with `Operator` (e.g., `LaplaceOperator`, `PerlinNoiseOperator`)
- Forces/Interactions: Prefix with domain (e.g., `CoulombForce`, `SphereSphereCollision`)

### API Design
- **Method chaining**: Most model methods return `this` to enable fluent API
- **Constructor configuration**: Use object parameter with defaults (e.g., `new FFT2D({ padding: 1 })`)
- **Private methods**: Use `#methodName` syntax for true private methods
- **Getter/Setter**: Use `get` and `set` keywords; avoid redundant `get`/`set` prefixes in method names

### Module Structure
- Each significant class should be in its own file or logically grouped with related classes
- Use ES6 named exports; re-export grouped concepts from barrel files
- Mathematical utilities in `math.js`: `Vec3`, `Vec2`, `linspace`, `meshgrid`, etc.
- Physics constants: `G` (gravitational), `EC` (electric Coulomb)

### Comments
- Explain non-obvious algorithms (e.g., Box-Muller transform for normal distribution)
- Document constructor parameters with JSDoc for public APIs
- Use JSDoc for complex mathematical operations

## Dependencies

### Production
- **three** (^0.184.0): 3D rendering engine (peer dependency)
- **uplot** (^1.6.32): 2D charting library (peer dependency)
- **katex**, **remark-math**, **rehype-katex**: Math rendering for documentation

### Development
- **vite** (^8.2.0): Build tool and development server

Note: `three` and `uplot` are peer dependencies; consuming projects must install them.

## Common Development Tasks

### Simulation API

The `Simulation` class is the main entry point for creating interactive scenes. Key methods:

```javascript
// Create a simulation with a 3D viewport
const simulation = new Simulation({
    viewportDivId: "containerId",
    cameraPosition: new Vec3(0, 10, 15)
});

// Bind model-view pairs
simulation.bind(model.alwaysWith(view));
simulation.bind(model.onceWith(view));

// Layout and camera
simulation.provideAxesAround(view);        // Add coordinate axes
simulation.frameSceneOn(view, {            // Auto-frame camera
    padding: 0.9, 
    translationY: 0
});

// Plotting (for 2D data)
simulation.plot(xArray, yArray, { title: "My Plot" });

// Control
simulation.start();                         // Start simulation
simulation.stop();                          // Pause simulation
simulation.toggleRunStatus();               // Toggle play/pause

// Time control
simulation.simulationClock.fixedDt = 0.01;  // Physics timestep
```

### Building Interactive Controls

Use `Registry` to manage selectable options and `Control` classes for UI:

```javascript
// Create a registry of named items
const surfacesRegistry = new Registry({
    id: "surfaceSelect",
    label: "Surface: ",
    entries: {
        "sphere": sphereSurface,
        "torus": torusSurface
    }
});

// Create a dropdown menu (automatically bound to Registry)
const menu = new DropdownMenu(surfacesRegistry);
simulation.append(menu);

// React to selections
const selectedSurface = surfacesRegistry.get("sphere");

// Other controls
const slider = new Slider({ min: 0, max: 1, value: 0.5 });
const checkbox = new Checkbox({ checked: false });
const button = new Button({ label: "Reset" });

simulation.append(slider);
simulation.append(checkbox);
simulation.append(button);
```

The `Registry` pattern is key: UI controls automatically sync with registered values, enabling reactive simulations.

### Integration Patterns

Physics bodies use numerical integration to evolve position and velocity over time. Multiple integrator algorithms are available with different accuracy/stability tradeoffs:

```javascript
import { Integrators } from "./src/index.js";

// Available integrators (ordered by accuracy):
// - eulerStep: Simple Euler (first order, less stable)
// - symplecticEulerStep: Symplectic Euler (better energy conservation, default)
// - rk2Step: 2nd-order Runge-Kutta (mid-point method)
// - rk4Step: 4th-order Runge-Kutta (highest accuracy but slower)

// Integrate a body with explicit integrator
body.integrate(dt, Integrators.symplecticEulerStep);

// Or integrate with default (symplectic Euler)
body.integrate(dt);

// For composite structures
bodyPair.integrate(dt, Integrators.rk4Step);

// In simulation loop (called automatically during simulation.start())
const dt = simulation.simulationClock.fixedDt;
body.apply(gravity);  // Apply forces
body.integrate(dt);   // Step forward
```

**Choosing an Integrator:**
- **Symplectic Euler** (default): Best for energy-conserving systems (orbital mechanics, springs)
- **RK4**: Best for general accuracy; slower, use when high precision matters
- **RK2**: Middle ground between speed and accuracy
- **Euler**: Rarely used; fast but unstable

For N-body problems and long simulations, symplectic integrators (Euler or RK2) preserve energy better and are more stable.

### Adding a New Operator
1. Create class extending `Transformation` in `src/model/transformations/operators.js`
2. Implement `applyTo(field)` method
3. Use object parameter with default configuration
4. Export from `src/index.js`
5. Consider adding 2D/3D view in `src/view/` to visualize results

### Adding a Physical Model
1. Create class extending `MathPhysicsModelBehavior` in `src/model/phys/`
2. Implement `apply(transformation)` to allow transformations
3. Implement `bind()` pattern for view synchronization
4. Export from `src/index.js`

### Adding a Visualization
1. For 3D: Create class extending `Renderable3D` in `src/view/3d/`
2. For 2D: Create class with `canBindTo()`, `synchronizeWith()`, `initialize()` methods
3. Implement model-view binding; synchronize on state changes
4. Export from `src/index.js`

### Testing Changes
1. Create or modify an example in `examples/` directory
2. Build examples: `npm run build:examples`
3. Test in browser to verify visual output and interactions
4. Examples are the primary validation mechanism

## Documentation

### README Structure
- High-level positioning and use cases
- Core concepts table
- Links to live demos organized by domain
- Comparison with similar tools

### Examples Organization

Examples are organized by scientific domain in `examples/`:
- **astrophysics** – Orbital mechanics, celestial body simulations
- **electromagnetism** – Electric fields, magnetic phenomena
- **kinematics** – Motion, N-body problems, collisions
- **mathematics** – Surfaces, fractals, transformations, Fourier analysis
- **molecularphysics** – Molecular structures and interactions
- **nature** – Natural phenomena simulations
- **quantumphysics** – Wave functions, quantum mechanics
- **relativity** – Relativistic effects
- **thermodynamics** – Heat, energy, statistical physics
- **waves** – Wave equations, diffraction, vibrations

Each domain directory contains:
```
domain/
├── index.html          # Single-page app with multiple scenes (commented in/out)
├── package.json        # Local npm config (each example can have dependencies)
├── scenes/
│   ├── scene_one.js    # Individual scene implementation
│   └── scene_two.js    # Uses Simulation, views, and models from src/
└── node_modules/       # Built dependencies (generated by build)
```

**Scene Structure:**
- Import `Simulation`, model classes, and view classes from `src/index.js`
- Create a `Registry` to manage selectable components (surfaces, forces, etc.)
- Use `DropdownMenu`, `Slider`, `Checkbox` controls for interactivity
- Call `simulation.bind()` to bind models to views
- Call `simulation.provideAxesAround(view)` and `simulation.frameSceneOn(view)` for visualization setup

**Testing & Development:**
- Examples are the primary quality validation mechanism (no automated test suite)
- Build examples with `npm run build:examples`
- Each example serves as both a test case and a live demo
- Built examples are deployed at https://www.hendrikse.name/helion/
