import { ANIME_PROMPT, SNARKY_PROMPT, SMART_PROMPT, PUNK_PROMPT } from './config.js';

const commands = {
  clearhistory: (args, bot) => {
    bot.clearChatHistory();
    return["Chat history cleared"];
  },

  markov: (args, bot) => {
    const result = bot.setMarkov(args)
    return [result.message]
  },

  status: (args, bot) => {
    let reply = [
      `Current temperature: ${bot.getTemperature()}`,
      `Current prompt: ${bot.getPrompt()}`,
      `Markov Mode: ${bot.getMarkovMode()}`
    ]
    const promptHistory = bot.getPromptHistory();
    if (promptHistory.length > 0) {
      reply.push("Previous prompts:")
      for (let i = 0; i < promptHistory.length; i++) {
        reply.push(`[${i + 1}] ${promptHistory[i]}`)
      }
    }
    return reply;
  },

  prompt: (args, bot) => {
    bot.clearChatHistory();
    let newPrompt = args;
    let result 
    switch (newPrompt.toLowerCase()) {
      case 'anime':
        result = bot.updatePrompt(ANIME_PROMPT);
        break;
      case 'snarky':
        result = bot.updatePrompt(SNARKY_PROMPT);
        break;
      case 'smart':
        result = bot.updatePrompt(SMART_PROMPT);
        break;
      case 'punk':
        result = bot.updatePrompt(PUNK_PROMPT);
        break;
      default:
        result = bot.updatePrompt(newPrompt);
    }
    return [result.message];
  },

  help: (args, bot) => {
    let reply = [ 
      "ChatBot has some commands to extend it's functionality.",
      "@prompt [prompt] - Set's ChatBot's system prompt to [prompt].",
      "The are also some built-in prompts: 'anime', 'snarky', 'punk', and 'smart'. 'Punk' is the default prompt.",
      "@temp [value] - Sets the temperature for AI responses (0.0 to 2.0).",
      "@clearhistory - Clears ChatBot's recent chat history.",
      "@markov [on/off] - Enables or disables the Markov chain response generator. ChatBot's prompt has no effect in Markov mode.",
      "@status - Shows ChatBot's current prompt, temperature, and recent prompt history."
    ];
    console.log(reply)
    return reply;
  },

  temp: (args, bot) => {
    const result = bot.updateTemperature(args);
    return [result.message];
  },
};

export default commands;