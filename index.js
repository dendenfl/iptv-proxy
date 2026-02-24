// index.js - proxy melhorado
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Proxy de stream com logging e suporte a Range
app.get('/stream', async (req, res) => {
  const streamUrl = req.query.url;
  if (!streamUrl) return res.status(400).send('URL is required');

  console.log(`[Proxy] requested -> ${streamUrl}`);
  const clientRange = req.headers.range || null;

  try {
    const parsed = new URL(streamUrl);
    // Monta headers para parecer um player legítimo
    const upstreamHeaders = {
      'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12',
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'Host': parsed.host,
    };
    if (clientRange) upstreamHeaders.Range = clientRange;

    const upstreamResp = await axios({
      method: 'get',
      url: streamUrl,
      responseType: 'stream',
      headers: upstreamHeaders,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: null // vamos tratar status manualmente
    });

    console.log(`[Proxy] upstream status: ${upstreamResp.status} ${upstreamResp.statusText}`);

    // Se upstream não retornou 2xx/206, repassar status e mensagem
    if (!(upstreamResp.status >= 200 && upstreamResp.status < 300) && upstreamResp.status !== 206) {
      // Lê um pouco da stream para ajudar debugar (opcional)
      // Notar: não tentamos pipear em 4xx/5xx — retornamos erro pro cliente
      const msg = `Upstream returned ${upstreamResp.status}`;
      console.error(`[Proxy] ${msg}`);
      res.status(upstreamResp.status).send(msg);
      return;
    }

    // Repassa headers importantes
    const contentType = upstreamResp.headers['content-type'] || 'video/mp2t';
    const contentLength = upstreamResp.headers['content-length'];
    const acceptRanges = upstreamResp.headers['accept-ranges'] || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', acceptRanges);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (upstreamResp.status === 206) {
      res.status(206);
    } else {
      res.status(200);
    }

    // Pipeia o stream
    upstreamResp.data.pipe(res);

    req.on('close', () => {
      try {
        if (upstreamResp.data) {
          upstreamResp.data.destroy();
        }
      } catch (e) {}
    });

  } catch (err) {
    console.error('[Proxy] erro intern:', err.message || err);
    // detalhar mais no log original do Render
    res.status(500).send('Error fetching stream: ' + (err.message || 'unknown'));
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy rodando na porta ${PORT}`));
