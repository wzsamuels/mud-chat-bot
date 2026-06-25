// MarkovGenerator.js
import fs from 'fs'
import path from 'path'

const TEXT1_FILE_PATH = path.join(process.cwd(), 'data', 'nuclear.txt');
const TEXT2_FILE_PATH = path.join(process.cwd(), 'data', 'alice.txt');

class MarkovGenerator {
  #corpus = ''
  #order = 2
  #dictionary = {}
  #startStates  = []

  constructor () {
    this.#buildCorpus()
  }

  #train(text) {
    const words = text.trim().split(/\s+/);

    // Stop 2 words short of the end since we need pairs + 1 next word
    for (let i = 0; i < words.length - 2; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];
      const nextWord = words[i + 2];
      
      const state = `${word1} ${word2}`;

      // Track sentence starters (looking at punctuation of the word before word1)
      if (i === 0 || words[i - 1].endsWith('.') || words[i - 1].endsWith('?') || words[i - 1].endsWith('!')) {
        this.#startStates.push(state);
      }

      if (!this.#dictionary[state]) {
        this.#dictionary[state] = [];
      }

      this.#dictionary[state].push(nextWord);
    }
  }

  // Step 2: Generate random text
  generate(maxWords = 30) {
    if (this.#startStates.length === 0) {
      return "I need to be trained with some text first!";
    }

    // Pick a random 2-word starting state
    let currentState = this.#startStates[Math.floor(Math.random() * this.#startStates.length)];
    let result = currentState.split(' '); // Split the 2 words into our result array

    for (let i = 2; i < maxWords; i++) {
      const possibleNextWords = this.#dictionary[currentState];

      if (!possibleNextWords || possibleNextWords.length === 0) {
        break;
      }

      const nextWord = possibleNextWords[Math.floor(Math.random() * possibleNextWords.length)];
      result.push(nextWord);

      // Shift the window: drop word1, keep word2, add nextWord
      const stateWords = currentState.split(' ');
      currentState = `${stateWords[1]} ${nextWord}`;

      if (nextWord.endsWith('.') || nextWord.endsWith('?') || nextWord.endsWith('!')) {
         break;
      }
    }

    return result.join(' ');
  }

  generateReply(userPrompt, maxWords = 30) {
    if (Object.keys(this.#dictionary).length === 0) {
      return ["I need to be trained with some text first!"];
    }

    const promptWords = userPrompt.trim().split(/\s+/);
    let seedState = null;
    const dictionaryKeys = Object.keys(this.#dictionary);

    // 1. Try finding an Order-2 (two-word) match first for maximum relevance
    for (let i = promptWords.length - 2; i >= 0; i--) {
      const w1 = promptWords[i].replace(/[.,!?]/g, '').toLowerCase();
      const w2 = promptWords[i + 1].replace(/[.,!?]/g, '').toLowerCase();
      const targetPhrase = `${w1} ${w2}`;

      // Search keys for a match (ignoring case for the search)
      seedState = dictionaryKeys.find(key => key.toLowerCase().includes(targetPhrase));
      if (seedState) break;
    }

    // 2. Fallback: Try finding an Order-1 (single word) match if a pair isn't found
    if (!seedState) {
      for (let i = promptWords.length - 1; i >= 0; i--) {
        const word = promptWords[i].replace(/[.,!?]/g, '').toLowerCase();
        
        // Find any 2-word state in the dictionary that contains this single word
        seedState = dictionaryKeys.find(key => key.toLowerCase().includes(word));
        if (seedState) break;
      }
    }

    // 3. Absolute Fallback: Pivot gracefully and pick a random start
    if (!seedState) {
      return [this.generate(maxWords)];
    }

    // 4. Generate the response starting from the found seed state
    let currentState = seedState;
    let result = currentState.split(' ');

    for (let i = 2; i < maxWords; i++) {
      const possibleNextWords = this.#dictionary[currentState];

      if (!possibleNextWords || possibleNextWords.length === 0) {
        break;
      }

      const nextWord = possibleNextWords[Math.floor(Math.random() * possibleNextWords.length)];
      result.push(nextWord);

      const stateWords = currentState.split(' ');
      currentState = `${stateWords[1]} ${nextWord}`;

      if (nextWord.endsWith('.') || nextWord.endsWith('?') || nextWord.endsWith('!')) {
         break;
      }
    }

    let finalResponse = result.join(' ');
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
    
    // URLs for the plain text UTF-8 versions
    let text1
    let text2

    try {
      if (fs.existsSync(TEXT1_FILE_PATH) && fs.existsSync(TEXT2_FILE_PATH)) {
        text1 = this.#cleanGutenbergText(fs.readFileSync(TEXT1_FILE_PATH, 'utf8'));
        text2 = this.#cleanGutenbergText(fs.readFileSync(TEXT2_FILE_PATH, 'utf8'));
      }
    } catch (error) {
      logError(error, 'Error loading texts');
    }

    try {
        // Combine them into one massive string
        const combinedCorpus = text1 + " " + text2;
        console.log("Corpus ready! Total characters:", combinedCorpus.length);
        
        this.#train(combinedCorpus);

    } catch (error) {
        console.error("Error building corpus:", error);
    }
  }
}

export default MarkovGenerator