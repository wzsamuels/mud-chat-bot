' '// MarkovGenerator.js
import fs from 'fs'
import path from 'path'
import {logError, logMessage, readFilesWithExtension} from './utils.js'
import db from './db.js'

const ORDER = 3; // Default order for the Markov chain
const MAX_ORDER = 8;

class MarkovGenerator {

  commands = {
    status: (args) => this.status(),
  };

  status() {
    let status = [
      `Current AI: Markov`,
      `No prompt is used in Markov mode.`,
    ]
    
    return status;
  }



  // Generate random text
  generate(maxTokens = 30) {
    // Get all valid starting states
    const startStates = db.prepare(`SELECT state FROM n_grams WHERE is_start = 1`).all();
    
    if (startStates.length === 0) return "I need to be trained with some text first!";

    let currentState = startStates[Math.floor(Math.random() * startStates.length)].state;
    let result = currentState.split(' ');

    const getTransitions = db.prepare(`SELECT next_token, frequency FROM transitions WHERE state = ?`);

    for (let i = ORDER; i < maxTokens; i++) {
      const possibleNextTokens = getTransitions.all(currentState);

      if (possibleNextTokens.length === 0) break;

      // Weighted random selection
      const totalWeight = possibleNextTokens.reduce((sum, row) => sum + row.frequency, 0);
      let randomNum = Math.floor(Math.random() * totalWeight);
      
      let nextToken = null;
      for (const row of possibleNextTokens) {
        randomNum -= row.frequency;
        if (randomNum < 0) {
          nextToken = row.next_token;
          break;
        }
      }

      result.push(nextToken);

      const stateArray = currentState.split(' ');
      stateArray.shift();
      stateArray.push(nextToken);
      currentState = stateArray.join(' ');

      if (['.', '?', '!'].includes(nextToken.slice(-1))) break;
    }

    return [result.join(' ')];
  }

  generateReply(userPrompt, maxTokens = 30) {
    // Quick check to ensure the database is populated
    const hasData = db.prepare(`SELECT 1 FROM n_grams LIMIT 1`).get();
    if (!hasData) {
      return ["I need to be trained with some text first!"];
    }

    const promptTokens = userPrompt.trim().split(/\s+/);
    let seedState = null;

    // Prepare the search query once. 
    // ORDER BY RANDOM() LIMIT 1 instantly picks a random match at the database level.
    const findSeed = db.prepare(`
      SELECT state FROM n_grams 
      WHERE state LIKE ? 
      ORDER BY RANDOM() LIMIT 1
    `);

    // Find the seed state
    for (let currentSize = ORDER; currentSize > 0; currentSize--) {
      if (seedState) break;

      for (let i = promptTokens.length - currentSize; i >= 0; i--) {
        const targetPhrase = promptTokens.slice(i, i + currentSize).join(' ');

        // The % wildcards allow the target phrase to be matched anywhere in the state
        const row = findSeed.get(`%${targetPhrase}%`);
        
        if (row) {
          seedState = row.state;
          break;
        }
      }
    }

    // Absolute Fallback if no match is found anywhere
    if (!seedState) {
      return this.generate(maxTokens);
    }

    // Prepare transition queries for both phases
    const getPrevTokens = db.prepare(`SELECT prev_token, frequency FROM reverse_transitions WHERE state = ?`);
    const getNextTokens = db.prepare(`SELECT next_token, frequency FROM transitions WHERE state = ?`);

    // --- PHASE 1: GENERATE BACKWARD ---
    let backwardTokens = [];
    let currentBackState = seedState;
    const maxBackTokens = Math.floor(maxTokens / 2);

    for (let i = 0; i < maxBackTokens; i++) {
      const possiblePrevTokens = getPrevTokens.all(currentBackState);
      if (possiblePrevTokens.length === 0) break;

      // Weighted random selection
      const totalWeight = possiblePrevTokens.reduce((sum, row) => sum + row.frequency, 0);
      let randomNum = Math.floor(Math.random() * totalWeight);
      
      let prevToken = null;
      for (const row of possiblePrevTokens) {
        randomNum -= row.frequency;
        if (randomNum < 0) {
          prevToken = row.prev_token;
          break;
        }
      }
      
      backwardTokens.unshift(prevToken);

      const stateArray = currentBackState.split(' ');
      stateArray.pop();
      stateArray.unshift(prevToken);
      currentBackState = stateArray.join(' ');

      if (['.', '?', '!'].includes(prevToken.slice(-1))) {
        backwardTokens.shift();
        break;
      }
    }

    // --- PHASE 2: GENERATE FORWARD ---
    let forwardTokens = [];
    let currentForwardState = seedState;
    const maxForwardTokens = maxTokens - backwardTokens.length - ORDER;

    for (let i = 0; i < maxForwardTokens; i++) {
      const possibleNextTokens = getNextTokens.all(currentForwardState);
      if (possibleNextTokens.length === 0) break;

      // Weighted random selection
      const totalWeight = possibleNextTokens.reduce((sum, row) => sum + row.frequency, 0);
      let randomNum = Math.floor(Math.random() * totalWeight);
      
      let nextToken = null;
      for (const row of possibleNextTokens) {
        randomNum -= row.frequency;
        if (randomNum < 0) {
          nextToken = row.next_token;
          break;
        }
      }
      
      forwardTokens.push(nextToken);

      const stateArray = currentForwardState.split(' ');
      stateArray.shift();
      stateArray.push(nextToken);
      currentForwardState = stateArray.join(' ');

      if (['.', '?', '!'].includes(nextToken.slice(-1))) {
         break;
      }
    }

    // --- PHASE 3: ASSEMBLE ---
    const seedArray = seedState.split(' ');
    const finalTokens = [...backwardTokens, ...seedArray, ...forwardTokens];

    let finalResponse = finalTokens.join(' ').trim();

    finalResponse = finalResponse.charAt(0).toUpperCase() + finalResponse.slice(1);
    if (!['.', '?', '!'].includes(finalResponse.slice(-1))) {
      finalResponse += '.';
    }

    return [finalResponse];
  }
}

export default MarkovGenerator