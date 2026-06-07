
import { AudioPlayer, createAudioPlayer } from 'expo-audio';

let activePlayer: AudioPlayer | null = null;

export async function playSoundFile(source: ReturnType<typeof require>) {
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