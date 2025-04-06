# 🤖 Telegram LLM Chat Bot (Node.js + Ollama)

This is a lightweight Telegram bot written in Node.js that lets you chat with a local Large Language Model (LLM) using the [Ollama](https://ollama.com) API.  
Messages are streamed and updated in real time, and the bot supports session resets and restricted access via chat ID.

---

## 🚀 Features

- 🔁 **Live streaming** of model output with dynamic Telegram message updates
- 🧠 **Per-user memory** (in-memory session context)
- 🛑 **/start command** to reset chat history
- 🔒 **Access control**: restrict bot to specific chat IDs
- ⚙️ Configurable model, update rate, and API endpoint

---

## 📦 Requirements

- Node.js ≥ 16
- Ollama installed and running locally (or access to a remote Ollama server)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

---

## 📁 Setup

1. **Clone the repo**

```bash
git clone https://github.com/youruser/telegram-llm-bot.git
cd telegram-llm-bot
```

2. **Configure**

```
nano .env
```

3. **Install and run**

```
yarn install
yarn start
```
