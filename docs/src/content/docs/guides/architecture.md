---
title: "🏛️ Architecture"
---

## Central concepts
<div class="header_line"></div>

In physics and mathematics, we are always searching for the most fundamental abstractions:

$$
\text{state} \xrightarrow{\text{operator}} \text{state}
$$

A state can may change in time. This change in time can be thought of 
as applying an operator to that state:

$$
\frac{d}{dt}\text{state} = \mathcal{L}(\text{state})
$$

Eventually, everything may thus be conceptualized as states and operators.

However, software adds additional dimensions that are unknown to math and physics:

* **code should express intent** (Kent Beck's rules of simple design)
* **performance** (fields are refreshed dozens of times per second)
* **memory management** (fields with thousands pixels/vertices) 
* **maintenance**

As a consequence, the mathematical most elegant abstraction 
is not always tantamount to the best programming abstraction. So 
Helion is built with the following doctrine in mind:

> Unify concepts, but not necessarily the syntax

## Realisation in Helion

```js
field.apply(operator);
field.evolve(solver, dt);
field.synchronize(view);
```

```text
apply      → transformatie
evolve     → dynamica
synchronize → visualisatie
```


Ja, dat vind ik eigenlijk een veel sterkere unificatie dan `field.apply(solver)`.

Als ik naar de voorbeelden kijk die je hebt laten zien, dan zie ik twee fundamenteel verschillende soorten transformaties:

### Instantane operatoren

```js
field.apply(new GaussianImpulse(...));
field.apply(new FFT2D());
field.apply(new Blur(...));
```

Dit zijn directe transformaties:

$$
x \mapsto O(x)
$$

Geen tijd, geen geschiedenis.

---

### Evolutie-operatoren

```js
field.evolve(solver, dt);
body.evolve(integrator, dt);
```

Dit zijn tijdstappen:

$$
x(t) \mapsto x(t+\Delta t)
$$

Daar zit expliciet tijd in.

---

Vanuit de theoretische natuurkunde is dat onderscheid ook heel natuurlijk.

Een FFT is geen tijdsevolutie.

Een impuls is geen tijdsevolutie.

Een symplectische Euler-stap is wél een tijdsevolutie.

Een Schrödinger-solver is wél een tijdsevolutie.

---

Daardoor krijg je een mooie grammatica:

```js
state.apply(operator);
state.evolve(solver, dt);
```

waarbij:

| Concept    | Betekenis                                 |
| ---------- |-------------------------------------------|
| `apply()`  | algebraïsche / geometrische transformatie |
| `evolve()` | System dynamics                           |

---

Voor een veld:

```js
psi
    .apply(new GaussianImpulse(...))
    .evolve(new SchrodingerSolver(eq), dt);
```

---

Voor een lichaam:

```js
body
    .apply(force)
    .evolve(new SymplecticEulerIntegrator(), dt);
```

of misschien:

```js
body.evolve(
    new SymplecticEulerIntegrator(forceField),
    dt
);
```

afhankelijk van hoe je krachten modelleert.

---

Het mooie is dat de semantiek dan overeind blijft.

Ik zou persoonlijk wat huiverig zijn voor:

```js
body.apply(new SymplecticEulerIntegrator(), dt);
```

want een integrator is geen operator op een toestand.

Een integrator is een procedure die een toestand door de tijd verplaatst.

`evolve()` drukt dat veel beter uit.

---

Nog iets interessants: hiermee krijg je bijna letterlijk de structuur uit de dynamische systeemtheorie.

Je hebt een toestand (x).

Je hebt operatoren (O):

$$
x \leftarrow O(x)
$$

en je hebt een evolutie-operator (E_{\Delta t}):

$$
x(t+\Delta t) = E_{\Delta t}(x(t))
$$

Dat vertaalt zich direct naar:

```js
state.apply(operator);
state.evolve(solver, dt);
```

Dat is een heel compacte en mathematisch herkenbare API.

---

Sterker nog, als je later meerdere soorten toestand krijgt:

```js
DiscreteScalarField
DiscreteComplexField
RadialSymmetricBody
ParticleSystem
Mesh
```

dan kun je ze allemaal dezelfde "taal" laten spreken:

```js
state.apply(operator);
state.evolve(solver, dt);
state.alwaysWith(view);
```

Dat vind ik eerlijk gezegd een van de elegantste richtingen voor Helion die ik tot nu toe in je voorbeelden heb gezien. Het behoudt de semantische verschillen tussen operatoren en tijdintegratie, maar geeft ze wel een uniforme vorm. Dat is meestal een beter resultaat dan proberen alles onder één enkele methode (`apply`) te forceren.


### State

```js
DiscreteScalarField
DiscreteComplexField
RadialSymmetricBody
```

Dit zijn toestanden.

---

### Operator

```js
FFT2D
FFTShift2D
GaussianImpulse
DoubleSlit
Blur
```

Dit zijn transformaties.

---

### Equation

```js
WaveEquation
SchrodingerEquation
HeatEquation
```

Dit zijn wetten.

---

### Solver

```js
WaveEquationSolver
SchrodingerSolver
```

Dit zijn numerieke procedures.

---

Vanuit theoretische natuurkunde zou je kunnen zeggen:

> een solver is ook een operator

en dat is eigenlijk waar.

Een solver realiseert immers een discrete tijdsevolutie-operator:

$$
\psi(t+\Delta t) = U(\Delta t)\psi(t)
$$

or

$$
\phi_{n+1} = S_{\Delta t}(\phi_n)
$$

Dus conceptueel is een solver inderdaad een operator.

---

Waar ik denk dat jouw huidige ontwerp wringt is niet dat de solver geen operator is.

Het wringt omdat de solver momenteel eigenaar is van de toestand:

```js
const solver =
    new WaveEquationSolver(field, equation);
```

Terwijl overal elders in Helion de toestand eigenaar blijft van zichzelf:

```js
field.apply(operator);
```

of

```js
body.apply(force);
```

---

Ik denk daarom dat deze richting heel natuurlijk zou zijn:

```js
const solver =
    new WaveEquationSolver(equation);

solver.step(field, dt);
```

of zelfs:

```js
field.evolve(solver, dt);
```

waarbij de solver geen veld bewaart.

---

Het mooie daarvan is dat je dan ook meerdere velden met dezelfde solver kunt evolueren:

```js
const solver =
    new SchrodingerSolver(equation);

solver.step(psi1, dt);
solver.step(psi2, dt);
solver.step(psi3, dt);
```

Dat is conceptueel vaak zuiverder.

---

Wat ik níet zou doen is teruggaan naar je oorspronkelijke idee:

> alles is een Field

Dat zie ik veel mensen proberen.

Bijvoorbeeld:

```js
Body extends Field
Particle extends Field
Surface extends Field
Mesh extends Field
```

Dat levert meestal een prachtige theorie op en een onhandige codebase.

Je verliest dan precies wat jij noemt: semantiek.

Een `RadialSymmetricBody` is geen veld. Een lichaam heeft massa, impuls, traagheid, botsingen, enzovoort.

Een `DiscreteComplexField` is geen lichaam.

Dat ze beide toestanden zijn betekent niet dat ze hetzelfde type moeten zijn.

---

Wat ik uit jouw huidige ontwerp haal is eigenlijk iets subtielers:

Niet:

```text
Everything is a Field
```

maar:

```text
Everything is State
```

en

```text
State is transformed by Operators
```

Dat is een veel krachtigere unificatie.

Dan mogen er best meerdere soorten toestand bestaan:

* velden
* lichamen
* geometrieën
* grafen
* meshes

zolang ze allemaal dezelfde operationele grammatica delen:

```js
state.apply(operator);
```

en

```js
state.alwaysWith(view);
```

Dat lijkt mij een betere balans tussen de elegantie van de theoretische natuurkunde en de praktische eisen van softwareontwerp. Dat is ook precies de richting waarin je Fourier-refactor je nu lijkt te duwen.


### Declarative coding


```js
field                             // E.g. a discrete scalar field
    .reset()                      // Start with a blank slate
    .apply(new GaussianImpluse()) // Apply a Gaussian impulse
    .apply(new FFT2D())           // Apply a Fourier transform
    .apply(new FFTShift2D());     // Shift the result
```


### Fields and operators

```js
DiscreteScalarField
DiscreteComplexField
```

```js
CirclePotential
SquarePotential
LinePotential
StepPotential
SingleSlit
DoubleSlit
Grating
Blur
FFT2D
FFTShift2D
GaussianImpulseComplex2D
```

This takes care of a declarative simulation

```js
potential
    .reset()
    .apply(new DoubleSlit({
        size: 40,
        energy: 0.1
    }))
    .apply(new Blur(4));
```



## Design

Wat je nu hebt lijkt sterk op een kleine ECS/MVC-hybride, en dat schaalt veel beter dan losse imperative canvas-code.

```
                ┌──────────────────────────────┐
                │     Mathematical Layer       │
                │                              │
                │  ScalarField                │
                │  VectorField               │
                │  ParametricSurface         │
                │  DifferentialGeometry     │
                └────────────┬──────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │     Discretization Layer     │
                │                              │
                │  Range                      │
                │  SurfaceResolution          │
                │  Sampling (u,v grids)       │
                └────────────┬────────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │       View Layer             │
                │                              │
                │  PlaneSurfaceView           │
                │  IsoparametricContoursView  │
                │  ArrowField                │
                │  PointCloudView            │
                │  ScalarFieldSurface        │
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
                └────────────────────────────┘
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
