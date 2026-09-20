import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { DiscreteScalarField3D, DiscreteComplexField3D } from '../src/model/math/fields.js';
import { SchrodingerEigenstateSolver3D } from '../src/model/math/numerics/solvers/qmsolvers.js';

test('3D eigenstate diagnostics report spherical symmetry', () => {
    const nx = 17;
    const field = new DiscreteScalarField3D({ nx, ny: nx, nz: nx });
    const psi = new DiscreteComplexField3D({ nx, ny: nx, nz: nx });
    const center = (nx - 1) / 2;

    const state = new Float64Array(nx * nx * nx);
    for (let z = 1; z < nx - 1; z++)
        for (let y = 1; y < nx - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const dx = x - center;
                const dy = y - center;
                const dz = z - center;
                const r2 = dx * dx + dy * dy + dz * dz;
                state[psi.index(x, y, z)] = Math.exp(-r2 / 8);
            }

    const solver = new SchrodingerEigenstateSolver3D({
        potential: field,
        spacing: 1,
        states: 1
    });

    solver._eigenstates = [state];
    solver._eigenvalues = [0];

    const diagnostics = solver.diagnosticsFor(0, { radialBins: 64 });

    assert.equal(diagnostics.energy, 0, 'Energy eigenvalue not 0');
    assert.equal(diagnostics.residual > 0, true, 'Residual <= 0');
    assert.ok(diagnostics.radialSymmetryError < 1e-12, 'RadiaSymmetryError >= 1e-12');
});

test('3D eigenstate diagnostics detect directional asymmetry', () => {
    const nx = 17;
    const field = new DiscreteScalarField3D({ nx, ny: nx, nz: nx });
    const psi = new DiscreteComplexField3D({ nx, ny: nx, nz: nx });
    const center = (nx - 1) / 2;

    const state = new Float64Array(nx * nx * nx);
    for (let z = 1; z < nx - 1; z++)
        for (let y = 1; y < nx - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const dx = x - center;
                const dy = y - center;
                const dz = z - center;
                const r2 = dx * dx + dy * dy + dz * dz;
                state[psi.index(x, y, z)] = Math.exp(-r2 / 8) * (1 + 0.5 * dx / center);
            }

    const solver = new SchrodingerEigenstateSolver3D({
        potential: field,
        spacing: 1,
        states: 1
    });

    solver._eigenstates = [state];
    solver._eigenvalues = [0];

    const diagnostics = solver.diagnosticsFor(0, { radialBins: 64 });

    assert.ok(diagnostics.radialSymmetryError > 0.01, 'RadiaSymmetryError >= 1e-2');
});
