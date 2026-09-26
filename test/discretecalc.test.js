import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { ScalarFieldCalculus } from '../src/model/math/numerics/discretecalc.js';
import { DiscreteScalarField } from '../src/model/math/fields.js';
import { Vec2 } from '../src/model/math/math.js';

test('Gradient / divergence', () => {
    const field = new DiscreteScalarField({nx: 3, ny: 3 });
    field.setValueAt(1, 2, 1);
    field.setValueAt(2, 1, 1);

    const calculator = new ScalarFieldCalculus(field);
    const div = new Vec2();
    calculator.gradient(0, 0, 1, div);
    assert.deepEqual(div, new Vec2());

    calculator.gradient(1, 1, 1, div);
    assert.deepEqual(div, new Vec2(.5, .5));
});