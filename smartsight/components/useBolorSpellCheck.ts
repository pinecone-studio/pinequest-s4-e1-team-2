/**
 * useBolorSpellCheck
 *
 * Calls the Bolor API (api.bolor.net/v1.2/spell-check) and returns
 * a list of misspelled Mongolian words found in the input text.
 *
 * API contract (mirrors the Go original):
 *   POST https://api.bolor.net/v1.2/spell-check
 *   Headers: Content-Type: text/plain, token: <your_token>
 *   Body:    raw UTF-8 text
 *   Response: JSON string array of incorrect words, e.g. ["алдаатаай", "бичвэрр"]
 */

import { useState, useCallback } from "react";

const BOLOR_SPELL_URL = "https://api.bolor.net/v1.2/spell-check";

// Put your token in app.config.js / .env and import via expo-constants.
// Never hardcode it here — this file will be in git.
const BOLOR_TOKEN = process.env.EXPO_PUBLIC_BOLOR_TOKEN ?? "";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpellCheckResult {
  incorrectWords: string[]; // words the API flagged as wrong
  correctedText: string; // original text with flagged words wrapped in [[ ]]
  // useful for TTS — read it out to the user
}

interface SpellCheckState {
  result: SpellCheckResult | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBolorSpellCheck() {
  const [state, setState] = useState<SpellCheckState>({
    result: null,
    isLoading: false,
    error: null,
  });

  const checkSpelling = useCallback(
    async (text: string): Promise<SpellCheckResult | null> => {
      if (!text.trim()) return null;

      setState({ result: null, isLoading: true, error: null });

      try {
        // ── The actual fetch — direct translation of the Go http.Client call ──
        //
        // Go:  bytes.NewBuffer(data)  →  JS: body: text  (raw string, not JSON)
        // Go:  req.Header.Set(...)    →  JS: headers: { ... }
        // Go:  json.Decode(&incorrects) → JS: resp.json() which gives string[]
        //
        const response = await fetch(BOLOR_SPELL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain", // tells the API: body is raw text, not JSON
            token: BOLOR_TOKEN,
          },
          body: text, // raw UTF-8, exactly like bytes.NewBuffer(data)
        });

        if (!response.ok) {
          // HTTP errors (401 bad token, 429 rate limit, 500 server) come through here
          throw new Error(
            `Bolor API error: ${response.status} ${response.statusText}`,
          );
        }

        // The Go code decodes into []string — same thing here
        const incorrectWords: string[] = await response.json();

        // Build a human-readable corrected text by wrapping each flagged word.
        // This is extra vs. the Go original but useful for Smart Sight's TTS.
        const correctedText = highlightErrors(text, incorrectWords);

        const result: SpellCheckResult = { incorrectWords, correctedText };
        setState({ result, isLoading: false, error: null });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ result: null, isLoading: false, error: message });
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ result: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    checkSpelling,
    reset,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wraps each misspelled word in [[double brackets]] so TTS can
 * signal errors audibly, e.g. "Энд [[алдаатаай]] бичвэрр байна."
 *
 * Uses word-boundary aware replacement so "алдаа" inside "алдаатаай"
 * doesn't get replaced by accident.
 *
 * NOTE: Mongolian Cyrillic doesn't have \b word boundaries in JS regex,
 * so we split on whitespace + punctuation instead.
 */
function highlightErrors(text: string, incorrectWords: string[]): string {
  if (!incorrectWords.length) return text;

  // Build a set for O(1) lookup
  const errorSet = new Set(incorrectWords);

  // Split on spaces/punctuation while keeping the delimiters (lookahead/behind)
  // so we can rejoin perfectly
  return text
    .split(/(\s+|[.,!?;:'"()[\]{}«»—–])/)
    .map((token) => (errorSet.has(token) ? `[[${token}]]` : token))
    .join("");
}
