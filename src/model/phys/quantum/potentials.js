/**
 * Standard two-dimensional quantum-mechanical potential functions.
 *
 * Potential functions use the SingleParticle convention:
 *
 *     particle => V(x, y)
 *
 * They are deliberately kept as plain functions so they can be passed
 * directly to Hamiltonian without introducing a potential class hierarchy.
 */

/** Infinite square well: zero potential inside the computational domain. */
export function infiniteSquareWell(/** @type {import('./particles.js').SingleParticle} */ particle) {
    return 0;
}

/**
 * Two-dimensional isotropic harmonic oscillator.
 * V = 1/2 k (x² + y²)
 */
export function harmonicOscillator(
    /** @type {import('./particles.js').SingleParticle} */ particle,
    k = 1
) {
    return 0.5 * k * (particle.x ** 2 + particle.y ** 2);
}

/**
 * Two-dimensional anisotropic harmonic oscillator.
 * V = 1/2 (kx x² + ky y²)
 */
export function anisotropicHarmonicOscillator(
    /** @type {import('./particles.js').SingleParticle} */ particle,
    kx = 1,
    ky = 2
) {
    return 0.5 * (kx * particle.x ** 2 + ky * particle.y ** 2);
}

/**
 * Two-dimensional double well with harmonic confinement in y.
 * V = a (x² - b²)² + 1/2 ky y²
 */
export function doubleWell(
    /** @type {import('./particles.js').SingleParticle} */ particle,
    a = 1,
    b = 1,
    ky = 1
) {
    return a * (particle.x ** 2 - b ** 2) ** 2 + 0.5 * ky * particle.y ** 2;
}

/**
 * Circular finite well. The potential is low inside a radius and high
 * outside it. A finite barrier is used so the function remains numerically
 * convenient for the finite-difference Hamiltonian.
 */
export function circularWell(
    /** @type {import('./particles.js').SingleParticle} */ particle,
    radius = 2,
    barrier = 100
) {
    return particle.x ** 2 + particle.y ** 2 <= radius ** 2 ? 0 : barrier;
}

/**
 * Two-dimensional quartic oscillator.
 * V = a (x⁴ + y⁴)
 */
export function quartic(
    /** @type {import('./particles.js').SingleParticle} */ particle,
    a = 0.1
) {
    return a * (particle.x ** 4 + particle.y ** 4);
}

/** Standard potentials available to the quantum examples. */
export const Potentials = {
    infiniteSquareWell,
    harmonicOscillator,
    anisotropicHarmonicOscillator,
    doubleWell,
    circularWell,
    quartic
};
