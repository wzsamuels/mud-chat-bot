// LLMGenerator.js
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_PROMPTS, MAX_CHAT_HISTORY_LENGTH, MAX_PROMPT_HISTORY_LENGTH, DEFAULT_TEMP, AI_MODEL } from './config.js';
import { logError } from './utils.js';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');
const MAX_TOKENS = 250

class LLMGenerator {
  #ai;
  #chatHistory = [];
  #promptHistory = [];
  temperature = DEFAULT_TEMP;
  prompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];

  commands = {
    temp: (args) => this.updateTemperature(args),
    prompt: (args) => this.updatePrompt(args),
    clear: (args) => this.clearChatHistory(),
    random_prompt: (args) => {
      const randomPrompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];
      return this.updatePrompt(randomPrompt);
    },
    status: (args) => this.status(),
  }

  constructor() {
    this.#ai = new GoogleGenAI({});
    this.#loadSettings();
  }

  status() {
    let status = [
      `Current AI: LLM`,
      `Current temperature: ${this.temperature}`,
      `Current prompt: ${this.prompt}`,
    ]

    if (this.#promptHistory.length > 0) {
      status.push("Previous prompts:")
      for (let i = 0; i < this.#promptHistory.length; i++) {
        status.push(`[${i + 1}] ${this.#promptHistory[i]}`)
      }
    }
    
    return status;
  }

  clearChatHistory() {
    this.#chatHistory.length = 0
    return ["Chat history cleared."];
  }

  async #createChatCompletion(messages) {
    try {
      let systemInstruction = "";
      const contents = [];
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction = msg.content;
        } else {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      console.log("Sending to AI:", { model: AI_MODEL, contents, config: { systemInstruction, temperature: this.temperature } });

      const response = await this.#ai.models.generateContent({
        model: AI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: this.temperature
        },
      });
      return response.text.trim().replace(/(\r\n|\n|\r)/gm, " ");
    } catch (error) {
      logError(error, 'AI Response Generation');
      return null;
    }
  }

  async generateReply(userMessage) {
    while (this.#chatHistory.length > MAX_CHAT_HISTORY_LENGTH) {
      this.#chatHistory.shift();
    }

    this.#chatHistory.push({ role: 'user', content: userMessage });

    let systemPrompt =
      this.prompt +
      "Keep your answers to a maximum of three sentences unless prompted otherwise.";

    const messagesToSend = [
      { role: 'system', content: systemPrompt },
      ...this.#chatHistory,
    ];

    const aiMessage = await this.#createChatCompletion(messagesToSend);

    if (aiMessage) {
      this.#chatHistory.push({ role: 'assistant', content: aiMessage });
      return [aiMessage];
    }
    return ["Oops, something went wrong with my AI. Tell Zach you screwed up."];
  }

  #loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE_PATH)) {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf8'));
        this.prompt = settings.prompt || PUNK_PROMPT;
        this.temperature = settings.temperature || DEFAULT_TEMP;
      }
    } catch (error) {
      logError(error, 'Error loading settings');
    }
  }

  #saveSettings() {
    try {
      const dir = path.dirname(SETTINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const settings = {
        prompt: this.prompt,
        temperature: this.temperature,
      };
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      logError(error, 'Error saving settings');
    }
  }

  updatePrompt(newPrompt) {
    if (!newPrompt || typeof newPrompt !== 'string') {
      return [`Invalid prompt, idiot.`];
    }

    bot.clearChatHistory();
    this.#promptHistory.push(this.prompt);
    
    if (this.#promptHistory.length >= MAX_PROMPT_HISTORY_LENGTH) {
      this.#promptHistory.shift();
    }
    
    this.prompt = newPrompt;
    this.#saveSettings();
    return [`Prompt updated.`];
  }

  updateTemperature(newTemp) {
    const temp = parseFloat(newTemp);
    if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
      return [`Invalid temperature: ${temp}. Please provide a number between 0.0 and 2.0.`];
    }
    this.temperature = temp
    this.#saveSettings()
    return [`Temperature updated: ${temp}.`];
  }
}

export default LLMGenerator;