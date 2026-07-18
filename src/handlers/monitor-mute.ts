import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../store.js";

registerMainMenuItem({ label: "🔇 Mute", data: "monitor:mute", order: 16 });

const composer = new Composer<Ctx>();

composer.callbackQuery("monitor:mute", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chats = await store.getMonitoredChats();
  if (chats.length === 0) {
    await ctx.editMessageText(
      "Temporarily pause audio notifications for chat\n\nNo chats to mute. Add a chat first via 📡 Monitor.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const rows = chats.map((c) => {
    const label = c.muted ? `${c.label} (muted)` : `${c.label} (audio on)`;
    return [inlineButton(label, `monitor:mute-toggle:${c.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Temporarily pause audio notifications for chat", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^monitor:mute-toggle:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.match[1];
  const chat = await store.getMonitoredChat(chatId);
  if (!chat) {
    await ctx.reply("Chat not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  chat.muted = !chat.muted;
  await store.updateMonitoredChat(chat);
  const state = chat.muted ? "muted" : "unmuted";
  await store.logActivity(`${chat.label} ${state}`);
  await ctx.editMessageText(`Audio ${state} for "${chat.label}".`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
