import net from 'net';
import readline from 'readline';
import {
  BOT_NAME,
  BOT_PASSWORD,
  MUD_HOST,
  MUD_PORT,
} from './src/config.js';

import { formatReply, logError, logMessage } from './src/utils.js';
import { messageTypes } from './src/messagePatterns.js';
import Bot from './src/Bot.js';

let client;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

const bot = new Bot()

function connect() {
  client = new net.Socket();

  client.connect(MUD_PORT, MUD_HOST, () => {
    console.log('Connected to the MUD server');
    client.write(`connect ${BOT_NAME} ${BOT_PASSWORD}\n`);
    reconnectAttempts = 0;
  });

  client.on('data', async (data) => {
    try {
      const message = data.toString().trim();
      logMessage(`[RECEIVED]: ${message}`);
      console.log(message)
      let reply = null;
      let userName, userMessage, whisper, channelName;
      for (const type of messageTypes) {
        const match = message.trim().match(type.pattern);
        
        if (match) {
          const { userName, userMessage, whisper, channelName} = type.handler(match.groups);
          console.log(userName, userMessage, whisper, channelName)
          if (!userName || !userMessage) {
            reply = ["Somehow you sent me a message that didn't have a user or text. How the hell did you do that?"];
            break;
          }
  
          // Bug Fix: Prevent the bot from replying to its own messages.
          if (userName.toLowerCase().includes(BOT_NAME.toLowerCase()) || userName.toLowerCase() === 'you') {
            reply = ["I can't respond to myself, idiot."];
            break;
          }

          reply = await bot.generateReply(userMessage);
          
          for (const line of reply) {
            console.log("Line: ", line)
            const formattedLine = formatReply(line, {userName, channelName, whisper})
            console.log(formattedLine)
            logMessage(`[REPLY]: ${formattedLine}`)

            client.write(formattedLine)
          }

          break;
        }
      }

    } catch (error) {
      logError(error, 'Message Handling');
    }
  });

  client.on('close', () => {
    console.log('Connection closed');
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
      );
      setTimeout(connect, RECONNECT_DELAY);
    } else {
      logError(new Error('Max reconnection attempts reached'), 'Connection');
      console.error('Max reconnection attempts reached. Exiting...');
      process.exit(1);
    }
  });

  client.on('error', (err) => {
    logError(err, 'Socket Error');
    console.error('Error:', err);
  });
}

if (process.env.TEST_MODE === 'true') {
  // Read user input from the console (for testing)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', (input) => {
    if (client && !client.destroyed) {
      client.write(input + '\n');
    }
  });

  rl.prompt();
}
connect();
