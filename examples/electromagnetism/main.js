import { createSolenoidScene } from "./scenes/solenoid.js";
import { createChargedRingScene } from "./scenes/charged_ring.js";
import { createDipoleFieldScene } from "./scenes/dipole_field.js";
import { createElectromagneticWaveScene } from "./scenes/electromagnetic_wave_quiver.js"
import { createAntennaScene } from "./scenes/antenna.js"

const scenes = {
    solenoid: createSolenoidScene,
    dipole_field: createDipoleFieldScene,
    charged_ring: createChargedRingScene,
    electromagnetic_wave_quiver: createElectromagneticWaveScene,
    antenna: createAntennaScene
};

if (document.getElementById("chargedRingCanvas"))
    scenes.charged_ring.run();

if (document.getElementById("dipoleFieldCanvas"))
    scenes.dipole_field.run();

if (document.getElementById("solenoidCanvas"))
    scenes.solenoid.run();

if (document.getElementById("electromagneticWaveCanvas"))
    scenes.electromagnetic_wave_quiver.run();

if (document.getElementById("antennaCanvas"))
    scenes.antenna.run();


