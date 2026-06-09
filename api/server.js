const https = require('https');
const http = require('http');

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION || 'southeastasia';
const PORT = process.env.PORT || 3000;

if (!KEY) {
  console.error('AZURE_SPEECH_KEY environment variable is required');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/tts') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const text = url.searchParams.get('text') || '';
  const voice = url.searchParams.get('voice') || 'mn-MN-BataaNeural';
  const rate = parseFloat(url.searchParams.get('rate') || '1.0');

  if (!text) {
    res.writeHead(400);
    res.end('text param required');
    return;
  }

  const ratePercent = Math.round((rate - 1) * 100);
  const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

  const ssml = `<speak version='1.0' xml:lang='mn-MN'>
  <voice name='${voice}'>
    <prosody rate='${rateStr}'>${escapeXml(text)}</prosody>
  </voice>
</speak>`;

  const options = {
    hostname: `${REGION}.tts.speech.microsoft.com`,
    path: '/cognitiveservices/v1',
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'User-Agent': 'smartsight-tts-proxy',
    },
  };

  const azureReq = https.request(options, (azureRes) => {
    if (azureRes.statusCode !== 200) {
      let body = '';
      azureRes.on('data', (chunk) => { body += chunk; });
      azureRes.on('end', () => {
        console.error(`[TTS] Azure error ${azureRes.statusCode}: ${body}`);
        res.writeHead(502);
        res.end('Azure TTS error');
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
    });
    azureRes.pipe(res);
  });

  azureReq.on('error', (err) => {
    console.error('[TTS] Request error:', err.message);
    res.writeHead(500);
    res.end('Server error');
  });

  azureReq.write(ssml);
  azureReq.end();
});

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

server.listen(PORT, () => {
  console.log(`TTS proxy running on http://localhost:${PORT}/tts`);
  console.log(`Azure region: ${REGION}`);
});
