import { instead } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { logger } from "@vendetta";

// Attempt a more specific search for the voice utility module
// This assumes setSelfMute is often found alongside setSelfDeaf
const voiceUtil = findByProps("setSelfDeaf", "setSelfMute", "setLocalVolume"); // Add more known related props if needed

let unpatch; // Store the unpatch function

export const onLoad = () => {
  if (!voiceUtil) {
    logger.error("BluetoothAudioFix: Voice utilities module not found. The module structure likely changed.");
    return; // Stop loading if the module isn't found
  }

  logger.log("BluetoothAudioFix: Found voice utilities module.");

  // Use try-catch to handle potential errors during patching or execution
  try {
    // Store the unpatch function returned by instead()
    unpatch = instead("setSelfDeaf", voiceUtil, (args, original) => {
      logger.log(`BluetoothAudioFix: setSelfDeaf called with args: ${JSON.stringify(args)}`);

      // --- Your custom logic would go here ---
      // Example: Log that you are intercepting the call
      logger.log("BluetoothAudioFix: Intercepting setSelfDeaf call.");
      // ----------------------------------------

      // Call the original function with the original arguments
      // Use apply to ensure correct context ('this')
      return original.apply(voiceUtil, args);
    });

    logger.log("BluetoothAudioFix: Patch applied successfully to setSelfDeaf.");

  } catch (err) {
    logger.error(`BluetoothAudioFix: Failed to patch setSelfDeaf: ${err}`);
    // Clean up if patching failed immediately
    unpatch?.();
    unpatch = null;
  }
};

export const onUnload = () => {
  // Use the stored unpatch function
  if (unpatch) {
    unpatch();
    logger.log("BluetoothAudioFix: setSelfDeaf patch removed.");
  } else {
    logger.log("BluetoothAudioFix: No active patch to remove.");
  }
  unpatch = null; // Clear the stored function
};
