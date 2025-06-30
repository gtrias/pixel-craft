"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import sharp from "sharp";

// Helper for color distance squared (faster than sqrt)
function colorDistanceSq(c1: number[], c2: number[]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return dr * dr + dg * dg + db * db;
}

// Helper for vector dot product
function dot(v1: number[], v2: number[]): number {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

// Helper to subtract vectors
function sub(v1: number[], v2: number[]): number[] {
  return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

// PICO-8 color palette
const PICO8_PALETTE = [
  [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
  [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
  [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
  [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]
];

// Joel Yliluoma's 8x8 threshold map for positional dithering
const DITHER_MATRIX = [
  [ 0, 48, 12, 60,  3, 51, 15, 63 ],
  [ 32, 16, 44, 28, 35, 19, 47, 31 ],
  [ 8, 56,  4, 52, 11, 59,  7, 55 ],
  [ 40, 24, 36, 20, 43, 27, 39, 23 ],
  [ 2, 50, 14, 62,  1, 49, 13, 61 ],
  [ 34, 18, 46, 30, 33, 17, 45, 29 ],
  [ 10, 58,  6, 54,  9, 57,  5, 53 ],
  [ 42, 26, 38, 22, 41, 25, 37, 21 ]
];

async function processImageToPixelArt(imageBuffer: ArrayBuffer, pixelSize: number): Promise<ArrayBuffer> {
  const originalImage = sharp(Buffer.from(imageBuffer));
  const metadata = await originalImage.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error("Could not get image dimensions");
  }

  const smallWidth = Math.floor(width / pixelSize);
  const smallHeight = Math.floor(height / pixelSize);

  const smallImageBuffer = await originalImage
    .resize(smallWidth, smallHeight)
    .raw()
    .toBuffer();

  const outputBuffer = Buffer.alloc(smallWidth * smallHeight * 3);

  for (let y = 0; y < smallHeight; y++) {
    for (let x = 0; x < smallWidth; x++) {
      const i = (y * smallWidth + x) * 3;
      const srcColor = [smallImageBuffer[i], smallImageBuffer[i+1], smallImageBuffer[i+2]];

      // Find two closest colors from the palette
      let c1_idx = -1, c2_idx = -1;
      let dist1 = Infinity, dist2 = Infinity;

      for (let j = 0; j < PICO8_PALETTE.length; j++) {
        const dist = colorDistanceSq(srcColor, PICO8_PALETTE[j]);
        if (dist < dist1) {
          dist2 = dist1;
          c2_idx = c1_idx;
          dist1 = dist;
          c1_idx = j;
        } else if (dist < dist2) {
          dist2 = dist;
          c2_idx = j;
        }
      }
      
      const c1 = PICO8_PALETTE[c1_idx];
      const c2 = (c2_idx !== -1) ? PICO8_PALETTE[c2_idx] : c1;

      // Calculate ideal mixing ratio 't'
      const v_c2_c1 = sub(c2, c1);
      const v_src_c1 = sub(srcColor, c1);
      const dot_c2c1_c2c1 = dot(v_c2_c1, v_c2_c1);
      
      let t = 0;
      if (dot_c2c1_c2c1 > 0) {
        t = dot(v_src_c1, v_c2_c1) / dot_c2c1_c2c1;
      }
      t = Math.max(0, Math.min(1, t));

      // Compare with threshold from dither matrix
      const threshold = DITHER_MATRIX[y % 8][x % 8] / 64.0;
      const finalColor = (t < threshold) ? c1 : c2;

      outputBuffer[i] = finalColor[0];
      outputBuffer[i+1] = finalColor[1];
      outputBuffer[i+2] = finalColor[2];
    }
  }

  // Create final image: upscale the small dithered image with nearest-neighbor interpolation
  const finalImageBuffer = await sharp(outputBuffer, { raw: { width: smallWidth, height: smallHeight, channels: 3 } })
    .resize(width, height, { kernel: 'nearest' })
    .png()
    .toBuffer();

  return finalImageBuffer.buffer;
}

export const convertToPixelArt = action({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.runQuery(api.images.getImage, {
      imageId: args.imageId,
    });

    if (!image) {
      throw new Error("Image not found");
    }

    try {
      const imageUrl = await ctx.storage.getUrl(image.originalImageId);
      if (!imageUrl) {
        throw new Error("Could not get image URL");
      }

      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();

      const pixelArtBuffer = await processImageToPixelArt(imageBuffer, image.pixelSize);

      const pixelArtBlob = new Blob([pixelArtBuffer], { type: "image/png" });
      const pixelArtStorageId = await ctx.storage.store(pixelArtBlob);

      await ctx.runMutation(api.images.updateImageStatus, {
        imageId: args.imageId,
        pixelArtImageId: pixelArtStorageId,
        status: "completed",
      });
    } catch (error) {
      console.error("Error converting to pixel art:", error);
      await ctx.runMutation(api.images.updateImageStatus, {
        imageId: args.imageId,
        status: "error",
      });
    }
  },
});
