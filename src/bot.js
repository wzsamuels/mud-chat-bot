import net from 'net';
import readline from 'readline';
import { BOT_NAME, BOT_PASSWORD, HOST, PORT } from './config.js';
import { handleMessage } from './messageHandler.js';

// Create a socket client
const client = new net.Socket();

// Connect to the MUD server
client.connect(PORT, HOST, () => {
  console.log('Connected to the MUD server');
  client.write(`connect ${BOT_NAME} ${BOT_PASSWORD}\n`);
});

// Handle incoming data from the server
client.on('data', async (data) => {
  const message = data.toString().trim();
  console.log('Received:', message);
  await handleMessage(client, message);
});

// Handle connection close and errors
client.on('close', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Error: ' + err);
});

// Read user input from the console (for testing)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (input) => {
  client.write(input + '\n');
});

rl.prompt(); 