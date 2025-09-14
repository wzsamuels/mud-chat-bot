import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const CHAT_LOG_FILE = path.join(LOG_DIR, 'chat.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

export function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${context}: ${error.message}\n${error.stack}\n\n`;
  fs.appendFileSync(ERROR_LOG_FILE, logMessage);
}

export function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(CHAT_LOG_FILE, logEntry);
}

export function sendReply(client, userName, text, {channelName = null, whisper = false}) {
  let messageToSend;
  if(whisper) {
    messageToSend = `.${userName} ${text}\n`;
  } else if (channelName) {
    messageToSend = `#${channelName} ..${userName} ${text}\n`;
  } else {
    messageToSend = `..${userName} ${text}\n`;
  }
  logMessage(`BOT to ${userName}: ${text.replace(/\n/g, ' ')}`);
  client.write(messageToSend);
}