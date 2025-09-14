import { BOT_NAME } from './config.js';

// Regex for channel messages directed at the bot.
// Example: [SomeChannel] Player says (to ChatBot), "hello there"
const channelPattern = new RegExp(
  `^\\[(?<channelName>[^\\]]+)]\\s+(?<userName>\\w+)\\s+(?:says|exclaims|asks)\\s+\\((?:to|at|of)\\s+${BOT_NAME}\\),\\s+"(?<userMessage>[\\s\\S]+)"$`,
  'i'
);

// Regex for direct messages (says) to the bot.
// Example: Player says (to ChatBot), "how are you?"
const directPattern = new RegExp(
  `^(?<userName>\\w+|You)\\s+(?:says|exclaims|asks)\\s+\\((?:to|at|of)\\s+${BOT_NAME}\\),\\s+"(?<userMessage>[\\s\\S]+)"$`,
  'i'
);

// Regex for whispers to the bot.
// Example: Player whispers, "this is a secret"
const whisperPattern = new RegExp(
  `^(?<userName>\\w+|You)\\s+whispers,\\s+"(?<userMessage>[\\s\\S]+)"$`,
  'i'
);

export const messageTypes = [
  {
    name: 'channel',
    pattern: channelPattern,
    handler: (groups) => ({
      userName: groups.userName,
      userMessage: groups.userMessage,
      replyOptions: { channelName: groups.channelName, whisper: false }
    })
  },
  {
    name: 'direct',
    pattern: directPattern,
    handler: (groups) => ({
      userName: groups.userName,
      userMessage: groups.userMessage,
      replyOptions: { whisper: false }
    })
  },
  {
    name: 'whisper',
    pattern: whisperPattern,
    handler: (groups) => ({
      userName: groups.userName,
      userMessage: groups.userMessage,
      replyOptions: { whisper: true }
    })
  }
];