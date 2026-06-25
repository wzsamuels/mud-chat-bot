// LLMGenerator.js
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
import { PUNK_PROMPT, MAX_CHAT_HISTORY_LENGTH, DEFAULT_TEMP, AI_MODEL } from './config.js';
import { logError } from './utils.js';


const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');
const MAX_TOKENS = 250

export class LLMGenerator {
  #ai;
  #chatHistory = [];
  #promptHistory = [];
  temperature = DEFAULT_TEMP;
  prompt = PUNK_PROMPT;

  constructor() {
    this.#ai = new GoogleGenAI({});
  }

  clearChatHistory() {
    this.#chatHistory.length = 0
  }

  get promptHistory() {
    return[...this.#promptHistory]
  }

  async #createChatCompletion(messages, errorContext) {
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
      logError(error, errorContext);
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

    const aiMessage = await this.#createChatCompletion(
      messagesToSend,
      'AI Response Generation'
    );

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
      return { success: false, message: `Invalid prompt, idiot.`}
    }

    this.#promptHistory.push(newPrompt);
    if (this.#promptHistory.length >= MAX_CHAT_HISTORY_LENGTH) {
      this.#promptHistory.shift();
    }
    this.prompt = newPrompt;
    this.#saveSettings();
    return {success: true, message: `Prompt updated.`}
  }

  updateTemperature(newTemp) {
    const temp = parseFloat(newTemp);
    if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
      return {success: false, message: `Invalid temperature: ${temp}. Please provide a number between 0.0 and 2.0.`}
    }
    this.temperature = temp
    this.#saveSettings()
    return {success: true, message: `Temperature updated: ${temp}.`}
  }
}