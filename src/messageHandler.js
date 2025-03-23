import { BOT_NAME } from './config.js';
import * as ai from './ai.js';
import * as commands from './commands.js';
import { sendReply } from './utils.js';

function createMessagePatterns() {
  return {
    channel: new RegExp(
      `\\[([^\\]]+)]\\s+(\\w+)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${BOT_NAME}\\),\\s+"{1,}([\\s\\S]+)"{1,}`,
      'i'
    ),
    direct: new RegExp(
      `(\\w+|You)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${BOT_NAME}\\),\\s+"{1,}([\\s\\S]+)"{1,}`,
      'i'
    ),
    whisper: new RegExp(
      `(\\w+|You)\\s+whispers,\\s+"{1,}([\\s\\S]+)"{1,}`,
      'i'
    )
  };
}

export async function handleMessage(client, message) {
  const patterns = createMessagePatterns();
  
  // If in recap mode, process recap lines
  if (commands.isRecapInProgress) {
    const lines = message.split(/\r?\n/);
    for (const line of lines) {
      const result = commands.handleRecapLine(line);
      if (result.isComplete) {
        if (result.isError) {
          sendReply(
            client,
            result.recapRequester,
            "Sorry, I can't recap that channel (membership requested). If you own the channel, add me if you'd like!",
            {channelName: result.recapReplyChannel}
          );
        } else {
          const opinion = await ai.generateRecapOpinion(result.recapText);
          sendReply(client, result.recapRequester, opinion, {channelName: result.recapReplyChannel});
        }
        return;
      }
    }
    return;
  }

  // Process normal messages
  let match = message.match(patterns.channel);
  if (match) {
    const channelName = match[1];
    const userName = match[2];
    const userMessage = match[5];
    if (userMessage.startsWith('@')) {
      commands.handleCommand(client, userMessage, userName, {channelName: channelName, whisper: false});
      return;
    }
    const response = await ai.generateAIResponse(userMessage);
    if (response) {
      sendReply(client, userName, response, {channelName: channelName});
    } else {
      sendReply(client, userName, "Oops, something went wrong with my AI", {channelName: channelName});
    }
  } else {
    match = message.match(patterns.direct);
    if (match) {
      const userName = match[1];
      const userMessage = match[4];
      if (userMessage.startsWith('@')) {
        commands.handleCommand(client, userMessage, userName, {whisper: false});
        return;
      }
      const response = await ai.generateAIResponse(userMessage);
      if (response) {
        sendReply(client, userName, response);
      } else {
        sendReply(client, userName, "Oops, something went wrong with my AI");
      }
    } else {
      match = message.match(patterns.whisper);
      if (match) {
        const userName = match[1];
        const userMessage = match[2];
        if (userMessage.startsWith('@')) {
          commands.handleCommand(client, userMessage, userName, {whisper: true});
          return;
        }
        const response = await ai.generateAIResponse(userMessage);
        if (response) {
          sendReply(client, userName, response, {whisper: true});
        } else {
          sendReply(client, userName, "Oops, something went wrong with my AI", {whisper: true});
        }
      }
    }
  }
} 