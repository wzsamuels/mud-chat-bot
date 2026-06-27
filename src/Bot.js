import fs from 'fs';
import path from 'path';

import { logError } from './utils.js';
import MarkovGenerator from './MarkovGenerator.js'
import { LLMGenerator } from './LLMGenerator.js';
import commands from './commands.js';

export class Bot {
  #llm;
  #markov;
  #activeGenerator
  #config = { useLLM: true };

  constructor() {
    this.#llm = new LLMGenerator();
    this.#markov = new MarkovGenerator();
    this.#activeGenerator = this.#llm
  }

  getPromptHistory() {
    return this.#llm.promptHistory;
  }

  getTemperature() {
    return this.#llm.temperature;
  }

  getMarkovMode() {
    return this.#activeGenerator == this.#llm ? 'off' : 'on';
  }

  getPrompt() {
    return this.#llm.prompt;
  }

  updatePrompt(newPrompt) {
    return this.#llm.updatePrompt(newPrompt);
  }

  updateTemperature(newTemp) {
    return this.#llm.updateTemperature(newTemp)
  }

  clearChatHistory() {
    this.#llm.clearChatHistory();
  }
  
  async generateReply(text) {
    if (this.#isCommand(text)) {
      console.log("Command detected")
      return this.#executeCommand(text);
    }

    return this.#activeGenerator.generateReply(text)
  }

  #isCommand(text) {
    return text.startsWith('@');
  }

  #executeCommand(text) {
    const commandRegex = /^@(\w+)(?:\s+(.*))?/;
    const match = text.match(commandRegex);
    if (!match) {
      return ["I couldn't parse that command."]
    }
    const cmd = match[1].toLowerCase();
    const args = match[2] ? match[2].trim() : '';

    console.log(cmd, args)

    const command = commands[cmd];
    console.log(command)
    if (commands[cmd]) {
      return command(args, this);
    } else {
      return [`Unknown command: @${cmd}`];
    }
  }

  setMarkov(value) {
    const mode = value?.toLowerCase().trim();
    console.log(mode)

    if (!mode || (mode !== 'on' && mode !== 'off')) {
      return { success: false, message: `This command requires an argument of either "on" or "off".`}
    }
      
    if (mode === 'on') {
      this.#activeGenerator = this.#markov;
      return { success: true, message: `Markov mode enabled.`}
    } else {
      this.#activeGenerator = this.#llm;
      return { success: true, message: `Markov mode disabled.`}
    }
  }

  updateOrder(newOrder) {
    return this.#markov.updateOrder(newOrder);
  }
};

export default Bot;