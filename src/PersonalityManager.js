import Database from 'better-sqlite3';
import path from 'path';
import { logMessage } from './utils.js';

class PersonalityManager {
  #connections = {};

  // Retrieve an existing connection, or open a new one if it doesn't exist
  getDatabase(personalityName) {
    if (!this.#connections[personalityName]) {
      try {
        const dbPath = path.join(process.cwd(), `${personalityName}_markov.db`);
        const db = new Database(dbPath, { fileMustExist: true }); // Prevent creating an empty DB on typo
        
        // Apply optimized read settings
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('temp_store = MEMORY');

        this.#connections[personalityName] = db;
        logMessage(`Loaded personality: ${personalityName}`);
      } catch (error) {
        console.error(`Failed to load personality '${personalityName}':`, error.message);
        return null; // Handle fallback logic in your bot
      }
    }
    
    return this.#connections[personalityName];
  }

  // Optional: Only used if you need to hot-swap a file or free memory
  unloadPersonality(personalityName) {
    if (this.#connections[personalityName]) {
      this.#connections[personalityName].close();
      delete this.#connections[personalityName];
      logMessage(`Unloaded personality: ${personalityName}`);
    }
  }
}

export const personalities = new PersonalityManager();