import readline from 'readline';
import Bot from './src/Bot.js';

const bot = new Bot('markov')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('You can start chatting with the bot. Type your message and press Enter.');

rl.on('line', async (input) => {
  const response = await bot.generateReply(input);
  if (response) {
    console.log(response)
    console.log('Bot: ' + response);
  }
  rl.prompt();
});