import { readFile, readdir } from 'fs/promises';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const CHAT_LOG_FILE = path.join(LOG_DIR, 'chat.log');

// Ensure logs directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR);
}

export function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${context}: ${error.message}\n${error.stack}\n\n`;
  appendFileSync(ERROR_LOG_FILE, logMessage);
}

export function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  appendFileSync(CHAT_LOG_FILE, logEntry);
}

export function formatReply(text, {userName, channelName = null, whisper = false}) {
  let messageToSend;

  if(whisper) {
    console.log("Whisper detected")
    messageToSend = `.${userName} ${text}\n`;
  } else if (channelName) {
    messageToSend = `#${channelName} ..${userName} ${text}\n`;
  } else {
    messageToSend = `..${userName} ${text}\n`;
  } 

  return messageToSend
}

/**
 * Recursively searches a directory for files with a specific extension and reads them.
 * @param {string} dirPath - The starting directory path.
 * @param {string} extension - The file extension to look for (e.g., '.txt').
 * @returns {Promise<Array>} - Array of objects containing the filepath and content.
 */
export async function readFilesWithExtension(dirPath, extension) {
  let results = [];
  
  // Read the directory contents, returning fs.Dirent objects to easily check if it's a file or folder
  const items = await readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    // Construct the full path of the current item
    const fullPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      // If it's a folder, recursively call the function and merge the results
      const subDirResults = await readFilesWithExtension(fullPath, extension);
      results = results.concat(subDirResults);
      
    } else if (item.isFile() && path.extname(item.name) === extension) {
      // If it's a file and matches the extension, read its content
      try {
        const content = await readFile(fullPath, 'utf-8');
        results.push({
          filepath: fullPath,
          content: content
        });
      } catch (error) {
        throw new Error(`Failed to read file ${fullPath}`, {cause: error});
      }
    }
  }
  
  return results;
}