import { instead } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { logger } from "@vendetta";

const voiceUtil = findByProps("setSelfDeaf");

export const onLoad = () => {
  if (!voiceUtil) {
    logger.error("Voice utilities module not found.");
    return;
  }

  instead(voiceUtil, "setSelfDeaf", (args, original) => {
    // Your custom logic here
    return original(...args);
  });

  logger.log("BluetoothAudioFix loaded.");
};

export const onUnload = () => {
  // Cleanup logic here
  logger.log("BluetoothAudioFix unloaded.");
};
