import fs from 'fs';
import path from 'path';

import { logError } from './utils.js';
import MarkovGenerator from './MarkovGenerator.js'
import LLMGenerator from './LLMGenerator.js';
import SLMGenerator from './SLMGenerator.js';

const helpMessage = [ 
  "ChatBot has some commands to extend it's functionality. Not all commands are available for all AI models.",
  "@ai [llm/slm/markov] - Switches the current AI model to either LLM, SLM, or Markov. The default is Markov.",
  "@prompt [prompt] - Set's ChatBot's system prompt to [prompt].",
  "@temp [value] - Sets the temperature for AI responses (0.0 to 2.0).",
  "@clearhistory - Clears ChatBot's recent chat history.",
  "@status - Shows ChatBot's current prompt, temperature, and recent prompt history."
];

export class Bot {
  #llm;
  #slm;
  #markov;
  #activeGenerator;

  systemCommands = {
    ai: (args) => [this.setGenerator(args).message],
    help: (args) => helpMessage,
  };

  constructor(generator = 'markov') {
    if (!['llm', 'slm', 'markov'].includes(generator)) {
      throw new Error(`Invalid generator type: ${generator}. Must be either 'llm', 'slm', or 'markov'.`);
    }

    this.#llm = new LLMGenerator();
    this.#slm = new SLMGenerator();
    this.#markov = new MarkovGenerator();

    switch (generator) {
      case 'llm':
        this.#activeGenerator = this.#llm;
        break;
      case 'slm':
        this.#activeGenerator = this.#slm;
        break;
      case 'markov':
        this.#activeGenerator = this.#markov;
        break;
    } 
  }
  
  async generateReply(text) {
    if (text.startsWith('@')) {
      return this.#executeCommand(text);
    }

    return this.#activeGenerator.generateReply(text)
  }

  #executeCommand(text) {
    const commandRegex = /^@(\w+)(?:\s+(.*))?/;
    const match = text.match(commandRegex);
    if (!match) {
      return ["I couldn't parse that command."]
    }
    const cmd = match[1].toLowerCase();
    const args = match[2] ? match[2].trim() : '';

    if(this.systemCommands[cmd]) {
      return this.systemCommands[cmd](args);
    } else if (this.#activeGenerator.commands?.[cmd]) {
      return this.#activeGenerator.commands[cmd](args);
    } else {
      return [`Unknown command for this AI model: @${cmd}`];
    }
  }

  setGenerator(generator) {
    const gen = generator?.toLowerCase().trim();
    console.log(gen)

    if (!gen || (gen !== 'llm' && gen !== 'markov' && gen !== 'slm')) {
      return [`This command requires an argument of either "llm", "markov", or "slm".`];
    }
      
    if (gen === 'markov') {
      this.#activeGenerator = this.#markov;
      return { success: true, message: `Active generator set to Markov.`}
    } else if (gen === 'slm') {
      this.#activeGenerator = this.#slm;
      return [`Active generator set to SLM.`];
    } else {
      this.#activeGenerator = this.#llm;
      return [`Active generator set to LLM.`]
    }
  }
};

export default Bot;