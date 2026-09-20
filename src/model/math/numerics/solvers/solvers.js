import { DiscreteScalarField, Field } from "../../fields.js";
import { LaplaceOperator} from "../../../transformations/operators.js";
import { DirichletBoundaryCondition } from "../boundaryconditions/dirichlet.js";
import { Equation } from "../../equations.js";

/**
 * A solver should be applied to a discrete scalar field.
 */
export class Solver {
    /**
     * Apply solver to field.
     * 
     * @abstract
     * @param {Field} field
     * @param {number} increment 
     */
    step(field, increment) {}
}

export class JacobiSolver extends Solver {
    /**
     * @param {DirichletBoundaryCondition} boundaryCondition
     */
    constructor(boundaryCondition) {
        super();
        this._boundaryCondition = boundaryCondition;
        this._next = null;
    }

    /** @param {DirichletBoundaryCondition} boundaryCondition */
    set boundaryCondition(boundaryCondition) { this._boundaryCondition = boundaryCondition; }

    reset() {
        this._next?.fill(0);
    }

    /**
     * Apply Jacobi iterations to solve Laplace's equation.
     *
     * Fixed values are enforced by the boundary condition; all other
     * points are updated from the previous iteration.
     *
     * @param {DiscreteScalarField} field
     * @param {number} increments
     */
    step(field, increments) {
        const nx = field.nx;
        const ny = field.ny;
        this._next = this._next === null || this._next.length !== nx * ny
            ? new Float32Array(nx * ny)
            : this._next;

        const next = this._next;

        for (let iteration = 0; iteration < increments; iteration++) {
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) 
                    this._boundaryCondition.isFixed(x, y) ?
                        next[field.index(x, y)] = this._boundaryCondition.valueAt(x, y) :
                        next[field.index(x, y)] = field.valueAt(x, y) + 0.25 * LaplaceOperator.at(field, x, y);

            field.data.set(next);
        }
    }
}

export class WaveEquationSolver extends Solver {
    /** @param {Equation} equation */
    constructor(equation) {
        super();
        this._equation = equation;
        this._previous = null;
        this._next = null;
    }

    reset() {
        this._previous?.fill(0);
        this._next?.fill(0);
    }

    /**
     * @param {DiscreteScalarField} field
     * @param {number} dt 
     */
    step(field, dt) {
        const nx = field.nx;
        const ny = field.ny;

        this._previous = this._previous === null ? new Float32Array(nx * ny) : this._previous;
        this._next = this._next === null ? new Float32Array(nx * ny) : this._next;
        const previous = this._previous;
        const next = this._next;

        const gamma = this._equation.damping;
        const dt2 = dt * dt;
        const damping = 1 - gamma * dt;
        for (let i = 1; i < nx - 1; i++)
            for (let j = 1; j < ny - 1; j++) {
                const index = i + field.nx * j;
                const acceleration = this._equation.acceleration(field, i, j);
                const velocity = field.valueAt(i, j) - previous[index];
                next[index] = field.valueAt(i, j) + damping * velocity + dt2 * acceleration;
            }

        this._previous.set(field.data);
        field.data.set(next);
    }
}
