import { createMultiBodyOscillator } from "./scenes/n_body_oscillator.js";

const scenes = {
    n_body_oscillator: createMultiBodyOscillator,
};

if (document.getElementById("chargedRingCanvas"))
    scenes.n_body_oscillator.run();
