const express = require('express');
const axios = require('axios');
const app = express();

app.get('/stream', async (req, res) => {
  const streamUrl = req.query.url;
  if (!streamUrl) return res.status(400).send('URL is required');

  try {
    const response = await axios({
      method: 'get',
      url: streamUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12', // Identidade que o IPTV aceita
        'Icy-MetaData': '1'
      },
      timeout: 20000
    });

    // Repassa o tipo de conteúdo original (video/mp2t ou video/mp4)
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Libera o CORS para a TV
    
    response.data.pipe(res);

    // Se a conexão com o app cair, fecha a conexão com o servidor IPTV
    req.on('close', () => {
      response.data.destroy();
    });

  } catch (e) {
    console.error('Erro no Proxy:', e.message);
    res.status(500).send('Error fetching stream');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy rodando na porta ${PORT}`));
