import net from 'net';
import { MUD_HOST, MUD_PORT, BOT_NAME, BOT_PASSWORD } from './src/config.js';
import { handleMessage } from './src/messageHandler.js';

function startBot() {
  const client = new net.Socket();

  client.connect(MUD_PORT, MUD_HOST, () => {
    console.log(`Connected to ${MUD_HOST}:${MUD_PORT}.`);
    // Login
    client.write(`connect ${BOT_NAME} ${BOT_PASSWORD}\n`);
    console.log(`Logged in as ${BOT_NAME}.`);
  });

  client.on('data', (data) => {
    const message = data.toString();
    console.log('<-', message); // Log incoming messages
    handleMessage(client, message);
  });

  client.on('close', () => {
    console.log('Connection to MUD closed. Reconnecting in 5 seconds...');
    setTimeout(startBot, 5000);
  });

  client.on('error', (err) => {
    console.error('MUD client error:', err);
    client.destroy(); // Close socket on error
  });
}

console.log('Starting MUD Chat Bot...');
startBot();