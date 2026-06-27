// MarkovGenerator.js
import fs from 'fs'
import path from 'path'

const TEXT1_FILE_PATH = path.join(process.cwd(), 'data', 'pride.txt');
const TEXT2_FILE_PATH = path.join(process.cwd(), 'data', 'alice.txt');
const TEXT3_FILE_PATH = path.join(process.cwd(), 'data', 'madness.txt');
const TEXT4_FILE_PATH = path.join(process.cwd(), 'data', 'nuclear.txt');
const MAX_ORDER = 8;

class MarkovGenerator {
  #dictionary = {}
  #startStates  = []
  #order
  #mode
  #separator

  constructor (order = 6, mode = 'char') {
    this.#order = this.#sanitizeOrder(order);
    this.#mode = mode;
    this.#separator = mode === 'word' ? ' ' : '';
    this.#buildCorpus()
  }

  updateOrder(newOrder) {
    const parsedOrder = Number(newOrder);

    if (!Number.isInteger(parsedOrder) || parsedOrder < 1 || parsedOrder > MAX_ORDER) {
      return { success: false, message: `Invalid order. Please provide a positive integer between 1 and ${MAX_ORDER}.` };
    }

    this.#order = parsedOrder;
    this.#dictionary = {};
    this.#startStates = [];
    this.#buildCorpus();

    return { success: true, message: `Markov order updated to ${parsedOrder}.` };
  }

  #sanitizeOrder(order) {
    const parsedOrder = Number(order);

    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      return 6;
    }

    return Math.min(parsedOrder, MAX_ORDER);
  }

  #train(text) {
    const safeText = text.trim();
    const tokens = this.#mode === 'word' ? safeText.split(/\s+/) : safeText.split('');

    // Stop 2 words short of the end since we need pairs + 1 next word
    for (let i = 0; i <= tokens.length - this.#order - 1; i++) {
      const stateTokens = tokens.slice(i, i + this.#order);
      const nextToken = tokens[i + this.#order];
      
      const state = stateTokens.join(this.#separator);

      if (i === 0 || (i > 0 && ['.', '?', '!'].includes(tokens[i - 1].slice(-1)))) {
        this.#startStates.push(state);
      }

      if (!this.#dictionary[state]) {
        this.#dictionary[state] = [];
      }

      this.#dictionary[state].push(nextToken);
    }
  }

  // Generate random text
  generate(maxTokens = this.#mode === 'word' ? 30 : 200) {
    if (this.#startStates.length === 0) {
      return "I need to be trained with some text first!";
    }

    // Pick a random starting state
    let currentState = this.#startStates[Math.floor(Math.random() * this.#startStates.length)];
    let result = currentState.split(this.#separator); // Split the 2 words into our result array

    for (let i = this.#order; i < maxTokens; i++) {
      const possibleNextTokens = this.#dictionary[currentState];

      if (!possibleNextTokens || possibleNextTokens.length === 0) {
        break;
      }

      const nextToken = possibleNextTokens[Math.floor(Math.random() * possibleNextTokens.length)];
      result.push(nextToken);

      // Shift the window: drop word1, keep word2, add nextWord
      const stateArray = currentState.split(this.#separator);
      stateArray.shift();
      stateArray.push(nextToken);
      currentState = stateArray.join(this.#separator);

      if (['.', '?', '!'].includes(nextToken.slice(-1))) {
         break;
      }

    }

    return result.join(this.#separator);
  }

  generateReply(userPrompt, maxTokens = this.#mode === 'word' ? 30 : 200) {
    if (Object.keys(this.#dictionary).length === 0) {
      return ["I need to be trained with some text first!"];
    }

    const cleanPrompt = userPrompt.trim().replace(/[.,!?]/g, '').toLowerCase();
    const promptTokens = this.#mode === 'word' ? cleanPrompt.split(/\s+/) : cleanPrompt.split('');
    
    let seedState = null;
    const dictionaryKeys = Object.keys(this.#dictionary);

    for (let currentState = this.#order; currentState > 0; currentState--) {
      if (seedState) break;

      for (let i = promptTokens.length - currentState; i >= 0; i--) {
        const targetPhrase = promptTokens.slice(i, i + currentState).join(this.#separator);
        
        // Check if any state in the dictionary contains this phrase
        seedState = dictionaryKeys.find(key => key.toLowerCase().includes(targetPhrase));
        if (seedState) break;
      }
    }

    // Absolute Fallback: Pivot gracefully and pick a random start
    if (!seedState) {
      return [this.generate(maxTokens)];
    }

    // Generate the response starting from the found seed state
    let currentState = seedState;
    let result = currentState.split(this.#separator);

    for (let i = this.#order; i < maxTokens; i++) {
      const possibleNextTokens = this.#dictionary[currentState];

      if (!possibleNextTokens || possibleNextTokens.length === 0) {
        break;
      }

      const nextToken = possibleNextTokens[Math.floor(Math.random() * possibleNextTokens.length)];
      result.push(nextToken);

      const stateArray = currentState.split(this.#separator);
      stateArray.shift();
      stateArray.push(nextToken);
      currentState = stateArray.join(this.#separator);

      if (['.', '?', '!'].includes(nextToken.slice(-1))) {
         break;
      }
    }

    let finalResponse = result.join(this.#separator);
    return [finalResponse.charAt(0).toUpperCase() + finalResponse.slice(1)];
  }

  async #fetchGutenbergText(url) {
    // 1. Fetch the raw text file
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    let text = await response.text();

    // 2. Strip the Gutenberg Header and Footer
    // Gutenberg markers usually look like "*** START OF THIS PROJECT GUTENBERG EBOOK... ***"
    const startRegex = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*/i;
    const endRegex = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*/i;

    const startMatch = text.match(startRegex);
    const endMatch = text.match(endRegex);

    // If we find both markers, slice the string to only keep the actual book
    if (startMatch && endMatch) {
        const startIndex = startMatch.index + startMatch[0].length;
        const endIndex = endMatch.index;
        text = text.substring(startIndex, endIndex);
    }

    // 3. Clean up the formatting (remove newlines, collapse extra spaces)
    text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

    return text;
  }

  #cleanGutenbergText(text) {
    // Gutenberg markers usually look like "*** START OF THIS PROJECT GUTENBERG EBOOK... ***"
    const startRegex = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*/i;
    const endRegex = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*/i;

    const startMatch = text.match(startRegex);
    const endMatch = text.match(endRegex);

    // If we find both markers, slice the string to only keep the actual book
    if (startMatch && endMatch) {
        const startIndex = startMatch.index + startMatch[0].length;
        const endIndex = endMatch.index;
        text = text.substring(startIndex, endIndex);
    }

    // 3. Clean up the formatting (remove newlines, collapse extra spaces)
    text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

    return text;
  }

  // Example usage: Combining Alice in Wonderland with Pride and Prejudice
  async #buildCorpus() {
    console.log("Fetching texts from Gutenberg...");
    
    let text1, text2, text3
    let text4

    try {
      if (fs.existsSync(TEXT1_FILE_PATH) && fs.existsSync(TEXT2_FILE_PATH) && fs.existsSync(TEXT3_FILE_PATH) && fs.existsSync(TEXT4_FILE_PATH)) {
        text1 = this.#cleanGutenbergText(fs.readFileSync(TEXT1_FILE_PATH, 'utf8'));
        text2 = this.#cleanGutenbergText(fs.readFileSync(TEXT2_FILE_PATH, 'utf8'));
        text3 = this.#cleanGutenbergText(fs.readFileSync(TEXT3_FILE_PATH, 'utf8'));
        text4 = this.#cleanGutenbergText(fs.readFileSync(TEXT4_FILE_PATH, 'utf8'));
      }
    } catch (error) {
      logError(error, 'Error loading texts');
    }

    try {
        // Combine them into one massive string
        const combinedCorpus = text1 + " " + text2 + " " + text3 + " " + text4;
        console.log("Corpus ready! Total characters:", combinedCorpus.length);
        
        this.#train(combinedCorpus);

    } catch (error) {
        console.error("Error building corpus:", error);
    }
  }
}

export default MarkovGenerator