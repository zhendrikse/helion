import { createSolenoidScene } from "./scenes/solenoid.js";
import { createChargedRingScene } from "./scenes/charged_ring.js";
import { createDipoleFieldScene } from "./scenes/dipole_field.js";

const scenes = {
    solenoid: createSolenoidScene,
    dipole_field: createDipoleFieldScene,
    charged_ring: createChargedRingScene
};

if (document.getElementById("chargedRingCanvas"))
    scenes.charged_ring.run();

if (document.getElementById("dipoleFieldCanvas"))
    scenes.dipole_field.run();

if (document.getElementById("solenoidCanvas"))
    scenes.solenoid.run();
