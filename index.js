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
        'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      timeout: 30000
    });

    // Repassa os headers para a TV não reclamar de CORS
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    response.data.pipe(res);

    req.on('close', () => {
      if (response.data) response.data.destroy();
    });

  } catch (e) {
    // Se der erro, envia um log detalhado para o Render
    console.error('ERRO NO PROXY:', e.message);
    res.status(200).send('Erro, mas enviando 200 para não travar o player'); 
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor ON na porta ${PORT}`));
