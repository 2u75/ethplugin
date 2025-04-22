// plugins/your-plugin-name/src/index.ts

import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin"; // Using legacy storage for simplicity, or use @vendetta/settings

// We need to store the unpatch functions globally in the plugin's scope
let unpatches: (() => void)[] = [];

// Define default settings if they don't exist
if (storage.compatibilityMode === undefined) {
    storage.compatibilityMode = false; // Default to normal mode
}

// --- Helper: Find the Audio Manager Module ---
// This is the MOST CRITICAL and uncertain part. We need to find the JS module
// that handles audio device activation and mode setting.
// Property names are guesses based on functionality.
const AudioManagerModule = findByProps(
    "setDevice", // Common function name for setting audio devices
    "setMode", // Common function name for setting audio modes (e.g., communication)
    "activateDevice", // Maybe exists? Less likely identical name
    "startBluetoothSco", // Maybe exists?
    "setCommunicationMode" // Maybe exists?
);
// You might need other combinations or more specific searches depending on client version

// --- Constants (Need to be discovered) ---
// We need to figure out how Discord represents device types in JS.
// These are placeholders - you MUST find the actual values/enums.
const DEVICE_TYPES = {
    BLUETOOTH_HEADSET: "bluetooth_headset", // EXAMPLE VALUE - FIND THE REAL ONE
    // ... other types like SPEAKER, EARPIECE etc.
};

// We also need the names of the functions to patch. These are GUESSES.
const FUNCTION_NAMES = {
    // Equivalent of Aliucord's 'b' (activateDevice in normal mode)
    ACTIVATE_DEVICE: "setDevice", // GUESS - Could be setDevice, activateDevice, etc.
    // Equivalent of Aliucord's 'h' (setCommunicationModeOn in compat mode)
    SET_COMM_MODE: "setCommunicationMode", // GUESS
    // Equivalent of Aliucord's 'j' (startBluetoothSco in compat mode)
    START_BT_SCO: "startBluetoothSco", // GUESS
    // Equivalent of Aliucord's 'i' (the proxy method called in normal mode)
    PROXY_METHOD: "someInternalAudioFunction", // GUESS - Hardest to find/translate
};

export default {
    onLoad: () => {
        logger.log("Bluetooth Audio Fix Plugin Loading...");

        if (!AudioManagerModule) {
            logger.error("Could not find AudioManager module. Aborting.");
            // Consider showing a toast to the user
            return;
        }
        logger.log("Found potential AudioManager module.");

        try {
            const isCompatibilityMode = !!storage.compatibilityMode; // Read setting
            logger.log(`Mode: ${isCompatibilityMode ? 'Compatibility' : 'Normal'}`);

            if (isCompatibilityMode) {
                // --- Compatibility Mode ---
                // Patch 'h' and 'j' equivalents to do nothing
                const funcH = FUNCTION_NAMES.SET_COMM_MODE;
                const funcJ = FUNCTION_NAMES.START_BT_SCO;

                if (AudioManagerModule[funcH]) {
                    const unpatchH = instead(funcH, AudioManagerModule, (args, orig) => {
                        logger.log(`Compatibility Mode: Blocking call to ${funcH}`);
                        return; // Do nothing
                    });
                    unpatches.push(unpatchH);
                    logger.log(`Patched ${funcH} for compatibility mode.`);
                } else {
                    logger.warn(`Could not find function ${funcH} for compatibility mode patch.`);
                }

                if (AudioManagerModule[funcJ]) {
                    const unpatchJ = instead(funcJ, AudioManagerModule, (args, orig) => {
                        logger.log(`Compatibility Mode: Blocking call to ${funcJ}`);
                        return; // Do nothing
                    });
                    unpatches.push(unpatchJ);
                    logger.log(`Patched ${funcJ} for compatibility mode.`);
                } else {
                    logger.warn(`Could not find function ${funcJ} for compatibility mode patch.`);
                }

            } else {
                // --- Normal Mode ---
                // Patch 'b' equivalent ('activateDevice')
                const funcB = FUNCTION_NAMES.ACTIVATE_DEVICE;
                // We also need the equivalent of 'i' if we replicate the proxy call logic exactly
                const funcI = FUNCTION_NAMES.PROXY_METHOD;

                if (AudioManagerModule[funcB]) {
                    const unpatchB = instead(funcB, AudioManagerModule, (args, orig) => {
                        // Assuming the first argument is the device type
                        const deviceType = args[0];
                        logger.log(`Normal Mode: Intercepted ${funcB} call with deviceType: ${deviceType}`);

                        // This is the core logic translation:
                        // Original called 'i(deviceTypes != DiscordAudioManager.DeviceTypes.BLUETOOTH_HEADSET)'
                        // So, if device is NOT Bluetooth, call the 'i' equivalent.
                        // If it IS Bluetooth, we do *not* call the original 'b' (or 'i').
                        if (deviceType !== DEVICE_TYPES.BLUETOOTH_HEADSET) {
                            logger.log(`Device is not Bluetooth, attempting proxy call logic (equivalent of 'i')...`);
                            // Option 1: Try calling the 'i' equivalent if found
                            if (AudioManagerModule[funcI]) {
                                try {
                                     // Call 'i' equivalent - need to know its arguments
                                     // This is highly speculative. The original 'i' likely just set an internal state.
                                     // It might be sufficient to just call the original function 'orig' here.
                                     // return AudioManagerModule[funcI](/* correct args for 'i' */);
                                     logger.warn(`Calling original function '${funcB}' instead of unknown proxy '${funcI}' for non-Bluetooth.`);
                                     return orig(...args); // Fallback: Call original if proxy logic unknown
                                } catch (proxyErr) {
                                     logger.error(`Error calling proxy function ${funcI}: ${proxyErr}`);
                                     // Decide on fallback behavior, maybe call original?
                                     return orig(...args);
                                }
                            } else {
                                logger.warn(`Proxy function ${funcI} not found. Falling back to calling original ${funcB} for non-Bluetooth.`);
                                return orig(...args); // Fallback if 'i' equivalent isn't found
                            }
                        } else {
                            // Device IS Bluetooth. The original plugin implicitly stopped
                            // the problematic flow here by not proceeding / calling the original.
                            logger.log(`Device is Bluetooth. Preventing original problematic flow for ${funcB}.`);
                            // We explicitly do NOT call 'orig(...args)' here for Bluetooth.
                            return undefined; // Or whatever the original function normally returns on success
                        }
                    });
                    unpatches.push(unpatchB);
                    logger.log(`Patched ${funcB} for normal mode.`);
                } else {
                    logger.error(`Could not find function ${funcB} for normal mode patch. Plugin may not work.`);
                }
            }
        } catch (err) {
            logger.error(`Error during patching process: ${err}`);
        }
    },

    onUnload: () => {
        logger.log("Bluetooth Audio Fix Plugin Unloading...");
        for (const unpatch of unpatches) {
            try {
                unpatch();
            } catch (err) {
                logger.error(`Failed to unpatch: ${err}`);
            }
        }
        // Clear the array after unpatching
        unpatches = [];
        logger.log("All patches removed.");
    },

    // Optional: Define settings UI if you use @vendetta/settings
    // settings: SettingsComponent // Import your React settings component (e.g., Settings.tsx)
    // You would need a Settings.tsx file to toggle the storage.compatibilityMode boolean
}
