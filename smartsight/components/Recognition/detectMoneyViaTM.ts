import * as tf from "@tensorflow/tfjs";
import * as ImageManipulator from "expo-image-manipulator";
import { Skia, ColorType, AlphaType } from "@shopify/react-native-skia";

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/GR2DBgs9c/";
const INPUT_SIZE = 224;
const CONFIDENCE_THRESHOLD = 0.7;
const KNOWN_DENOMINATIONS = new Set([50, 100, 500, 1000, 5000, 10000, 20000]);

let model: tf.LayersModel | null = null;
let classNames: string[] = [];
let loading = false;

async function ensureModel(): Promise<boolean> {
  if (model) return true;
  if (loading) return false;
  loading = true;
  try {
    await tf.setBackend("cpu");
    await tf.ready();
    const meta = await fetch(MODEL_URL + "metadata.json").then((r) => r.json());
    classNames = meta.labels as string[];
    model = await tf.loadLayersModel(MODEL_URL + "model.json");
    return true;
  } catch {
    return false;
  } finally {
    loading = false;
  }
}

async function uriToTensor(uri: string): Promise<tf.Tensor4D | null> {
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
      rgb[i * 3] = pixels[i * 4] / 255;
      rgb[i * 3 + 1] = pixels[i * 4 + 1] / 255;
      rgb[i * 3 + 2] = pixels[i * 4 + 2] / 255;
    }

    return tf.tensor4d(rgb, [1, INPUT_SIZE, INPUT_SIZE, 3]);
  } catch {
    return null;
  }
}

export async function detectMoneyViaTM(uri: string): Promise<number | null> {
  if (!uri) return null;
  try {
    if (!(await ensureModel()) || !model) return null;

    const tensor = await uriToTensor(uri);
    if (!tensor) return null;

    const predictions = model.predict(tensor) as tf.Tensor;
    const probs = Array.from((await predictions.data()) as Float32Array);
    tensor.dispose();
    predictions.dispose();

    let maxProb = 0;
    let maxVal = -1;
    for (let i = 0; i < probs.length; i++) {
      const val = Number(classNames[i]);
      if (KNOWN_DENOMINATIONS.has(val) && probs[i] > maxProb) {
        maxProb = probs[i];
        maxVal = val;
      }
    }

    return maxProb >= CONFIDENCE_THRESHOLD ? maxVal : null;
  } catch {
    return null;
  }
}
