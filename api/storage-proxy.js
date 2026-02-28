/**
 * Vercel serverless function to proxy Firebase Storage requests.
 * Bypasses CORS by fetching on the server (no cross-origin from client).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const url = req.query.url;
  if (!url || !url.startsWith("https://firebasestorage.googleapis.com/")) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Beatify/1.0",
      },
    });

    if (!response.ok) {
      res.status(response.status).end();
      return;
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Storage proxy error:", error);
    res.status(502).json({ error: "Proxy failed" });
  }
}
