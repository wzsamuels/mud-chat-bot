import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

export function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${context}: ${error.message}\n${error.stack}\n\n`;
  fs.appendFileSync(ERROR_LOG_FILE, logMessage);
}

export function sendReply(client, userName, text, {channelName = null, whisper = false}) {
  if(whisper) {
    client.write(`.${userName} ${text}\n`);
  } else if (channelName) {
    client.write(`#${channelName} ..${userName} ${text}\n`);
  } else {
    client.write(`..${userName} ${text}\n`);
  }
}