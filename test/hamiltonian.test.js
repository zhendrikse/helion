import test from 'node:test';
import assert from 'node:assert/strict';

import { DiscreteScalarField, DiscreteScalarField3D } from '../src/model/math/fields.js';
import { Hamiltonian } from '../src/model/math/quantum/hamiltonian.js';

test('Hamiltonian applies the 2D finite-difference operator', () => {
    const nx = 5;
    const potential = new DiscreteScalarField({ nx, ny: nx });
    const hamiltonian = new Hamiltonian({ potential, N: nx, spacing: 1, hbar: 1, mass: 1 });
    const psi = new Float64Array(nx * nx);

    psi[2 * nx + 2] = 1;
    const result = hamiltonian.apply(psi);

    assert.equal(result[2 * nx + 2], 2);
    assert.equal(result[2 * nx + 1], -0.5);
    assert.equal(result[2 * nx + 3], -0.5);
    assert.equal(result[1 * nx + 2], -0.5);
    assert.equal(result[3 * nx + 2], -0.5);
});

test('Hamiltonian applies the 3D finite-difference operator', () => {
    const n = 5;
    const potential = new DiscreteScalarField3D({ nx: n, ny: n, nz: n });
    const hamiltonian = new Hamiltonian({ potential, N: n, spacing: 1, hbar: 1, mass: 1 });
    const psi = new Float64Array(n * n * n);
    const center = potential.index(2, 2, 2);

    psi[center] = 1;
    const result = hamiltonian.apply(psi);

    assert.equal(result[center], 3);
    assert.equal(result[potential.index(1, 2, 2)], -0.5);
    assert.equal(result[potential.index(3, 2, 2)], -0.5);
    assert.equal(result[potential.index(2, 1, 2)], -0.5);
    assert.equal(result[potential.index(2, 3, 2)], -0.5);
    assert.equal(result[potential.index(2, 2, 1)], -0.5);
    assert.equal(result[potential.index(2, 2, 3)], -0.5);
});

test('Hamiltonian energy uses the Rayleigh quotient', () => {
    const potential = new DiscreteScalarField({ nx: 5, ny: 5 });
    potential.setValueAt(2, 2, 4);
    const hamiltonian = new Hamiltonian({ potential, N: 5 });
    const psi = new Float64Array(25);
    psi[12] = 1;

    assert.equal(hamiltonian.energyOf(psi), 6);
});
