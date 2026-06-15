import * as ImageManipulator from "expo-image-manipulator";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Чанарыг эрхэмлэж gpt-4o (монгол кириллийг хамгийн сайн уншина).
const MODEL = "gpt-4o";

const PROMPT =
  "You are helping a blind person understand the text in a photo taken with a phone. " +
  "Read the meaningful, useful text and convey it clearly so they understand what is written. " +
  "Adapt to the content:\n" +
  "- A menu, list, table or price list: read the actual items with their key details such as names and prices; do not skip items just because there are many.\n" +
  "- A sign, notice, label or package: read the whole message.\n" +
  "- A long document, article or book page: read the content, but if it is long, faithfully summarise it into its key points and main meaning instead of reading every single word.\n" +
  "Preserve the exact wording for names, numbers, prices and short labels. " +
  "Organise the result naturally so it is easy to listen to, and keep it reasonably concise — " +
  "when there is a lot of text, condense it to the important information and main meaning while never dropping key content. " +
  "Ignore only genuine noise: watermarks, logos, page numbers, decorative text and unrelated background. " +
  "Reply in Mongolian Cyrillic. If there is no readable text at all, reply with the single word: none. " +
  "Reply with only the result, no quotes and no explanation.";

/** Зургаас гол текстийг уншиж монголоор буцаана (текст алга бол null). */
export async function detectTextViaOpenAI(uri: string): Promise<string | null> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key || !uri) return null;
  try {
    // Текст нягт/жижиг тул нарийвчлал хадгалж 1024px болгоно (чанар > хэмнэлт)
    const img = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { base64: true, compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
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
        max_tokens: 700,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                // detail: "high" — жижиг үсгийг тодорхой уншихад чухал
                image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: "high" },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const text: string = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!text || /^none\.?$/i.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}
