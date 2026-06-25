import { ANIME_PROMPT, SNARKY_PROMPT, SMART_PROMPT, PUNK_PROMPT } from './config.js';
import * as ai from './ai.js';
import { sendReply } from './utils.js';

const commands = {
  clearhistory: ({userName, channelName, whisper }, bot) => {
    const result = bot.clearChatHistory();
    const reply = formatReply(client, userName, `Chat history cleared .`, {
      channelName,
      whisper,
    });
    return [reply]
  },

  setmarkov: ({userName, channelName, whisper, args}, bot) => {
    const result = bot.setMarkov(args)
    reply = formatReply(userName, channelName `M`)
  },

  status: (userName, args, { channelName, whisper }) => {
    sendReply(client, userName, `Current mood: ${ai.getMood()}`, {
      channelName,
      whisper,
    });
    sendReply(
      client,
      userName,
      `Current temperature: ${ai.getTemperature()}`,
      {
        channelName,
        whisper,
      }
    );
    sendReply(client, userName, `Current prompt: ${ai.getSystemPrompt()}`, {
      channelName,
      whisper,
    });
    const promptHistory = ai.getPromptHistory();
    if (promptHistory.length > 0) {
      sendReply(client, userName, `Previous prompts:`, {
        channelName,
        whisper,
      });
      for (let i = 0; i < promptHistory.length; i++) {
        sendReply(client, userName, `[${i + 1}] ${promptHistory[i]}`, {
          channelName,
          whisper,
        });
      }
    }
  },

  prompt: ({ channelName, whisper, userName, args }, bot) => {
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
    return [formatReply(userName, result.message, { channelName, whisper })];
  },

  setprompt: (client, userName, args, { channelName, whisper }) => {
    commands.prompt(client, userName, args, { channelName, whisper });
  },

  help: ({userName, whisper}, bot) => {
    let reply = []
    reply.push(formatReply(
      `ChatBot has some commands to extend it's functionality. Only @help and @status commands can be whispered.`,
      { whisper: true, userName })
    );
    reply.push(formatReply(
      `@prompt [prompt] - Set's ChatBot's system prompt to [prompt].`,
      { whisper: true, userName })
    );
    reply.push(formatReply(
      `@temp [value] - Sets the temperature for AI responses (0.0 to 2.0).`,
      { whisper: true, userName })
    );
    reply.push(formatReply(
      `@clearhistory - Clears ChatBot's recent chat history.`,
      { whisper: true, userName })
    );
    reply.push(formatReply(
      `@markov [on/off] - Enables or disables the Markov chain response generator.`,
      { whisper: true, userName })
    );
    reply.push(formatReply(
      `@status - Shows ChatBot's current mood, system prompt, and recent prompt history.`,
      { whisper: true, userName })
    );
    sendReply(
      `The are also some built-in prompts: "anime", "snarky", "punk", and "smart". "Punk" is the default prompt.`,
      { whisper: true, userName }
    );
    return reply;
  },

  temp: ({userName, channelName }, bot) => {
    const result = bot.updateTemperature(newTemp);
    return [formatReply(result.message, {channelName, userName})];
  },
};
