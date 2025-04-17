import { ANIME_PROMPT, SNARKY_PROMPT, SMART_PROMPT } from './config.js';
import * as ai from './ai.js';
import { sendReply } from './utils.js';

let isRecapInProgress = false;
let recapChannel = '';
let recapRequester = '';
let recapBuffer = [];
let recapReplyChannel = null;

export function handleCommand(client, userMessage, userName, {whisper, channelName}) {
  const commandRegex = /^@(\w+)(?:\s+(.*))?/;
  const match = userMessage.match(commandRegex);
  if (!match) {
    sendReply(client, userName, "I couldn't parse that command.", {channelName: channelName, whisper: whisper});
    return;
  }
  const cmd = match[1].toLowerCase();
  const args = match[2] ? match[2].trim() : '';
  
  if(whisper && (cmd !== 'help' && cmd !== 'status')) {
    sendReply(client, userName, "Sorry, you can't whisper that command.", {channelName: channelName, whisper: whisper});
    return;
  }

  switch (cmd) {
    case 'mood':
      ai.setMood(args);
      sendReply(client, userName, `Mood set to: '${args}'`, {channelName: channelName});
      break;
    case 'recap':
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
        {channelName: channelName}
      );
      break;
    case 'clearhistory':
      ai.clearChatHistory();
      sendReply(client, userName, `Chat history cleared.`, {channelName: channelName, whisper: whisper});
      break;
    case 'status':
      sendReply(client, userName, `Current mood: ${ai.getMood()}`, {channelName: channelName, whisper: whisper});
      sendReply(client, userName, `Current prompt: ${ai.getSystemPrompt()}`, {channelName: channelName, whisper: whisper});
      const promptHistory = ai.getPromptHistory();
      if (promptHistory.length > 0) {
        sendReply(client, userName, `Previous prompts:`, {channelName: channelName, whisper: whisper});
        for (let i = 0; i < promptHistory.length; i++) {
          sendReply(client, userName, `[${i + 1}] ${promptHistory[i]}`, {channelName: channelName, whisper: whisper});
        }
      }
      break;
    case 'prompt':
      ai.clearChatHistory();
      let newPrompt = args;
      switch(newPrompt.toLowerCase()) {
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
      sendReply(client, userName, `System prompt set.`, {channelName: channelName, whisper: whisper});
      break;
    case 'help':
      sendReply(client, userName, `ChatBot has some commands to extend it's functionality. Only @help and @status commands can be whispered.`, {whisper: true});
      sendReply(client, userName, `@recap [channel] - Humorously recaps [channel]'s recent activity.`, {whisper: true});
      sendReply(client, userName, `@mood [mood] - Appends [mood] to ChatBot's system prompt.`, {whisper: true});
      sendReply(client, userName, `@prompt [prompt] - Set's ChatBot's system prompt to [prompt].`, {whisper: true});
      sendReply(client, userName, `@status - Shows ChatBot's current mood, system prompt, and recent prompt history.`, {whisper: true});
      sendReply(client, userName, `The are also some built-in prompts: "anime", "snarky", "punk", and "smart". "Punk" is the default prompt.`, {whisper: true});
      break;
    default:
      sendReply(client, userName, `Unknown command: @${cmd}`, {channelName: channelName});
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