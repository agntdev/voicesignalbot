import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../store.js";

registerMainMenuItem({ label: "📡 Monitor", data: "monitor:list", order: 10 });

const composer = new Composer<Ctx>();

function chatListKeyboard() {
  return inlineKeyboard([
    [inlineButton("➕ Add chat", "monitor:add")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

function formatChatList(chats: { enabled: boolean; muted: boolean; label: string }[]): string {
  if (chats.length === 0) return "";
  return chats.map((c) => {
    const status = c.enabled ? (c.muted ? "🔇 Muted" : "🟢 Active") : "🔴 Disabled";
    return `${status} — ${c.label}`;
  }).join("\n");
}

composer.command("monitor", async (ctx) => {
  const chats = await store.getMonitoredChats();
  if (chats.length === 0) {
    await ctx.reply(
      "Manage monitored chat list (add/remove/enable/disable)\n\nNo chats monitored yet. Tap ➕ Add to start.",
      { reply_markup: chatListKeyboard() },
    );
    return;
  }
  await ctx.reply(
    "Manage monitored chat list (add/remove/enable/disable)\n\n" + formatChatList(chats),
    { reply_markup: chatListKeyboard() },
  );
});

composer.callbackQuery("monitor:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chats = await store.getMonitoredChats();
  if (chats.length === 0) {
    await ctx.editMessageText(
      "Manage monitored chat list (add/remove/enable/disable)\n\nNo chats monitored yet. Tap ➕ Add to start.",
      { reply_markup: chatListKeyboard() },
    );
    return;
  }
  await ctx.editMessageText(
    "Manage monitored chat list (add/remove/enable/disable)\n\n" + formatChatList(chats),
    { reply_markup: chatListKeyboard() },
  );
});

composer.callbackQuery("monitor:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_chat_id";
  await ctx.editMessageText(
    "Send the chat ID or invite link for the channel or group you want to monitor.",
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "monitor:list")]]) },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_chat_id") return next();
  const input = ctx.message.text.trim();
  ctx.session.step = "idle";

  const chatId = input.replace(/^https?:\/\//, "").replace(/.*\+/, "+");
  const existing = await store.getMonitoredChat(chatId);
  if (existing) {
    await ctx.reply("That chat is already being monitored.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to list", "monitor:list")]]),
    });
    return;
  }

  const label = input.length > 40 ? input.slice(0, 37) + "..." : input;
  await store.addMonitoredChat({
    id: chatId,
    label,
    enabled: true,
    muted: false,
    addedAt: Date.now(),
    lastMessageAt: null,
  });
  await store.logActivity(`Added chat: ${label}`);
  await ctx.reply(`Added "${label}" to monitored chats.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to list", "monitor:list")]]),
  });
});

composer.callbackQuery(/^monitor:remove:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.match[1];
  const chat = await store.getMonitoredChat(chatId);
  if (!chat) {
    await ctx.reply("Chat not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to list", "monitor:list")]]),
    });
    return;
  }
  await store.removeMonitoredChat(chatId);
  await store.logActivity(`Removed chat: ${chat.label}`);
  await ctx.reply(`Removed "${chat.label}" from monitored chats.`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to list", "monitor:list")]]),
  });
});

export default composer;
