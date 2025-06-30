import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveImage = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    pixelSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const imageId = await ctx.db.insert("images", {
      userId,
      originalImageId: args.storageId,
      filename: args.filename,
      pixelSize: args.pixelSize,
      status: "processing",
    });

    // Schedule pixel art conversion
    await ctx.scheduler.runAfter(0, api.pixelArt.convertToPixelArt, {
      imageId,
    });

    return imageId;
  },
});

export const updateImageStatus = mutation({
  args: {
    imageId: v.id("images"),
    pixelArtImageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("uploading"), v.literal("processing"), v.literal("completed"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.imageId, {
      pixelArtImageId: args.pixelArtImageId,
      status: args.status,
    });
  },
});

// New mutation to remove an image by id
export const removeImage = mutation({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }
    if (image.userId !== userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.imageId);
  },
});

export const getImage = query({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.imageId);
  },
});

export const listUserImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const images = await ctx.db
      .query("images")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      images.map(async (image) => ({
        ...image,
        originalUrl: await ctx.storage.getUrl(image.originalImageId),
        pixelArtUrl: image.pixelArtImageId
          ? await ctx.storage.getUrl(image.pixelArtImageId)
          : null,
      }))
    );
  },
});
