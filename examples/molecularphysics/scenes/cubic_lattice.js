import {RadialSymmetricBody, Vec3} from "../../../src/index.js";

function createCubicLattice(system, {
    nx = 10,
    ny = 10,
    nz = 10,
    spacing = 1,
    mass = 1,
    radius = 0.1,
    k = 1000,
    damping = 0.1
}) {
    const nodes = [];

    const halfX = (nx - 1) * spacing / 2;
    const halfY = (ny - 1) * spacing / 2;
    const halfZ = (nz - 1) * spacing / 2;

    for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
            for (let x = 0; x < nx; x++) {

                const body = system.addBody(new RadialSymmetricBody({
                    position: new Vec3(
                        x * spacing - halfX,
                        y * spacing - halfY,
                        z * spacing - halfZ
                    ),
                    mass,
                    radius
                }));

                nodes.push(body);
            }
        }
    }

    const idx = (x, y, z) => x + y * nx + z * nx * ny;

    for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
            for (let x = 0; x < nx; x++) {

                const i = idx(x, y, z);

                if (x < nx - 1) connect(i, idx(x + 1, y, z));
                if (y < ny - 1) connect(i, idx(x, y + 1, z));
                if (z < nz - 1) connect(i, idx(x, y, z + 1));
            }
        }
    }

    return nodes;
}