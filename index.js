const { Telegraf } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

// === CONFIG ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = 123456789; // <-- you chat ID
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "llama3";
const UPDATE_INTERVAL_MS = 500; // update Telegram interval

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const sessions = new Map();

bot.start((ctx) => {
  if (ctx.chat.id !== ALLOWED_CHAT_ID) return;
  sessions.set(ctx.chat.id, []);
  ctx.reply("🔄 Chat riavviata. Scrivimi qualcosa!");
});

bot.on("text", async (ctx) => {
  if (ctx.chat.id !== ALLOWED_CHAT_ID) return;

  const chatId = ctx.chat.id;
  if (!sessions.has(chatId)) sessions.set(chatId, []);

  const history = sessions.get(chatId);
  const userMessage = ctx.message.text;
  history.push({ role: "user", content: userMessage });

  const sent = await ctx.reply("💬 ...");
  let botReply = "";
  let buffer = "";
  let lastUpdateTime = 0;

  try {
    const response = await axios.post(
      OLLAMA_URL,
      {
        model: MODEL,
        messages: history,
        stream: true,
      },
      {
        responseType: "stream",
      }
    );

    response.data.on("data", async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const jsonLine = JSON.parse(line.replace(/^data: /, ""));
          if (jsonLine.done) return;

          botReply += jsonLine.message.content;

          // Limita gli aggiornamenti a ogni intervallo definito
          const now = Date.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL_MS) {
            lastUpdateTime = now;
            await ctx.telegram.editMessageText(
              chatId,
              sent.message_id,
              null,
              botReply
            );
          }
        } catch (err) {
          console.error("Errore parsing stream:", err.message);
        }
      }
    });

    response.data.on("end", async () => {
      // Aggiorna risposta finale
      await ctx.telegram.editMessageText(
        chatId,
        sent.message_id,
        null,
        botReply
      );
      history.push({ role: "assistant", content: botReply });
    });
  } catch (err) {
    console.error("Errore nella richiesta a Ollama:", err.message);
    ctx.reply("❌ Errore durante la richiesta all'AI.");
  }
});

bot.launch();
console.log("🤖 Bot con throttling attivo!");
