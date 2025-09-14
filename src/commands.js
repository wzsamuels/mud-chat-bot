import { ANIME_PROMPT, SNARKY_PROMPT, SMART_PROMPT, PUNK_PROMPT } from './config.js';
import * as ai from './ai.js';
import { sendReply } from './utils.js';

let isRecapInProgress = false;
let recapChannel = '';
let recapRequester = '';
let recapBuffer = [];
let recapReplyChannel = null;

const commands = {
  mood: (client, userName, args, { channelName }) => {
    ai.setMood(args);
    sendReply(client, userName, `Mood set to: '${args}'`, { channelName });
  },
  recap: (client, userName, args, { channelName }) => {
    recapChannel = args;
    recapRequester = userName;
    recapReplyChannel = channelName;
    recapBuffer = [];
    isRecapInProgress = true;
    client.write(`@recap ${recapChannel}\n`);
    sendReply(
      client,
      userName,
      `Fetching recap for ${recapChannel}... Please wait.`,
      { channelName }
    );
  },
  clearhistory: (client, userName, args, { channelName, whisper }) => {
    ai.clearChatHistory();
    sendReply(client, userName, `Chat history cleared.`, {
      channelName,
      whisper,
    });
  },
  status: (client, userName, args, { channelName, whisper }) => {
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
  help: (client, userName) => {
    sendReply(
      client,
      userName,
      `ChatBot has some commands to extend it's functionality. Only @help and @status commands can be whispered.`,
      { whisper: true }
    );
    sendReply(
      client,
      userName,
      `@recap [channel] - Humorously recaps [channel]'s recent activity.`,
      { whisper: true }
    );
    sendReply(
      client,
      userName,
      `@mood [mood] - Appends [mood] to ChatBot's system prompt.`,
      { whisper: true }
    );
    sendReply(
      client,
      userName,
      `@prompt [prompt] - Set's ChatBot's system prompt to [prompt].`,
      { whisper: true }
    );
    sendReply(
      client,
      userName,
      `@settemp [value] - Sets the temperature for AI responses (0.0 to 2.0).`,
      { whisper: true }
    );
    sendReply(
      client,
      userName,
      `@status - Shows ChatBot's current mood, system prompt, and recent prompt history.`,
      { whisper: true }
    );
    sendReply(
      client,
      userName,
      `The are also some built-in prompts: "anime", "snarky", "punk", and "smart". "Punk" is the default prompt.`,
      { whisper: true }
    );
  },
  settemp: (client, userName, args, { channelName }) => {
    const newTemp = parseFloat(args);
    if (isNaN(newTemp) || newTemp < 0.0 || newTemp > 2.0) {
      sendReply(
        client,
        userName,
        'Invalid temperature. Please provide a number between 0.0 and 2.0.',
        { channelName }
      );
      return;
    }
    ai.setTemperature(newTemp);
    sendReply(client, userName, `Temperature set to: ${newTemp}`, {
      channelName,
    });
  },
};

export function handleCommand(
  client,
  userMessage,
  userName,
  { whisper, channelName }
) {
  const commandRegex = /^@(\w+)(?:\s+(.*))?/;
  const match = userMessage.match(commandRegex);
  if (!match) {
    sendReply(client, userName, "I couldn't parse that command.", {
      channelName: channelName,
      whisper: whisper,
    });
    return;
  }
  const cmd = match[1].toLowerCase();
  const args = match[2] ? match[2].trim() : '';

  if (whisper && cmd !== 'help' && cmd !== 'status') {
    sendReply(client, userName, "Sorry, you can't whisper that command.", {
      channelName: channelName,
      whisper: whisper,
    });
    return;
  }

  const command = commands[cmd];
  if (command) {
    command(client, userName, args, { whisper, channelName });
  } else {
    sendReply(client, userName, `Unknown command: @${cmd}`, {
      channelName: channelName,
    });
  }
}

export function handleRecapLine(line) {
  if (line.startsWith('Recapped ')) {
    isRecapInProgress = false;
    const recapText = recapBuffer.join('\n');
    recapBuffer = [];
    return {
      isComplete: true,
      recapText,
      recapRequester,
      recapReplyChannel
    };
  } else if (line.includes('only allows recapping by members.')) {
    isRecapInProgress = false;
    recapBuffer = [];
    return {
      isComplete: true,
      isError: true,
      recapRequester,
      recapReplyChannel
    };
  } else {
    recapBuffer.push(line);
    return { isComplete: false };
  }
}

export { isRecapInProgress };