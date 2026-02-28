/**
 * Extract dominant colors from an image for dynamic gradient backgrounds.
 * Uses Canvas API - works with same-origin, data URLs, and CORS-enabled images.
 */
export function extractDominantColors(imageUrl, colorCount = 2) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        const colorBuckets = {};
        const bucketSize = 32;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a < 128) continue;
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 235) continue;

          const key = `${Math.floor(r / bucketSize) * bucketSize},${Math.floor(g / bucketSize) * bucketSize},${Math.floor(b / bucketSize) * bucketSize}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        const sorted = Object.entries(colorBuckets).sort(
          (a, b) => b[1] - a[1]
        );
        const colors = sorted.slice(0, colorCount).map(([key]) => {
          const [r, g, b] = key.split(",").map(Number);
          return { r, g, b };
        });

        if (colors.length === 0) {
          resolve(null);
          return;
        }

        resolve(colors);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/**
 * Convert RGB to hex and darken for use as background gradient (lighter = more visible)
 */
export function toDarkGradientColors(rgbColors) {
  if (!rgbColors?.length) return null;

  return rgbColors.map(({ r, g, b }) => {
    const factor = 0.45;
    const darkR = Math.round(r * factor);
    const darkG = Math.round(g * factor);
    const darkB = Math.round(b * factor);
    return `rgb(${darkR},${darkG},${darkB})`;
  });
}
