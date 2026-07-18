import { createRequire } from "node:module";
import type { RedisLike } from "./toolkit/session/redis.js";

// Persistent store for durable domain data (monitored chats, settings,
// activity log). Uses Redis when REDIS_URL is set, falls back to in-memory
// for the test harness. Never uses keyspace scans — maintains explicit
// index records for all collection access.

export interface MonitoredChat {
  id: string;
  label: string;
  enabled: boolean;
  muted: boolean;
  addedAt: number;
  lastMessageAt: number | null;
}

export interface VoiceSettings {
  gender: "male" | "female" | "neutral";
  speed: "slow" | "normal" | "fast";
}

export interface ActivityEntry {
  timestamp: number;
  message: string;
}

export interface OwnerSettings {
  voice: VoiceSettings;
}

const DEFAULT_OWNER_SETTINGS: OwnerSettings = {
  voice: { gender: "neutral", speed: "normal" },
};

class PersistentStore {
  private ownerSettings: OwnerSettings = { ...DEFAULT_OWNER_SETTINGS };
  private monitoredChats = new Map<string, MonitoredChat>();
  private chatIndex: string[] = [];
  private activityLog: ActivityEntry[] = [];
  private redis: RedisLike | null = null;
  private readonly MAX_LOG = 50;

  setRedis(redis: RedisLike): void {
    this.redis = redis;
  }

  // --- Owner settings ---

  async getOwnerSettings(): Promise<OwnerSettings> {
    if (this.redis) {
      const raw = await this.redis.get("owner:settings");
      if (raw) {
        try { return JSON.parse(raw) as OwnerSettings; } catch { /* fall through */ }
      }
    }
    return { ...this.ownerSettings };
  }

  async setOwnerSettings(settings: OwnerSettings): Promise<void> {
    this.ownerSettings = settings;
    if (this.redis) {
      await this.redis.set("owner:settings", JSON.stringify(settings));
    }
  }

  // --- Monitored chats (index-based, no keyspace scans) ---

  async getMonitoredChats(): Promise<MonitoredChat[]> {
    if (this.redis) {
      const indexRaw = await this.redis.get("monitor:index");
      const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      const chats: MonitoredChat[] = [];
      for (const id of ids) {
        const raw = await this.redis.get(`monitor:chat:${id}`);
        if (raw) {
          try { chats.push(JSON.parse(raw) as MonitoredChat); } catch { /* skip corrupt */ }
        }
      }
      return chats;
    }
    return this.chatIndex.map((id) => this.monitoredChats.get(id)!).filter(Boolean);
  }

  async addMonitoredChat(chat: MonitoredChat): Promise<void> {
    this.monitoredChats.set(chat.id, chat);
    if (!this.chatIndex.includes(chat.id)) this.chatIndex.push(chat.id);
    if (this.redis) {
      await this.redis.set(`monitor:chat:${chat.id}`, JSON.stringify(chat));
      await this.redis.set("monitor:index", JSON.stringify(this.chatIndex));
    }
  }

  async removeMonitoredChat(chatId: string): Promise<boolean> {
    this.monitoredChats.delete(chatId);
    this.chatIndex = this.chatIndex.filter((id) => id !== chatId);
    if (this.redis) {
      await this.redis.del(`monitor:chat:${chatId}`);
      await this.redis.set("monitor:index", JSON.stringify(this.chatIndex));
    }
    return true;
  }

  async getMonitoredChat(chatId: string): Promise<MonitoredChat | null> {
    if (this.redis) {
      const raw = await this.redis.get(`monitor:chat:${chatId}`);
      if (raw) {
        try { return JSON.parse(raw) as MonitoredChat; } catch { return null; }
      }
      return null;
    }
    return this.monitoredChats.get(chatId) ?? null;
  }

  async updateMonitoredChat(chat: MonitoredChat): Promise<void> {
    this.monitoredChats.set(chat.id, chat);
    if (this.redis) {
      await this.redis.set(`monitor:chat:${chat.id}`, JSON.stringify(chat));
    }
  }

  // --- Activity log ---

  async logActivity(message: string): Promise<void> {
    const entry: ActivityEntry = { timestamp: Date.now(), message };
    this.activityLog.unshift(entry);
    if (this.activityLog.length > this.MAX_LOG) {
      this.activityLog = this.activityLog.slice(0, this.MAX_LOG);
    }
    if (this.redis) {
      await this.redis.set("activity:log", JSON.stringify(this.activityLog));
    }
  }

  async getActivityLog(limit = 5): Promise<ActivityEntry[]> {
    if (this.redis) {
      const raw = await this.redis.get("activity:log");
      if (raw) {
        try {
          const log = JSON.parse(raw) as ActivityEntry[];
          return log.slice(0, limit);
        } catch { /* fall through */ }
      }
    }
    return this.activityLog.slice(0, limit);
  }
}

// Singleton — shared across the process, which is fine for a single-owner bot.
// The test harness gets a fresh bot per spec, but the store's in-memory state
// is acceptable for testing (durable data is persisted via Redis in production).
export const store = new PersistentStore();

/**
 * Initialise the store's Redis connection from env. Call once at startup.
 * In-memory fallback is used when REDIS_URL is not set (dev / test harness).
 */
export function initStore(env: NodeJS.ProcessEnv = process.env): void {
  const url = env.REDIS_URL;
  if (!url) return;
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ioredis: any = require("ioredis");
  const Redis = ioredis.default ?? ioredis.Redis ?? ioredis;
  const client = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
  store.setRedis(client as RedisLike);
}
