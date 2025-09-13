import { OpenAI } from 'openai';
import { PUNK_PROMPT, MAX_CHAT_HISTORY_LENGTH, OPENAI_API_KEY, DEFAULT_TEMP } from './config.js';
import { logError } from './utils.js';

const MODEL_NAME = 'gpt-4o';
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

let chatHistory = [];
let promptHistory = [];
let systemPromptBase = PUNK_PROMPT;
let currentMood = '';
let temperature = DEFAULT_TEMP

export async function generateAIResponse(userMessage) {
  try {
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
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: messagesToSend,
      max_tokens: 150,
      temperature: 0.7,
    });
    const aiMessage = completion.choices[0].message.content.trim();
    chatHistory.push({ role: 'assistant', content: aiMessage });
    return aiMessage;
  } catch (error) {
    logError(error, 'AI Response Generation');
    return null;
  }
}

export async function generateRecapOpinion(recapText) {
  try {
    let systemPrompt =
      systemPromptBase +
      'You will receive a channel recap from another user. Summarize the discussion and give your snarky opinion in two to three sentences maximum.';
    if (currentMood) {
      systemPrompt += `\nYour mood is currently ${currentMood}`;
    }
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here is the channel recap:\n\n${recapText}\n\nPlease summarize or give an opinion.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    logError(error, 'Recap Opinion Generation');
    return '(Unable to generate recap opinion at this time.)';
  }
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
}

export function getSystemPrompt() {
  return systemPromptBase;
} 