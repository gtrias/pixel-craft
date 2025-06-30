import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  images: defineTable({
    userId: v.id("users"),
    originalImageId: v.id("_storage"),
    pixelArtImageId: v.optional(v.id("_storage")),
    filename: v.string(),
    pixelSize: v.number(),
    status: v.union(v.literal("uploading"), v.literal("processing"), v.literal("completed"), v.literal("error")),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
