import { Audio, type AVPlaybackSource } from "expo-av";

let activeSound: Audio.Sound | null = null;

export async function playSoundFile(source?: AVPlaybackSource) {
  if (!source) return;

  try {
    if (activeSound) {
      await activeSound.stopAsync().catch(() => {});
      await activeSound.unloadAsync().catch(() => {});
      activeSound = null;
    }

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
    activeSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        activeSound = null;
      }
    });
  } catch (err) {
    console.warn("[A11y] Audio playback failed:", err);
  }
}