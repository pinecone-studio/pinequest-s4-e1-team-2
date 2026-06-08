// server/tts-proxy.js — Azure TTS proxy
// GET /tts?text=...&voice=mn-MN-YesuiNeural&rate=1.0 -> audio/mpeg
//
// Ажиллуулах:  node tts-proxy.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const app = express();

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION || 'southeastasia';

// CORS — Expo web (localhost:8081)-с дуудахад шаардлагатай
app.use((_, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

app.get('/tts', async (req, res) => {
  const text = String(req.query.text || '');
  const voice = String(req.query.voice || 'mn-MN-YesuiNeural');
  const rate = String(req.query.rate || '1.0');
  if (!text) return res.status(400).send('text required');
  if (!KEY) return res.status(500).send('AZURE_SPEECH_KEY тохируулаагүй');

  const ssml =
    `<speak version="1.0" xml:lang="mn-MN">` +
    `<voice name="${voice}"><prosody rate="${rate}" pitch="-5%">${escapeXml(text)}</prosody></voice>` +
    `</speak>`;

  try {
    const r = await fetch(
      `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'smart-sight',
        },
        body: ssml,
      },
    );
    if (!r.ok) return res.status(502).send('Azure TTS алдаа: ' + r.status);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(500).send('алдаа: ' + e.message);
  }
});

app.listen(3000, () => console.log('Azure TTS proxy → http://localhost:3000/tts'));
