import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { env } from "../config/env.js";

const webhookBodySchema = z.object({
  type: z.string(),
  data: z.any(),
});

const rawBody = (buf: Buffer) => buf;

/**
 * Mux webhook handler (route /api/v1/webhooks/mux, raw body).
 * Handles asset ready / live stream idle events to move media through
 * the processing pipeline and sync playback IDs.
 */
export async function handleMuxWebhook(raw: Buffer, signature: string): Promise<{ received: boolean; ignored: boolean }> {
  const expected = crypto.createHmac("sha256", env.MUX_WEBHOOK_SECRET).update(raw).digest("hex");

  const receivedSig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const ok = receivedSig.length === expected.length && receivedSig === expected;

  if (!ok) {
    throw new Error("Invalid Mux webhook signature");
  }

  const parsed = webhookBodySchema.safeParse(JSON.parse(raw.toString("utf8")));
  if (!parsed.success) {
    return { received: true, ignored: true };
  }

  const { type, data } = parsed.data;

  switch (type) {
    case "video.asset.ready": {
      const assetId = data.id as string;
      await prisma.video
        .updateMany({
          where: { muxAssetId: assetId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            muxPlaybackId: (data.playback_ids?.[0]?.id as string) ?? undefined,
            durationSec: data.duration ? Math.round(data.duration) : undefined,
            thumbnailUrl: `https://image.mux.com/${(data.playback_ids?.[0]?.id as string) ?? ""}/thumbnail.jpg`,
          },
        })
        .catch(() => undefined);
      return { received: true, ignored: false };
    }
    case "video.live_stream.idle": {
      const streamId = data.id as string;
      // Stream ended; Mux auto-records an asset if new_asset_settings were set.
      const recordingAssetId = data.asset?.id as string | undefined;
      const stream = await prisma.liveStream.findUnique({ where: { muxStreamId: streamId } });
      if (stream && stream.status !== "ENDED") {
        await prisma.liveStream.update({
          where: { id: stream.id },
          data: {
            status: "ENDED",
            actualEndAt: new Date(),
            recordingAssetId: recordingAssetId ?? stream.recordingAssetId,
          },
        });
      }
      return { received: true, ignored: false };
    }
    default:
      return { received: true, ignored: true };
  }
}
