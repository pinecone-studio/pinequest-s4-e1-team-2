import * as ImageManipulator from "expo-image-manipulator";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Хамгийн хямд, vision дэмждэг загвар. Илүү нарийвчлал хэрэгтэй бол "gpt-4o" болго.
const MODEL = "gpt-4o-mini";
const KNOWN_DENOMINATIONS = new Set([50, 100, 500, 1000, 5000, 10000, 20000]);

const PROMPT =
  "This image may show a Mongolian banknote (tögrög). " +
  "Mongolian banknote denominations are: 50, 100, 500, 1000, 5000, 10000, 20000. " +
  "Read the large denomination number printed on the banknote. " +
  "Reply with ONLY that number (for example 10000) if a banknote is clearly visible. " +
  "If no banknote is visible or you are unsure, reply 'none'. " +
  "Reply with just the number or 'none', nothing else.";

export async function detectMoneyViaOpenAI(uri: string): Promise<number | null> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key || !uri) return null;
  try {
    // Зардал хэмнэх — зургийг 512px болгож сжимаад base64 авна
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
                // detail: "low" — тогтмол бага токен (хамгийн хямд)
                image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: "low" },
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
    const value = parseInt(match[0], 10);
    return KNOWN_DENOMINATIONS.has(value) ? value : null;
  } catch {
    return null;
  }
}
