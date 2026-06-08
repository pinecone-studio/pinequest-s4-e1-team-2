import { Skia, AlphaType, ColorType } from "@shopify/react-native-skia";

const SAMPLE_REGION_RATIO = 0.3;

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

function averageRgb(pixels: Uint8Array | Float32Array): [number, number, number] {
  const isFloat = pixels instanceof Float32Array;
  const scale = isFloat ? 255 : 1;
  let r = 0;
  let g = 0;
  let b = 0;
  const pixelCount = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }

  return [(r / pixelCount) * scale, (g / pixelCount) * scale, (b / pixelCount) * scale];
}

/**
 * Уг банкнот камерын кадрын төвд байх тул зургийн төвөөс квадрат бүс түүвэрлэж дундаж өнгийг тооцно.
 */
export async function sampleCenterColor(uri: string): Promise<string | null> {
  try {
    const data = await Skia.Data.fromURI(uri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return null;

    const regionSize = Math.floor(Math.min(image.width(), image.height()) * SAMPLE_REGION_RATIO);
    const srcX = Math.floor((image.width() - regionSize) / 2);
    const srcY = Math.floor((image.height() - regionSize) / 2);

    const pixels = image.readPixels(srcX, srcY, {
      width: regionSize,
      height: regionSize,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!pixels) return null;

    const [r, g, b] = averageRgb(pixels);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return null;
  }
}
