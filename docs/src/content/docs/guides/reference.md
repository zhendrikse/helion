---
title: "📖 Reference guide"
---

## Fields
<div class="header_line"></div>

Fields play a central role in the Helion library.


## Fields
<div class="header_line"></div>

```
Field: sample(u, ,v, target)
 │
 ├─ VectorField: sample(positionVector, target)
 │
 ├─ Surface
 │   ├─ ParametricSurface
 │   │   └─ MultivariateFunctionSurface
 │   │
 │   ├─ ComplexSurface
 │   ├─ DiscreteFieldSurface
 │   └─ ComplexSurface
 │   
 ├─ ScalarFieldOnSurface
 │   ├─ HeightScalarField
 │   ├─ MeanCurvatureField
 │   ├─ GaussianCurvatureField
 ├─ ...
 │
 └─ DiscreteScalarField
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
