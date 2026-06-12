import type { TensorflowModel } from "react-native-fast-tflite";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadTensorflowModel: ((model: any, delegate: any[]) => Promise<TensorflowModel>) | null = null;
try {
  // Native module байхгүй build дээр crash болохоос сэргийлж lazy load хийнэ
  loadTensorflowModel = require("react-native-fast-tflite").loadTensorflowModel;
} catch { /* native module холбогдоогүй — detectMoneyViaTM null буцаана */ }
import * as ImageManipulator from "expo-image-manipulator";
import { Skia, ColorType, AlphaType } from "@shopify/react-native-skia";

const INPUT_SIZE = 224;
const CONFIDENCE_THRESHOLD = 0.6;

// labels.txt: 0→20000, 1→10000, 2→5000, 3→1000, 4→500, 5→100, 6→50, 7→null(танихгүй)
const LABELS: (number | null)[] = [20000, 10000, 5000, 1000, 500, 100, 50, null];

let model: TensorflowModel | null = null;
let loading = false;

async function ensureModel(): Promise<boolean> {
  if (model) return true;
  if (loading) return false;
  loading = true;
  try {
    if (!loadTensorflowModel) return false;
    model = await loadTensorflowModel(require("@/assets/models/model.tflite"), []);
    return true;
  } catch {
    return false;
  } finally {
    loading = false;
  }
}

async function uriToUint8(uri: string, width?: number, height?: number): Promise<Uint8Array | null> {
  try {
    // Teachable Machine шиг: эхлээд төвөөс квадрат тайрч (center-crop) дараа 224 болгоно.
    // Шууд сунгавал дэвсгэртийн харьцаа гажиж буруу таьдаг.
    const actions: ImageManipulator.Action[] = [];
    if (width && height) {
      const side = Math.min(width, height);
      actions.push({
        crop: {
          originX: Math.floor((width - side) / 2),
          originY: Math.floor((height - side) / 2),
          width: side,
          height: side,
        },
      });
    }
    actions.push({ resize: { width: INPUT_SIZE, height: INPUT_SIZE } });
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    const data = await Skia.Data.fromURI(resized.uri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return null;
    const pixels = image.readPixels(0, 0, {
      width: INPUT_SIZE,
      height: INPUT_SIZE,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    }) as Uint8Array | null;
    if (!pixels) return null;
    // Quantized (uint8) model — пикселийг [0-255] хэвээр, RGBA→RGB болгоно
    const rgb = new Uint8Array(INPUT_SIZE * INPUT_SIZE * 3);
    for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
      rgb[i * 3]     = pixels[i * 4];
      rgb[i * 3 + 1] = pixels[i * 4 + 1];
      rgb[i * 3 + 2] = pixels[i * 4 + 2];
    }
    return rgb;
  } catch {
    return null;
  }
}

export async function detectMoneyViaTM(uri: string, width?: number, height?: number): Promise<number | null> {
  if (!uri) return null;
  try {
    if (!(await ensureModel()) || !model) return null;
    const input = await uriToUint8(uri, width, height);
    if (!input) return null;
    const outputs = model.runSync([input.buffer as ArrayBuffer]);
    // Quantized (uint8) гаралт — утга бүр 0-255, магадлал = utga / 255
    const probsU8 = new Uint8Array(outputs[0]);
    let maxU8 = 0;
    let maxIdx = -1;
    for (let i = 0; i < probsU8.length; i++) {
      if (probsU8[i] > maxU8) {
        maxU8 = probsU8[i];
        maxIdx = i;
      }
    }
    const maxProb = maxU8 / 255;
    console.log(`[TM] idx=${maxIdx} prob=${maxProb.toFixed(2)} → ${LABELS[maxIdx]}  all=[${Array.from(probsU8).map((v) => (v / 255).toFixed(2)).join(",")}]`);
    // Зөвхөн threshold-оос их магадлалтай үед л дүнг буцаана, эс бол танихгүй (null)
    if (maxProb <= CONFIDENCE_THRESHOLD || maxIdx === -1) return null;
    return LABELS[maxIdx] ?? null;
  } catch {
    return null;
  }
}
