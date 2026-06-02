export class Integrators {
    static eulerStep(physicsState, dt, accelerationFn) {
        const acceleration = accelerationFn(physicsState);

        physicsState.velocity.addScaledVector(acceleration, dt);
        physicsState.position.addScaledVector(physicsState.velocity, dt);
        physicsState.acceleration = acceleration;
    }

    static symplecticEulerStep(physicsState, dt, accelerationFn) {
        const acceleration = accelerationFn(physicsState);

        physicsState.velocity.addScaledVector(acceleration, dt);
        physicsState.position.addScaledVector(physicsState.velocity, dt);
        physicsState.acceleration = acceleration;
    }


    static rk2Step(physicsState, dt, accelerationFn) {
        const acceleration = accelerationFn(physicsState);

        const derivative = (body) => ({
            dx: body.velocity.clone(),
            dv: acceleration
        });

        const k1 = derivative(physicsState);

        const mid = physicsState.clone();
        mid.position.addScaledVector(k1.dx, dt);
        mid.velocity.addScaledVector(k1.dv, dt);

        const k2 = derivative(mid);

        physicsState.position.addScaledVector(k1.dx.clone().add(k2.dx), dt / 2);
        physicsState.velocity.addScaledVector(k1.dv.clone().add(k2.dv), dt / 2);
        physicsState.acceleration = acceleration;
    }

    static rk4Step(physicsState, dt, accelerationFn) {
        const acceleration = accelerationFn(physicsState);

        const derivative = (body) => ({
            dx: body.velocity.clone(),
            dv: acceleration
        });

        const k1 = derivative(physicsState);

        const s2 = physicsState.clone();
        s2.position.addScaledVector(k1.dx, dt / 2);
        s2.velocity.addScaledVector(k1.dv, dt / 2);
        const k2 = derivative(s2);

        const s3 = physicsState.clone();
        s3.position.addScaledVector(k2.dx, dt / 2);
        s3.velocity.addScaledVector(k2.dv, dt / 2);
        const k3 = derivative(s3);

        const s4 = physicsState.clone();
        s4.position.addScaledVector(k3.dx, dt);
        s4.velocity.addScaledVector(k3.dv, dt);
        const k4 = derivative(s4);

        physicsState.position
            .addScaledVector(k1.dx, dt / 6)
            .addScaledVector(k2.dx, dt / 3)
            .addScaledVector(k3.dx, dt / 3)
            .addScaledVector(k4.dx, dt / 6);

        physicsState.velocity
            .addScaledVector(k1.dv, dt / 6)
            .addScaledVector(k2.dv, dt / 3)
            .addScaledVector(k3.dv, dt / 3)
            .addScaledVector(k4.dv, dt / 6);

        physicsState.acceleration = acceleration;
    }
}