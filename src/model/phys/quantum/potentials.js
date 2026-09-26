import { SingleParticle } from "./hamiltonian.js";

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
export class InfiniteSquareWell {
    static latex = 'V(x,y)=0';
    static withoutParameters = () =>
        (/** @type {SingleParticle} */ particle) => 0;
}

/**
 * Two-dimensional isotropic harmonic oscillator: V = 1/2 k (x² + y²)
 */
export class HarmonicOscillator {
    static latex = 'V(x,y)=\\frac{1}{2}k(x^2+y^2)';
    static withSpringConstant = (/** @type {number} */ k) => 
        (/** @type {SingleParticle} */ particle) =>
            0.5 * k * (particle.x * particle.x + particle.y * particle.y);
}

/**
 * Two-dimensional anisotropic harmonic oscillator: V = 1/2 (kx x² + ky y²)
 */
export class AnisotropicHarmonicOscillator {
    static latex = 'V(x,y)=\\frac{1}{2}(k_x x^2 + k_y y^2)';
    static withSpringConstants = (/** @type {number} */ kx, /** @type {number} */ ky) => 
        (/** @type {SingleParticle} */ particle) =>
            0.5 * (kx * particle.x * particle.x + ky * particle.y * particle.y);
}

/**
 * Two-dimensional double well with harmonic confinement in y: V = a (x² - b²)² + 1/2 ky y²
 */
export class DoubleWell {
    static latex = 'V(x,y)=a(x^2-b^2)^2+0.5k y^2';
    static withConstants = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ ky) => 
        (/** @type {SingleParticle} */ particle)=>
            a * (particle.x * particle.x - b *b) ** 2 + 0.5 * ky * particle.y * particle.y;
}

/**
 * Circular finite well. The potential is low inside a radius and high
 * outside it. A finite barrier is used so the function remains numerically
 * convenient for the finite-difference Hamiltonian.
 */
export class CircularWell {
    static latex = 'V(x,y)=\\begin{cases} 0\\quad(x^2 + y^2) <= r^2 \\\\ a \\quad(x^2 + y^2) > r^2 \\end{cases}';
    static withRadiusAndBarrier = (/** @type {number} */ radius, /** @type {any} */ barrier) => 
        (/** @type {SingleParticle} */ particle) =>
            particle.x *particle.x + particle.y * particle.y <= radius * radius ? 0 : barrier;
}

/**
 * Two-dimensional quartic oscillator: V = a (x⁴ + y⁴)
 */
export class Quartic {
    static latex = 'V(x,y)=a(x^4 + y^4)';
    static withConstant = (/** @type {number} */ a) => 
        (/** @type {SingleParticle} */ particle) => 
            a * (particle.x ** 4 + particle.y ** 4);
}
