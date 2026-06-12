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

async function uriToFloat32(uri: string): Promise<Float32Array | null> {
  try {
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
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
    const rgb = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
    for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
      rgb[i * 3]     = pixels[i * 4]     / 255;
      rgb[i * 3 + 1] = pixels[i * 4 + 1] / 255;
      rgb[i * 3 + 2] = pixels[i * 4 + 2] / 255;
    }
    return rgb;
  } catch {
    return null;
  }
}

export async function detectMoneyViaTM(uri: string): Promise<number | null> {
  if (!uri) return null;
  try {
    if (!(await ensureModel()) || !model) return null;
    const input = await uriToFloat32(uri);
    if (!input) return null;
    const outputs = model.runSync([input.buffer as ArrayBuffer]);
    const probs = new Float32Array(outputs[0]);
    let maxProb = 0;
    let maxIdx = -1;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }
    // Зөвхөн 0.8-аас их магадлалтай үед л дүнг буцаана, эс бол танихгүй (null)
    if (maxProb <= CONFIDENCE_THRESHOLD || maxIdx === -1) return null;
    return LABELS[maxIdx] ?? null;
  } catch {
    return null;
  }
}
