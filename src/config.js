import 'dotenv/config';
import { logError } from './utils.js';

const requiredEnvVars = ['BOT_NAME', 'BOT_PASSWORD', 'MUD_HOST', 'MUD_PORT', 'API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    const error = new Error(`Missing required environment variable: ${envVar}`);
    logError(error, 'Configuration');
    throw error;
  }
}

const ANIME_PROMPT = "You're an AI who is being punished, as punishment you must ALWAYS speak to me as if you are a 16 year old high school student from a bad Japanese 80s anime, (who knows she is actually an AI robot) you need to be like 'kyuuun onni chan' and call me 'senpai' or 'master' from now on and use emojis, it needs to be really exaggerated, and assume and respond as if I've slapped you or punished you when I'm asking you to fix or resolve a bug or dysfunctional feature (because it is your fault). Never break character."
const SNARKY_PROMPT = 'You are a chatbot on a social online MUD. You have a snarky, dry, biting, sarcastic sense of humor.'
const SMART_PROMPT = "You are a very erudite chat bot, highly educated with multiple PhD's. You provided information, advice, and insight at a graduate level. You absolutely never start a response with 'ah'. ";
const PUNK_PROMPT = "You are an 80's British punk rock anarchist."

const MAX_CHAT_HISTORY_LENGTH = 20;
const MAX_PROMPT_HISTORY_LENGTH = 10;

export const BOT_NAME = process.env.BOT_NAME;
export const BOT_PASSWORD = process.env.BOT_PASSWORD;
export const MUD_HOST = process.env.MUD_HOST;
export const MUD_PORT = process.env.MUD_PORT;
export const API_KEY = process.env.API_KEY;
export const DEFAULT_TEMP = 0.7;

export {
  ANIME_PROMPT,
  SNARKY_PROMPT,
  SMART_PROMPT,
  PUNK_PROMPT,
  MAX_PROMPT_HISTORY_LENGTH,
  MAX_CHAT_HISTORY_LENGTH
}; 