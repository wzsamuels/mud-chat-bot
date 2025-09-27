import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { PUNK_PROMPT, MAX_CHAT_HISTORY_LENGTH, API_KEY, DEFAULT_TEMP, AI_MODEL } from './config.js';
import { logError } from './utils.js';

const openai = new OpenAI({
  apiKey: API_KEY,
});

let chatHistory = [];
let promptHistory = [];
let systemPromptBase = PUNK_PROMPT;
let currentMood = '';
let temperature = DEFAULT_TEMP
let maxTokens = 250;

const PROMPT_FILE_PATH = path.join(process.cwd(), 'data', 'prompt.txt');

function loadPrompt() {
  try {
    if (fs.existsSync(PROMPT_FILE_PATH)) {
      systemPromptBase = fs.readFileSync(PROMPT_FILE_PATH, 'utf8');
    }
  } catch (error) {
    logError(error, 'Error loading prompt');
  }
}

function savePrompt() {
  try {
    const dir = path.dirname(PROMPT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROMPT_FILE_PATH, systemPromptBase, 'utf8');
  } catch (error) {
    logError(error, 'Error saving prompt');
  }
}

loadPrompt();

async function createChatCompletion(messages, errorContext) {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: temperature,
    });
    return completion.choices[0].message.content.trim();
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

export async function generateRecapOpinion(recapText) {
  let systemPrompt =
    systemPromptBase +
    'You will receive a channel recap from another user. Summarize the discussion and give your snarky opinion in two to three sentences maximum.';
  if (currentMood) {
    systemPrompt += `\nYour current mood is ${currentMood}`;
  }
  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Here is the channel recap:\n\n${recapText}\n\nPlease summarize or give an opinion.`,
    },
  ];
  const aiMessage = await createChatCompletion(
    messages,
    'Recap Opinion Generation'
  );
  return aiMessage || '(Unable to generate recap opinion at this time.)';
}

export function setMood(mood) {
  currentMood = mood;
}

export function clearChatHistory() {
  chatHistory = [];
}

export function clearPromptHistory() {
  promptHistory = [];
}

export function getMood() {
  return currentMood;
}

export function getPromptHistory() {
  return promptHistory;
}

export function setSystemPrompt(prompt) {
  promptHistory.push(systemPromptBase);
  if (promptHistory.length >= MAX_CHAT_HISTORY_LENGTH) {
    promptHistory.shift();
  }
  systemPromptBase = prompt;
  savePrompt();
}

export function getSystemPrompt() {
  return systemPromptBase;
}

export function setTemperature(newTemperature) {
  temperature = newTemperature;
}

export function getTemperature() {
  return temperature;
}