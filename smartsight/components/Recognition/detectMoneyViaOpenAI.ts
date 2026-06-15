import * as ImageManipulator from "expo-image-manipulator";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Хамгийн хямд, vision дэмждэг загвар. Илүү нарийвчлал хэрэгтэй бол "gpt-4o" болго.
const MODEL = "gpt-4o-mini";

// Дэвсгэрт бүрийн монгол ярианы текст (Chimege шууд хэлнэ)
const DENOM_PHRASES: Record<string, string> = {
  "50": "тавин төгрөг",
  "100": "нэг зуун төгрөг",
  "500": "таван зуун төгрөг",
  "1000": "нэг мянган төгрөг",
  "5000": "таван мянган төгрөг",
  "10000": "арван мянган төгрөг",
  "20000": "хорин мянган төгрөг",
};

const PROMPT =
  "This image may show a Mongolian banknote (tögrög). " +
  "Mongolian banknote denominations are: 50, 100, 500, 1000, 5000, 10000, 20000. " +
  "Look carefully at the large denomination number and colour of the banknote. " +
  "Reply with ONLY that number (for example 10000) if a banknote is clearly visible. " +
  "If no banknote is visible or you are unsure, reply 'none'. " +
  "Reply with just the number or 'none', nothing else.";

/** Дэвсгэртийг танихаас монгол ярианы текст буцаана (эс таних бол null). */
export async function detectMoneyViaOpenAI(uri: string): Promise<string | null> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key || !uri) return null;
  try {
    // Зургийг 512px болгож база64 авна (зардал хэмнэх)
    const img = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }],
      { base64: true, compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    if (!img.base64) return null;

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                // detail: "high" — илүү нарийн уншина (дэвсгэртийн тоог тодорхой харна)
                image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: "high" },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    const match = text.replace(/[\s,]/g, "").match(/\d+/);
    if (!match) return null;
    // Зөвхөн мэдэгдэж буй дэвсгэрт бол монгол текст буцаана
    return DENOM_PHRASES[match[0]] ?? null;
  } catch {
    return null;
  }
}
