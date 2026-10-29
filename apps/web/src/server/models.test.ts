import mongoose, { Schema } from "mongoose";
import { afterEach, describe, expect, it } from "vitest";
import { defineModel } from "./models";

const MODEL_NAME = "HotReloadSchemaRegression";

afterEach(() => {
  mongoose.deleteModel(MODEL_NAME);
});

describe("Mongoose model hot reload", () => {
  it("recompiles a cached model when source schema paths add fields", () => {
    mongoose.model(MODEL_NAME, new Schema({ key: { type: String } }));

    const refreshed = defineModel(
      MODEL_NAME,
      new Schema({ key: { type: String }, ps5PricePerHour: { type: Number, default: null } }),
    );

    expect(refreshed.schema.path("ps5PricePerHour")).toBeDefined();
  });
});
