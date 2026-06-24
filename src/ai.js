import fs from 'fs';
import path from 'path';
import { PUNK_PROMPT, MAX_CHAT_HISTORY_LENGTH, DEFAULT_TEMP, AI_MODEL } from './config.js';
import { logError } from './utils.js';
import { GoogleGenAI } from "@google/genai";

import { messageTypes } from './messagePatterns.js';
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');
const MAX_TOKENS = 250

export class ChatBot {
  #ai = new GoogleGenAI({});
  #chatHistory = [];
  #promptHistory = [];

  systemPrompt = PUNK_PROMPT;
  temperature = DEFAULT_TEMP

  #markovCorpus = ''
  #markovMode = false

  get chatHistory() {
    return[...this.#chatHistory]
  }

  get promptHistory() {
    return[...this.#promptHistory]
  }


  loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE_PATH)) {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf8'));
        this.systemPrompt = settings.systemPrompt || PUNK_PROMPT;
        this.temperature = settings.temperature || DEFAULT_TEMP;
        this.markovMode = settings.markovMode || false;
      }
    } catch (error) {
      logError(error, 'Error loading settings');
    }
  }

  saveSettings() {
    try {
      const dir = path.dirname(SETTINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const settings = {
        this.systemPrompt,
        this.temperature,
        this.markovMode
      };
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      logError(error, 'Error saving settings');
    }
  }

  updatePrompt(newPrompt) {
    if (!newPrompt || typeof newPrompt !== 'string') {
      return {message: `Invalid prompt, idiot.`}
    }

    this.#promptHistory.push(newPrompt);
    if (this.#promptHistory.length >= MAX_CHAT_HISTORY_LENGTH) {
      this.#promptHistory.shift();
    }
    this.#prompt = newPrompt;
    this.saveSettings();
    return {success: true, message: `Prompt updated.`}
  }

  updateTemperature(newTemp) {
    const temp = parseFloat(newTemp);
    if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
      return {success: false, message: `Invalid temperature: ${temp}. Please provide a number between 0.0 and 2.0.`}
    }
    this.#temperature = temp
    this.saveSettings()
    return {success: true, message: `Temperature updated: ${temp}.`}
  }

  updateMarkovMode(newMarkovMode) {
if (typeof value === 'boolean') return value;
  
  // Handle strings
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
    if (isTrue(newMarkovMode)) {
      
    }
  }

  async handleMessage(message) {
    // Process message based on type (direct, whisper, channel)
    for (const type of messageTypes) {
      const match = message.trim().match(type.pattern);
      
      if (match) {
        const { userName, userMessage, replyOptions } = type.handler(match.groups);

        if (userName && userMessage) {
          // Bug Fix: Prevent the bot from replying to its own messages.
          if (userName.toLowerCase().includes(BOT_NAME.toLowerCase()) || userName.toLowerCase() === 'you') {
            return; // Ignore messages from self.
          }
          if (userMessage.startsWith('@')) {
            const commandRegex = /^@(\w+)(?:\s+(.*))?/;
            const match = userMessage.match(commandRegex);
            if (!match) {
              return formatReply(userName, "I couldn't parse that command.", {
                channelName: channelName,
                whisper: whisper,
              });
              return;
            }
            const cmd = match[1].toLowerCase();
            const args = match[2] ? match[2].trim() : '';

            if (whisper && cmd !== 'help' && cmd !== 'status') {
              return formatReply("Sorry, you can't whisper that command.",
                {channelName, userName, whisper});
            }

            const command = commands[cmd];
            if (command[cmd]) {
              command(userName, args, { whisper, channelName });
            } else {
              return formatReply(userName, `Unknown command: @${cmd}`, {
                channelName: channelName,
              });
            }
          }

          const response = await ai.generateAIResponse(userMessage);
          if (response) {
            sendReply(userName, response, replyOptions);
          } else {
            sendReply(userName, "Oops, something went wrong with my AI", replyOptions);
          }
        }
        return; // Message handled, no need to check other patterns.
      }
    }

    // If no message type was matched, something went wrong 
    logError(new Error('Unrecognized message type'), message)
    return `Somehow you sent me a message that wasn't a recognized type. Logging error, idiot.`
  }
};



async function createChatCompletion(messages, errorContext) {
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

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature
      },
    });
    return response.text.trim().replace(/(\r\n|\n|\r)/gm, " ");
  } catch (error) {
    logError(error, errorContext);
    return null;
  }
}

console.log(AI_MODEL)

export async function generateAIResponse(userMessage) {
  chatHistory.push({ role: 'user', content: userMessage });
  let systemPrompt =
    systemPromptBase +
    "Keep your answers to a maximum of three sentences unless prompted otherwise.";
  if (currentMood) {
    systemPrompt += `\nYour current mood is ${currentMood}`;
  }
  while (chatHistory.length > MAX_CHAT_HISTORY_LENGTH) {
    chatHistory.shift();
  }
  const messagesToSend = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
  ];
  const aiMessage = await createChatCompletion(
    messagesToSend,
    'AI Response Generation'
  );
  if (aiMessage) {
    chatHistory.push({ role: 'assistant', content: aiMessage });
  }
  return aiMessage;
}

export function setSystemPrompt(prompt) {
}

export function setTemperature(newTemperature) {
  temperature = newTemperature;
  saveSettings();
}

const isTrue = (value) => /^true$/i.test(value);
