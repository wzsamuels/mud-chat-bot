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

  prompt: (client, userName, args, { channelName, whisper }) => {
    ai.clearChatHistory();
    let newPrompt = args;
    switch (newPrompt.toLowerCase()) {
      case 'anime':
        ai.setSystemPrompt(ANIME_PROMPT);
        break;
      case 'snarky':
        ai.setSystemPrompt(SNARKY_PROMPT);
        break;
      case 'smart':
        ai.setSystemPrompt(SMART_PROMPT);
        break;
      case 'punk':
        ai.setSystemPrompt(PUNK_PROMPT);
        break;
      default:
        ai.setSystemPrompt(newPrompt);
    }
    sendReply(client, userName, `System prompt set.`, { channelName, whisper });
  },

  setprompt: (client, userName, args, { channelName, whisper }) => {
    commands.prompt(client, userName, args, { channelName, whisper });
  },

  help: ({userName, whisper}, bot) => {
    let reply = []
    reply.push(formatReply(
      userName,
      `ChatBot has some commands to extend it's functionality. Only @help and @status commands can be whispered.`,
      { whisper: true })
    );
    reply.push(formatReply(
      userName,
      `@mood [mood] - Appends [mood] to ChatBot's system prompt.`,
      { whisper: true }
    );
    reply.push(formatReply(
      userName,
      `@prompt [prompt] / @setprompt [prompt] - Set's ChatBot's system prompt to [prompt].`,
      { whisper: true }
    );
    reply.push(formatReply(
      userName,
      `@settemp [value] - Sets the temperature for AI responses (0.0 to 2.0).`,
      { whisper: true }
    );
    reply.push(formatReply(
      userName,
      `@status - Shows ChatBot's current mood, system prompt, and recent prompt history.`,
      { whisper: true }
    );
    sendReply(
      userName,
      `The are also some built-in prompts: "anime", "snarky", "punk", and "smart". "Punk" is the default prompt.`,
      { whisper: true }
    );
    return reply;
  },

  settemp: ({userName, channelName }, bot) => {
    const result = bot.updateTemperature(newTemp);
    const reply = formatReply(userName, result.message, {channelName});
  },
};
