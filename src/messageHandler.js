import * as ai from './ai.js';
import * as commands from './commands.js';
import { sendReply } from './utils.js';
import { combinedPattern } from './messagePatterns.js';

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
  const match = message.match(combinedPattern);

  if (match) {
    const groups = match.groups;
    let userName, userMessage, replyOptions;

    if (groups.channelName) {
      userName = groups.userNameChannel;
      userMessage = groups.userMessageChannel;
      replyOptions = { channelName: groups.channelName, whisper: false };
    } else if (groups.userNameDirect) {
      userName = groups.userNameDirect;
      userMessage = groups.userMessageDirect;
      replyOptions = { whisper: false };
    } else if (groups.userNameWhisper) {
      userName = groups.userNameWhisper;
      userMessage = groups.userMessageWhisper;
      replyOptions = { whisper: true };
    }

    if (userName && userMessage) {
      await processChatMessage(client, userMessage, userName, replyOptions);
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