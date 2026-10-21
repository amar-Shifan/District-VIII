import "server-only";

import { LiveStateModel } from "./models";

const LIVE_ID = "global";

/**
 * Live updates without sockets: every change bumps one counter; customer and
 * admin screens poll /api/live (a single tiny read) and refetch only when it moves.
 */
export async function bumpLive(): Promise<void> {
  await LiveStateModel.updateOne({ _id: LIVE_ID }, { $inc: { revision: 1 } }, { upsert: true }).exec();
}

export async function liveRevision(): Promise<number> {
  const state = await LiveStateModel.findById(LIVE_ID).lean().exec();
  return state?.revision ?? 0;
}
