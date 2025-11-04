import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/proxy', async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url);

    console.log("Fetching model from:", url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0', // Helps avoid CDN blocking
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Error fetching: ${response.statusText}`);
    }

    // Pass through content type (important for .glb files)
    res.setHeader("Content-Type", response.headers.get("content-type") || "model/gltf-binary");

    // Stream back as binary
    response.body.pipe(res);

  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Proxy running on http://localhost:${PORT}`));
