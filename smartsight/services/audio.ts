import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import type { AudioSource } from 'expo-audio';

let activePlayer: AudioPlayer | null = null;

export async function playSoundFile(source: AudioSource) {
  try {
    // Stop previous audio
    if (activePlayer) {
      activePlayer.remove();
      activePlayer = null;
    }

    const player = createAudioPlayer(source);
    activePlayer = player;
    player.play();

  } catch (err) {
    console.warn('[A11y] Audio playback failed:', err);
  }
}