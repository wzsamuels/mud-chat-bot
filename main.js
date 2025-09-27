import net from 'net';
import readline from 'readline';
import {
  BOT_NAME,
  BOT_PASSWORD,
  MUD_HOST,
  MUD_PORT,
} from './src/config.js';
import { handleMessage } from './src/messageHandler.js';
import { logError } from './src/utils.js';

let client;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

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
      console.log('Received:', message);
      await handleMessage(client, message);
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