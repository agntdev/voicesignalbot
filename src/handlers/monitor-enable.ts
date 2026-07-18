import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store } from "../store.js";

registerMainMenuItem({ label: "🟢 Enable", data: "monitor:enable", order: 15 });

const composer = new Composer<Ctx>();

composer.callbackQuery("monitor:enable", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chats = await store.getMonitoredChats();
  if (chats.length === 0) {
    await ctx.editMessageText(
      "Toggle monitoring for selected chat\n\nNo chats to enable. Add a chat first via 📡 Monitor.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const rows = chats.map((c) => {
    const label = c.enabled ? `${c.label} (on)` : `${c.label} (off)`;
    return [inlineButton(label, `monitor:toggle:${c.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Toggle monitoring for selected chat", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^monitor:toggle:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.match[1];
  const chat = await store.getMonitoredChat(chatId);
  if (!chat) {
    await ctx.reply("Chat not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  chat.enabled = !chat.enabled;
  await store.updateMonitoredChat(chat);
  const state = chat.enabled ? "enabled" : "disabled";
  await store.logActivity(`${chat.label} ${state}`);
  await ctx.editMessageText(`Monitoring ${state} for "${chat.label}".`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
