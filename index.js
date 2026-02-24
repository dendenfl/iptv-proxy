const express = require('express');
const axios = require('axios');
const app = express();

app.get('/stream', async (req, res) => {
  const streamUrl = req.query.url;
  if (!streamUrl) return res.status(400).send('URL is required');

  try {
    // Extrair o host da URL original para enganar o servidor IPTV
    const parsedUrl = new URL(streamUrl);

    const response = await axios({
      method: 'get',
      url: streamUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12',
        'Host': parsedUrl.host,
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      timeout: 30000 // Aumentamos para 30s porque o Render é lento
    });

    // Headers essenciais para o Chromecast não rejeitar
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    
    response.data.pipe(res);

    req.on('close', () => {
      if (response.data) response.data.destroy();
    });

  } catch (e) {
    console.error('Erro:', e.message);
    res.status(500).send('Erro ao buscar stream: ' + e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy ON na porta ${PORT}`));
