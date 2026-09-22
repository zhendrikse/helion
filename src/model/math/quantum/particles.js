/**
 * Single non-relativistic particle used by quantum potential functions.
 *
 * The Hamiltonian updates x/y while sampling a potential. Keeping this tiny
 * object separate makes the potential API read naturally:
 *
 *   particle => 0.5 * k * particle.x ** 2
 */
export class SingleParticle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}
