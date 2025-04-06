const { Telegraf } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

// === CONFIG ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = process.env.ALLOWED_CHAT_IDS?.split(",").map((i) => Number(i));
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const MODEL = process.env.MODEL || "llama3.1";
const UPDATE_INTERVAL_MS = 500; // update Telegram interval

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const sessions = new Map(); // In-memory chat history per user

// Handle /start command: resets the conversation
bot.start((ctx) => {
  if (CHAT_IDS && !CHAT_IDS.includes(ctx.chat.id)) return;
  sessions.set(ctx.chat.id, []);
  ctx.reply("🔄 Chat restarted. Send me a message!");
});

// Handle incoming text messages
bot.on("text", async (ctx) => {
  if (CHAT_IDS && !CHAT_IDS.includes(ctx.chat.id)) return;

  const chatId = ctx.chat.id;
  if (!sessions.has(chatId)) sessions.set(chatId, []);

  const history = sessions.get(chatId);
  const userMessage = ctx.message.text;
  history.push({ role: "user", content: userMessage });

  // Send a placeholder message to update later
  const sent = await ctx.reply("💬 ...");
  let botReply = "";
  let lastReplySent = "";
  let buffer = "";
  let lastUpdateTime = 0;

  try {
    // Send request to Ollama with streaming response
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

    // Listen to streamed response chunks
    response.data.on("data", async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep last incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const jsonLine = JSON.parse(line.replace(/^data: /, ""));
          if (jsonLine.done) return;

          botReply += jsonLine.message.content;

          // Edit message only if enough time has passed
          const now = Date.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL_MS) {
            lastUpdateTime = now;
            await ctx.telegram.editMessageText(
              chatId,
              sent.message_id,
              null,
              botReply
            );
            lastReplySent = botReply;
          }
        } catch (err) {
          console.error("Error parsing stream:", err.message);
        }
      }
    });

    // Final update once stream ends
    response.data.on("end", async () => {
      if (lastReplySent !== botReply) {
        try {
          await ctx.telegram.editMessageText(
            chatId,
            sent.message_id,
            null,
            botReply
          );
        } catch (err) {
          console.error("Error on end message:", err.message);
        }
      }
      history.push({ role: "assistant", content: botReply });
    });
  } catch (err) {
    console.error("Error sending request to Ollama:", err.message);
    ctx.reply("❌ Error while requesting AI.");
  }
});

bot.launch();
console.log("🤖 Bot is running!");
