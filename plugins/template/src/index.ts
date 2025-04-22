// plugins/your-plugin/src/index.ts
import { ReactNative as RN } from "@vendetta/metro/common";
import { instead } from "@vendetta/patcher";
import { logger } from "@vendetta";

let unpatch; // Variable to store the unpatch function

// --- THESE ARE PLACEHOLDERS - YOU MUST FIND THE REAL NAMES ---
const ACTUAL_NATIVE_MODULE_NAME = "?????"; // Example: "VoiceAudioManager", "RTCAudioSessionManager" - FIND THIS
const ACTUAL_FUNCTION_NAME = "?????"; // Example: "setAudioMode", "configureForVoice", "setCommunication" - FIND THIS
// ---

export default {
    onLoad: () => {
        logger.log("Attempting to apply Bluetooth Audio Fix...");

        const AudioModule = RN.NativeModules[ACTUAL_NATIVE_MODULE_NAME];

        if (!AudioModule) {
            logger.error(`[BT Fix] Native module "${ACTUAL_NATIVE_MODULE_NAME}" not found. Cannot apply patch.`);
            // For debugging, you might try logging all available module names:
            // console.log("[BT Fix] Available Native Modules:", Object.keys(RN.NativeModules));
            return;
        }

        if (typeof AudioModule[ACTUAL_FUNCTION_NAME] !== 'function') {
            logger.error(`[BT Fix] Function "${ACTUAL_FUNCTION_NAME}" not found in module "${ACTUAL_NATIVE_MODULE_NAME}". Cannot apply patch.`);
            // For debugging, you might try logging functions in the found module:
            // console.log(`[BT Fix] Functions in ${ACTUAL_NATIVE_MODULE_NAME}:`, Object.keys(AudioModule));
            return;
        }

        logger.log(`[BT Fix] Found ${ACTUAL_NATIVE_MODULE_NAME}.${ACTUAL_FUNCTION_NAME}. Applying patch...`);

        try {
            unpatch = instead(ACTUAL_FUNCTION_NAME, AudioModule, (args, orig) => {
                logger.log(`[BT Fix] Blocked call to ${ACTUAL_NATIVE_MODULE_NAME}.${ACTUAL_FUNCTION_NAME}`);
                // Return undefined or potentially what the original function might return on success if known
                return;
            });
            logger.log("[BT Fix] Patch applied successfully.");
        } catch (err) {
            logger.error(`[BT Fix] Failed to apply patch: ${err}`);
            unpatch = null;
        }
    },

    onUnload: () => {
        if (unpatch) {
            logger.log("[BT Fix] Removing patch...");
            try {
                unpatch();
                logger.log("[BT Fix] Patch removed.");
            } catch (err) {
                logger.error(`[BT Fix] Failed to remove patch: ${err}`);
            }
            unpatch = null; // Clear the stored function
        } else {
            logger.log("[BT Fix] No active patch to remove.");
        }
    }
}
