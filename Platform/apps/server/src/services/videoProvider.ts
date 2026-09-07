import Mux from "@mux/mux-node";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export interface VideoProvider {
  isConfigured: boolean;
  createUpload(passthrough?: string): Promise<{ uploadId: string; url: string }>;
  getAsset(assetId: string): Promise<{ playbackId: string; durationSec: number | null; status: string }>;
  deleteAsset(assetId: string): Promise<void>;
  signPlaybackUrl(playbackId: string, ttlSeconds?: number): Promise<string | null>;
  createLiveStream(passthrough?: string): Promise<{ streamId: string; streamKey: string; playbackId: string }>;
  getLiveStream(streamId: string): Promise<{ playbackId: string; status: string }>;
  endLiveStream(streamId: string): Promise<void>;
  deleteLiveStream(streamId: string): Promise<void>;
}

function devId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

class MuxProvider implements VideoProvider {
  readonly isConfigured = true;
  private mux: InstanceType<typeof Mux>;

  constructor() {
    this.mux = new Mux({
      tokenId: env.MUX_TOKEN_ID,
      tokenSecret: env.MUX_TOKEN_SECRET,
      jwtSigningKey: env.MUX_SIGNING_KEY || undefined,
      jwtPrivateKey: env.MUX_PRIVATE_KEY || undefined,
    });
  }

  async createUpload(passthrough?: string): Promise<{ uploadId: string; url: string }> {
    const upload = await this.mux.video.uploads.create({
      cors_origin: env.FRONTEND_URL,
      new_asset_settings: { playback_policy: ["signed"], passthrough },
    });
    return { uploadId: upload.id ?? "", url: upload.url ?? "" };
  }

  async getAsset(assetId: string) {
    const asset = await this.mux.video.assets.retrieve(assetId);
    return {
      playbackId: asset.playback_ids?.[0]?.id ?? "",
      durationSec: asset.duration ?? null,
      status: asset.status ?? "unknown",
    };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.mux.video.assets.delete(assetId);
  }

  async signPlaybackUrl(playbackId: string, ttlSeconds = 60): Promise<string | null> {
    try {
      return await this.mux.jwt.signPlaybackId(playbackId, {
        type: "video",
        expiration: `${ttlSeconds}s`,
      });
    } catch (err) {
      console.error("[mux] signPlaybackId failed:", err);
      return null;
    }
  }

  async createLiveStream(passthrough?: string) {
    const stream = await this.mux.video.liveStreams.create({
      playback_policy: ["signed"],
      new_asset_settings: { playback_policy: ["signed"], passthrough: "live-recording" },
      passthrough,
    });
    return {
      streamId: stream.id ?? "",
      streamKey: stream.stream_key ?? "",
      playbackId: stream.playback_ids?.[0]?.id ?? "",
    };
  }

  async getLiveStream(streamId: string) {
    const stream = await this.mux.video.liveStreams.retrieve(streamId);
    return {
      playbackId: stream.playback_ids?.[0]?.id ?? "",
      status: stream.status ?? "idle",
    };
  }

  async endLiveStream(streamId: string): Promise<void> {
    await this.mux.video.liveStreams.complete(streamId);
  }

  async deleteLiveStream(streamId: string): Promise<void> {
    await this.mux.video.liveStreams.delete(streamId);
  }
}

class NullProvider implements VideoProvider {
  readonly isConfigured = false;

  private guard(): never {
    throw new HttpError(500, "Video provider not configured", "MEDIA_UNAVAILABLE");
  }

  async createUpload() {
    if (env.NODE_ENV === "production") this.guard();
    const uploadId = devId("upload");
    return { uploadId, url: `https://example.invalid/upload/${uploadId}` };
  }
  async getAsset() {
    return { playbackId: devId("pb"), durationSec: 60, status: "ready" };
  }
  async deleteAsset() {
    void 0;
  }
  async signPlaybackUrl() {
    return null;
  }
  async createLiveStream() {
    if (env.NODE_ENV === "production") this.guard();
    return { streamId: devId("stream"), streamKey: devId("key"), playbackId: devId("pb") };
  }
  async getLiveStream() {
    return { playbackId: devId("pb"), status: "idle" };
  }
  async endLiveStream() {
    void 0;
  }
  async deleteLiveStream() {
    void 0;
  }
}

const isConfigured = (v: string): boolean => Boolean(v) && v !== "xxx" && !v.startsWith("rzp_test_");

export const videoProvider: VideoProvider =
  isConfigured(env.MUX_TOKEN_ID) && isConfigured(env.MUX_TOKEN_SECRET) ? new MuxProvider() : new NullProvider();
