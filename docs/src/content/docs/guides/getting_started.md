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