import test from 'node:test';
import assert from 'node:assert/strict';

import { DifferentialGeometry, DifferentialFrame } from '../src/model/math/numerics/diffgeometry.js';
import { ParametricSurface } from '../src/model/math/surfaces.js';
import { Domain } from '../src/model/math/fields.js';

test('DifferentialGeometry on plane has zero curvature', () => {
    const plane = new ParametricSurface({
        domain: new Domain([0, 1], [0, 1]),
        x: (u, _v) => u,
        y: (_u, v) => v,
        z: (_u, _v) => 0
    });
    const geo = new DifferentialGeometry(plane);
    const frame = new DifferentialFrame();

    geo.differentialFrame(0.5, 0.5, frame);

    assert.ok(Math.abs(frame.k1) < 1e-6, `k1 should be ~0 for plane, got ${frame.k1}`);
    assert.ok(Math.abs(frame.k2) < 1e-6, `k2 should be ~0 for plane, got ${frame.k2}`);
    // Normal should be (0,1,0) or (0,-1,0) depending on orientation, but unit length
    assert.ok(Math.abs(frame.normal.length() - 1) < 1e-6, 'Normal should be unit');
    // For plane z=0, Xu=(1,0,0), Xv=(0,0,1), N = Xv x Xu = (0,-1,0) or (0,1,0) -> check is vertical
    assert.ok(Math.abs(Math.abs(frame.normal.y) - 1) < 1e-6, `Normal should be vertical, got ${frame.normal.y}`);
});

test('DifferentialGeometry on sphere has constant curvature 1/R', () => {
    const R = 2;
    // Sphere parametrization: x=R*sin(v)*cos(u), y=R*cos(v), z=R*sin(v)*sin(u) with u in [0,2PI], v in [0,PI]
    // Use simple sphere at origin
    const sphere = new ParametricSurface({
        domain: new Domain([0, 2*Math.PI], [0, Math.PI]),
        x: (u, v) => R * Math.sin(v) * Math.cos(u),
        y: (u, v) => R * Math.cos(v),
        z: (u, v) => R * Math.sin(v) * Math.sin(u)
    });
    const geo = new DifferentialGeometry(sphere);
    const frame = new DifferentialFrame();

    // Test at equator (u=0, v=PI/2) -> point (R,0,0), curvatures should be ~±1/R (sign depends on normal orientation)
    geo.differentialFrame(0, 0.5, frame);

    const expectedK = 1 / R;
    // Allow some numerical error due to finite differences (eps=1e-6), check absolute value
    assert.ok(Math.abs(Math.abs(frame.k1) - expectedK) < 1e-6, `|k1| should be ~${expectedK}, got ${frame.k1}`);
    assert.ok(Math.abs(Math.abs(frame.k2) - expectedK) < 1e-6, `|k2| should be ~${expectedK}, got ${frame.k2}`);
    assert.ok(Math.abs(frame.normal.length() - 1) < 1e-6, 'Normal should be unit');
});

test('DifferentialGeometry returns null for degenerate point', () => {
    // Degenerate surface where Xu and Xv are colinear (detI ~0)
    const degenerate = new ParametricSurface({
        domain: new Domain([0, 1], [0, 1]),
        x: (u, _v) => u,
        y: (u, _v) => u, // y = x, so Xu and Xv are same direction
        z: (_u, _v) => 0
    });
    const geo = new DifferentialGeometry(degenerate);
    const frame = new DifferentialFrame();

    const result = geo.differentialFrame(0.5, 0.5, frame);
    // Should return null for degenerate (detI < 1e-12)
    // For this degenerate case, Xu=(1,1,0), Xv=(1,1,0) -> detI = E*G - F*F = 2*2 -2*2=0
    assert.equal(result, null, 'Should return null for degenerate point');
});
