// Офлайн (интернэтгүй) үед урьдчилан бичигдсэн монгол дуунууд.
// Azure ажиллахгүй/удаан үед тусдаа найдвартай дуут анхааруулга өгнө.
//
// Хийх зүйл: assets/cues/ дотор богино mp3-уудаа байрлуул
// (Azure-аас бичиж аваад тухайн хоолойгоор), дараа доорх require мөрүүдийг идэвхжүүл.

import { createAudioPlayer } from 'expo-audio';

// mp3 файлууд бэлэн болсон үед идэвхжүүлж болно (байхгүй файлыг require хийвэл build унана):
const CUES: Record<string, any> = {
  // stop:    require('../../assets/cues/stop.mp3'),     // "Зогс!"
  // left:    require('../../assets/cues/left.mp3'),     // "Зүүн тийш"
  // right:   require('../../assets/cues/right.mp3'),    // "Баруун тийш"
  // careful: require('../../assets/cues/careful.mp3'),  // "Болгоомжтой"
};

export type CueName = 'stop' | 'left' | 'right' | 'careful';

export function playCue(name: CueName) {
  const src = CUES[name];
  if (!src) return;
  const p = createAudioPlayer(src);
  p.play();
  const sub = p.addListener('playbackStatusUpdate', (st: any) => {
    if (st?.didJustFinish) {
      try { sub?.remove?.(); } catch {}
      try { (p as any).remove(); } catch {}
    }
  });
}
