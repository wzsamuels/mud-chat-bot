// MarkovGenerator.js
import fs from 'fs'
import path from 'path'
import {logError} from './utils.js'

//const TEXT1_FILE_PATH = path.join(process.cwd(), 'data', 'pride.txt');
const TEXT2_FILE_PATH = path.join(process.cwd(), 'data', 'alice.txt');
const TEXT3_FILE_PATH = path.join(process.cwd(), 'data', 'madness.txt');
const TEXT4_FILE_PATH = path.join(process.cwd(), 'data', 'nuclear.txt');
const MAX_ORDER = 8;

class MarkovGenerator {
  #dictionary = {}
  #reverseDict = {}
  #startStates  = []
  #order
  #mode
  #separator

  constructor (order = 2, mode = 'word') {
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

  setMode(newMode) {
    const mode = newMode?.toLowerCase().trim();

    if (!mode || (mode !== 'word' && mode !== 'char')) {
      return { success: false, message: `Invalid mode. Please provide either "word" or "char".` };
    }
    
    this.#mode = mode;
    this.#separator = mode === 'word' ? ' ' : '';
    this.#dictionary = {};
    this.#startStates = [];
    this.#buildCorpus();

    return { success: true, message: `Markov mode updated to ${mode}.` };
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

      if (i > 0) {
        const previousToken = tokens[i - 1];
        if (!this.#reverseDict[state]) {
          this.#reverseDict[state] = [];
        }
        this.#reverseDict[state].push(previousToken);
      }
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

    return [result.join(this.#separator)];
  }

  generateReply(userPrompt, maxTokens = this.#mode === 'word' ? 30 : 200) {
    if (Object.keys(this.#dictionary).length === 0) {
      return ["I need to be trained with some text first!"];
    }

    // Split the prompt into tokens using the correct separator
    const promptTokens = this.#mode === 'word' 
      ? userPrompt.trim().split(/\s+/) 
      : userPrompt.trim().split('');

    let seedState = null;
    const dictionaryKeys = Object.keys(this.#dictionary);

    for (let currentSize = this.#order; currentSize > 0; currentSize--) {
      if (seedState) break;
      for (let i = promptTokens.length - currentSize; i >= 0; i--) {
        const targetPhrase = promptTokens.slice(i, i + currentSize).join(this.#separator);
        seedState = dictionaryKeys.find(key => key.toLowerCase().includes(targetPhrase));
        if (seedState) break;
      }
    }

    // Absolute Fallback if no match is found anywhere
    if (!seedState) {
      return this.generate(maxTokens);
    }

    // --- PHASE 1: GENERATE BACKWARD ---
    let backwardTokens = [];
    let currentBackState = seedState;
    // Limit backward generation so the seed doesn't get buried too deep
    const maxBackTokens = Math.floor(maxTokens / 2);

    for (let i = 0; i < maxBackTokens; i++) {
      const possiblePrevTokens = this.#reverseDict[currentBackState];
      if (!possiblePrevTokens || possiblePrevTokens.length === 0) break;

      const prevToken = possiblePrevTokens[Math.floor(Math.random() * possiblePrevTokens.length)];
      
      // Add the new token to the FRONT of our backward array
      backwardTokens.unshift(prevToken);

      // Shift window backward: drop the last token, add the prev token to the front
      const stateArray = currentBackState.split(this.#separator);
      stateArray.pop();
      stateArray.unshift(prevToken);
      currentBackState = stateArray.join(this.#separator);

      // Stop Condition: If the token we just looked at ends with punctuation, 
      // it belongs to the PREVIOUS sentence. We remove it from our array and stop.
      if (['.', '?', '!'].includes(prevToken.slice(-1))) {
        backwardTokens.shift();
        break;
      }
    }

    // --- PHASE 2: GENERATE FORWARD ---
    let forwardTokens = [];
    let currentForwardState = seedState;
    const maxForwardTokens = maxTokens - backwardTokens.length - this.#order;

    for (let i = 0; i < maxForwardTokens; i++) {
      const possibleNextTokens = this.#dictionary[currentForwardState];
      if (!possibleNextTokens || possibleNextTokens.length === 0) break;

      const nextToken = possibleNextTokens[Math.floor(Math.random() * possibleNextTokens.length)];
      forwardTokens.push(nextToken);

      // Shift window forward
      const stateArray = currentForwardState.split(this.#separator);
      stateArray.shift();
      stateArray.push(nextToken);
      currentForwardState = stateArray.join(this.#separator);

      if (['.', '?', '!'].includes(nextToken.slice(-1))) {
         break;
      }
    }

    // --- PHASE 3: ASSEMBLE ---
    const seedArray = seedState.split(this.#separator);
    const finalTokens = [...backwardTokens, ...seedArray, ...forwardTokens];

    let finalResponse = finalTokens.join(this.#separator).trim();

    // Capitalize the first letter and force a period if it abruptly cut off
    finalResponse = finalResponse.charAt(0).toUpperCase() + finalResponse.slice(1);
    if (!['.', '?', '!'].includes(finalResponse.slice(-1))) {
      finalResponse += '.';
    }

    return [finalResponse];
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
    
    let text1, text2, text3, text4;

    try {
      if (fs.existsSync(TEXT2_FILE_PATH) && fs.existsSync(TEXT3_FILE_PATH) && fs.existsSync(TEXT4_FILE_PATH)) {
        //text1 = this.#cleanGutenbergText(fs.readFileSync(TEXT1_FILE_PATH, 'utf8'));
        text2 = this.#cleanGutenbergText(fs.readFileSync(TEXT2_FILE_PATH, 'utf8'));
        text3 = this.#cleanGutenbergText(fs.readFileSync(TEXT3_FILE_PATH, 'utf8'));
        text4 = this.#cleanGutenbergText(fs.readFileSync(TEXT4_FILE_PATH, 'utf8'));
      }
    } catch (error) {
      logError(error, 'Error loading texts');
    }

    try {
        // Combine them into one massive string
        const combinedCorpus = text2 + " " + text3 + " " + text4;
        console.log("Corpus ready! Total characters:", combinedCorpus.length);
        
        this.#train(combinedCorpus);

    } catch (error) {
        console.error("Error building corpus:", error);
    }
  }
}

export default MarkovGenerator