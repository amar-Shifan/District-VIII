import "server-only";

import mongoose from "mongoose";
import { serverEnv } from "./env";
import { ALL_MODELS } from "./models";

interface MongoCache {
  uri: string | null;
  promise: Promise<typeof mongoose> | null;
}

/** Survives hot reloads in dev and warm invocations on Vercel, so each instance connects once. */
const globalCache = globalThis as typeof globalThis & { __district8Mongo?: MongoCache };
const cache: MongoCache = (globalCache.__district8Mongo ??= { uri: null, promise: null });

async function connectAndPrepare(uri: string): Promise<typeof mongoose> {
  const connection = await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });
  // The double-booking guard is a unique index; make sure every index exists before serving.
  await Promise.all(ALL_MODELS.map((model) => model.init()));
  return connection;
}

/** Connects (once) to MONGODB_URI, or to `uri` when given (tests and the seed script). */
export async function connectDb(uri?: string): Promise<typeof mongoose> {
  const target = uri ?? serverEnv().mongodbUri;
  if (cache.promise && cache.uri === target) return cache.promise;
  if (cache.promise) await disconnectDb();
  cache.uri = target;
  cache.promise = connectAndPrepare(target).catch((error: unknown) => {
    cache.promise = null;
    cache.uri = null;
    throw error;
  });
  return cache.promise;
}

export async function disconnectDb(): Promise<void> {
  cache.promise = null;
  cache.uri = null;
  await mongoose.disconnect();
}
