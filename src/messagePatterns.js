import { BOT_NAME } from './config.js';

const patterns = {
  channel: `\\[(?<channelName>[^\\]]+)]\\s+(?<userNameChannel>\\w+)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${BOT_NAME}\\),\\s+"{1,}(?<userMessageChannel>[\\s\\S]+)"{1,}`,
  direct: `(?<userNameDirect>\\w+|You)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${BOT_NAME}\\),\\s+"{1,}(?<userMessageDirect>[\\s\\S]+)"{1,}`,
  whisper: `(?<userNameWhisper>\\w+|You)\\s+whispers,\\s+"{1,}(?<userMessageWhisper>[\\s\\S]+)"{1,}`
};

export const combinedPattern = new RegExp(
  `^(?:${patterns.channel}|${patterns.direct}|${patterns.whisper})$`,
  'i'
);