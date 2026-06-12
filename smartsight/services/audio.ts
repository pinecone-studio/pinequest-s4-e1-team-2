import { Audio, type AVPlaybackSource } from "expo-av";

let activeSound: Audio.Sound | null = null;
let audioToken = 0;
type AudioStopper = () => void | Promise<void>;

const externalStoppers = new Set<AudioStopper>();

export function registerAudioStopper(stopper: AudioStopper) {
  externalStoppers.add(stopper);
  return () => {
    externalStoppers.delete(stopper);
  };
}

async function stopCurrentSound() {
  if (!activeSound) return;

  const sound = activeSound;
  activeSound = null;
  await sound.stopAsync().catch(() => {});
  await sound.unloadAsync().catch(() => {});
}

async function stopExternalAudio(except?: AudioStopper) {
  await Promise.all(
    Array.from(externalStoppers)
      .filter((stopper) => stopper !== except)
      .map((stopper) => Promise.resolve(stopper()).catch(() => {})),
  );
}

export async function stopSoundFile() {
  audioToken += 1;
  await stopCurrentSound();
}

export async function stopAllAudio(except?: AudioStopper) {
  audioToken += 1;
  await stopCurrentSound();
  await stopExternalAudio(except);
}

export async function playSoundFile(source?: AVPlaybackSource) {
  const token = audioToken + 1;
  audioToken = token;
  await stopCurrentSound();
  await stopExternalAudio();
  if (!source) return;

  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });

    if (token !== audioToken) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
      return;
    }

    activeSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (activeSound === sound) activeSound = null;
      }
    });
  } catch (err) {
    console.warn("[A11y] Audio playback failed:", err);
  }
}