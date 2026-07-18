import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../store.js";

registerMainMenuItem({ label: "📊 Status", data: "status:show", order: 40 });

const composer = new Composer<Ctx>();

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function buildStatusText(chats: { enabled: boolean; muted: boolean; label: string }[], log: { timestamp: number; message: string }[], settings: { voice: { gender: string; speed: string } }): string {
  const lines: string[] = [];
  lines.push("Show current monitoring status and recent activity log\n");

  if (chats.length === 0) {
    lines.push("No chats monitored yet.");
  } else {
    for (const c of chats) {
      const status = c.enabled ? (c.muted ? "🔇 Muted" : "🟢 Active") : "🔴 Disabled";
      lines.push(`${status} — ${c.label}`);
    }
  }

  lines.push("");
  lines.push(`Voice: ${settings.voice.gender}, ${settings.voice.speed}`);

  if (log.length > 0) {
    lines.push("");
    lines.push("Recent activity:");
    for (const entry of log) {
      lines.push(`• ${entry.message} (${formatTime(entry.timestamp)})`);
    }
  }

  return lines.join("\n");
}

composer.command("status", async (ctx) => {
  const chats = await store.getMonitoredChats();
  const log = await store.getActivityLog(5);
  const settings = await store.getOwnerSettings();
  await ctx.reply(buildStatusText(chats, log, settings), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery("status:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chats = await store.getMonitoredChats();
  const log = await store.getActivityLog(5);
  const settings = await store.getOwnerSettings();
  await ctx.editMessageText(buildStatusText(chats, log, settings), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
