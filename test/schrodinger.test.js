import test from 'node:test';
import assert from 'node:assert/strict';

import { DiscreteComplexField } from '../src/model/math/fields.js';
import { Hamiltonian } from '../src/model/math/quantum/hamiltonian.js';
import { SingleParticle } from '../src/model/math/quantum/particles.js';
import { SchrodingerEigenstateSolver, SchrodingerSolver } from '../src/model/math/quantum/schrodinger.js';

test('Hamiltonian samples a coordinate-based potential function', () => {
    const H = new Hamiltonian({
        particle: SingleParticle,
        spatialNdim: 2,
        N: 5,
        extent: 4,
        potential: particle => particle.x * particle.x + 2 * particle.y
    });

    assert.equal(H.potential.valueAt(2, 2), 0);
    assert.equal(H.potential.valueAt(4, 2), 4);
    assert.equal(H.potential.valueAt(2, 4), 4);
});

test('Hamiltonian solve returns stationary states and energies', () => {
    const H = new Hamiltonian({
        potential: particle => 0.02 * particle.x * particle.x,
        N: 25,
        extent: 10
    });

    const result = H.solve({ maxStates: 2, iterations: 80, dt: 0.01 });

    assert.equal(result.length, 2);
    assert.equal(result.energies.length, 2);
    assert.ok(Number.isFinite(result.energies[0]));
    assert.ok(Number.isFinite(result.energies[1]));
});

test('SchrodingerSolver preserves the staggered leapfrog update', () => {
    const H = new Hamiltonian({ N: 5, extent: 4, potential: () => 0 });
    const psi = new DiscreteComplexField({ nx: 5, ny: 5 });
    const solver = new SchrodingerSolver({ hamiltonian: H });
    const dt = 0.01;

    psi.real[12] = 1;
    psi.imag[12] = 0.25;

    // Solver does a half-step init on first step: imag += 0.5*dt*H(re)
    solver.initialize(psi, dt);
    const psiRealBeforeStep = new Float64Array(psi.real);
    const psiImagBeforeStep = new Float64Array(psi.imag);

    // Calculate the two staggered updates independently. This is the
    // regression guard for the bug where the second line accidentally used
    // H(Im(n)) instead of H(Im(n+1)).
    const hRe = H.apply(psiRealBeforeStep);
    const expectedIm = new Float64Array(psiImagBeforeStep);
    for (let i = 0; i < expectedIm.length; i++)
        expectedIm[i] -= dt * hRe[i];

    const hImNext = H.apply(expectedIm);
    const expectedRe = new Float64Array(psiRealBeforeStep);
    for (let i = 0; i < expectedRe.length; i++)
        expectedRe[i] += dt * hImNext[i];

    solver.step(psi, dt);

    for (let i = 0; i < psi.imag.length; i++)
        assert.ok(Math.abs(psi.imag[i] - expectedIm[i]) < 1e-12);

    for (let i = 0; i < psi.real.length; i++)
        assert.ok(Math.abs(psi.real[i] - expectedRe[i]) < 1e-12);
});

test('Hamiltonian-backed time evolution remains bounded for a stable timestep', () => {
    const H = new Hamiltonian({ N: 25, extent: 10, potential: () => 0 });
    const psi = H.createWaveFunction();

    for (let y = 1; y < psi.ny - 1; y++)
        for (let x = 1; x < psi.nx - 1; x++) {
            const dx = x - (psi.nx - 1) / 2;
            const dy = y - (psi.ny - 1) / 2;
            const i = psi.index(x, y);
            psi.real[i] = Math.exp(-(dx * dx + dy * dy) / 12);
        }

    const norm = () => {
        let sum = 0;
        for (let i = 0; i < psi.real.length; i++)
            sum += psi.real[i] ** 2 + psi.imag[i] ** 2;
        return sum;
    };

    const initialNorm = norm();
    for (let step = 0; step < 100; step++)
        H.evolve(psi, 0.01);

    const finalNorm = norm();
    assert.ok(Math.abs(finalNorm - initialNorm) / initialNorm < 0.05);
});
