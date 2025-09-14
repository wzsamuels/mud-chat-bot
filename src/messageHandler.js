import * as ai from './ai.js';
import * as commands from './commands.js';
import { sendReply, logMessage } from './utils.js';
import { messageTypes } from './messagePatterns.js';
import { BOT_NAME } from './config.js';

async function processChatMessage(client, userMessage, userName, replyOptions) {
  if (userMessage.startsWith('@')) {
    commands.handleCommand(client, userMessage, userName, replyOptions);
    return;
  }

  const response = await ai.generateAIResponse(userMessage);
  if (response) {
    sendReply(client, userName, response, replyOptions);
  } else {
    sendReply(client, userName, "Oops, something went wrong with my AI", replyOptions);
  }
}

async function handleRecap(client, message) {
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
}

async function handleNormalMessage(client, message) {
  for (const type of messageTypes) {
    const match = message.trim().match(type.pattern);
    if (match) {
      const { userName, userMessage, replyOptions } = type.handler(match.groups);

      if (userName && userMessage) {
        // Bug Fix: Prevent the bot from replying to its own messages.
        if (userName.toLowerCase() === BOT_NAME.toLowerCase() || userName.toLowerCase() === 'you') {
          return; // Ignore messages from self.
        }
        logMessage(`${userName} to BOT: ${userMessage.replace(/\n/g, ' ')}`);
        await processChatMessage(client, userMessage, userName, replyOptions);
      }
      return; // Message handled, no need to check other patterns.
    }
  }
}

export async function handleMessage(client, message) {
  // If in recap mode, process recap lines
  if (commands.isRecapInProgress) {
    await handleRecap(client, message);
    return;
  }

  // Process normal messages
  await handleNormalMessage(client, message);
}