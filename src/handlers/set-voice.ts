import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { store, type VoiceSettings } from "../store.js";

registerMainMenuItem({ label: "🎙 Voice", data: "voice:settings", order: 30 });

const composer = new Composer<Ctx>();

const GENDER_OPTIONS: { label: string; value: VoiceSettings["gender"] }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Neutral", value: "neutral" },
];

const SPEED_OPTIONS: { label: string; value: VoiceSettings["speed"] }[] = [
  { label: "Slow", value: "slow" },
  { label: "Normal", value: "normal" },
  { label: "Fast", value: "fast" },
];

function voiceMenuKeyboard() {
  return inlineKeyboard([
    [inlineButton("Change voice", "voice:gender")],
    [inlineButton("Change speed", "voice:speed")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

function genderKeyboard() {
  const rows = GENDER_OPTIONS.map((opt) => [
    inlineButton(opt.label, `voice:set:gender:${opt.value}`),
  ]);
  rows.push([inlineButton("⬅️ Back", "voice:settings")]);
  return inlineKeyboard(rows);
}

function speedKeyboard() {
  const rows = SPEED_OPTIONS.map((opt) => [
    inlineButton(opt.label, `voice:set:speed:${opt.value}`),
  ]);
  rows.push([inlineButton("⬅️ Back", "voice:settings")]);
  return inlineKeyboard(rows);
}

composer.command("set_voice", async (ctx) => {
  const settings = await store.getOwnerSettings();
  await ctx.reply(
    "Configure TTS voice profile (gender/speed)\n\n" +
    `Gender: ${settings.voice.gender}\nSpeed: ${settings.voice.speed}`,
    { reply_markup: voiceMenuKeyboard() },
  );
});

composer.callbackQuery("voice:settings", async (ctx) => {
  await ctx.answerCallbackQuery();
  const settings = await store.getOwnerSettings();
  await ctx.editMessageText(
    "Configure TTS voice profile (gender/speed)\n\n" +
    `Gender: ${settings.voice.gender}\nSpeed: ${settings.voice.speed}`,
    { reply_markup: voiceMenuKeyboard() },
  );
});

composer.callbackQuery("voice:gender", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Pick a voice gender:", { reply_markup: genderKeyboard() });
});

composer.callbackQuery("voice:speed", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Pick a speech speed:", { reply_markup: speedKeyboard() });
});

composer.callbackQuery(/^voice:set:gender:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const gender = ctx.match[1] as VoiceSettings["gender"];
  const settings = await store.getOwnerSettings();
  settings.voice.gender = gender;
  await store.setOwnerSettings(settings);
  await store.logActivity(`Voice gender set to ${gender}`);
  await ctx.editMessageText(
    "Configure TTS voice profile (gender/speed)\n\n" +
    `Gender: ${settings.voice.gender}\nSpeed: ${settings.voice.speed}`,
    { reply_markup: voiceMenuKeyboard() },
  );
});

composer.callbackQuery(/^voice:set:speed:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const speed = ctx.match[1] as VoiceSettings["speed"];
  const settings = await store.getOwnerSettings();
  settings.voice.speed = speed;
  await store.setOwnerSettings(settings);
  await store.logActivity(`Voice speed set to ${speed}`);
  await ctx.editMessageText(
    "Configure TTS voice profile (gender/speed)\n\n" +
    `Gender: ${settings.voice.gender}\nSpeed: ${settings.voice.speed}`,
    { reply_markup: voiceMenuKeyboard() },
  );
});

export default composer;
