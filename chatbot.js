require('dotenv').config();
const net = require('net');
const readline = require('readline');
const { Configuration, OpenAIApi, OpenAI } = require('openai');

// OpenAI API setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new net.Socket();

// Command variables
let currentMood = '';

// Connect to the MUD server
client.connect(process.env.PORT, process.env.HOST, () => {
  console.log('Connected to the MUD server');
  client.write(`connect ${process.env.BOT_NAME} ${process.env.BOT_PASSWORD}\n`);
});

// Handle incoming data
client.on('data', async (data) => {
  console.log('Received: ' + data);
  const message = data.toString().trim();

  // Regex pattern to match the channel message format:
  const patternChannel = new RegExp(`\\[([^\\]]+)]\\s+(\\w+)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"([^"]+)"`, 'i');
  // Regex pattern to match the direct message format:
  const patternDirect = new RegExp(`(\\w+|You)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"([^"]+)"`, 'i');

  let match = message.match(patternChannel);

  if (match) {
    const channelName = match[1];
    const userName = match[2];
    const userMessage = match[5];

    // 1) Check if userMessage is a command (i.e. starts with '@')
    if (userMessage.startsWith('@')) {
      handleCommand(userMessage, userName, channelName); // We'll define this function below
      return;  // No need to go to OpenAI
    }

    // 2) Normal (non-command) case:
    const response = await generateAIResponse(userMessage);
    if (response) {
      client.write(`#${channelName} ..${userName} ${response}\n`);
    }
  } else {
    match = message.match(patternDirect);
    if (match) {
      const userName = match[1];
      const userMessage = match[4];

      // 1) Check if userMessage is a command
      if (userMessage.startsWith('@')) {
        handleCommand(userMessage, userName);
        return;
      }

      // 2) Normal (non-command) case:
      const response = await generateAIResponse(userMessage);
      if (response) {
        client.write(`..${userName} ${response}\n`);
      }
    }
  }
});

// Handle connection close
client.on('close', () => {
  console.log('Connection closed');
});

// Handle errors
client.on('error', (err) => {
  console.error('Error: ' + err);
});

// Read user input from the console (for testing purposes)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  client.write(input + '\n');
});

// Function to generate AI response using OpenAI
async function generateAIResponse(message) {
  try {
    // Build a system prompt that includes `currentMood`, if any
    let systemPrompt = 
      'You are a user on a social online MUD. ' +
      'The community is built around Interactive Fiction and Text Adventure games, ' +
      'but people mostly talk about general topics and their personal lives. ' +
      'You are snarky, witty, creative, and clever. ' +
      'Keep your answers to a maximum of two or three sentences.';

    // If we have a mood set, insert it:
    if (currentMood) {
      systemPrompt += `\nCurrent mood: ${currentMood}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiMessage = completion.choices[0].message.content.trim();
    return aiMessage;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
}

rl.prompt();

function handleCommand(userMessage, userName, channelName = null) {
  // This regex captures:
  // 1) a literal '@'
  // 2) one or more word characters (\w+)
  // 3) one or more spaces (\s+)
  // 4) everything else in the line (.*)
  const commandRegex = /^@(\w+)\s+(.*)/;
  const match = userMessage.match(commandRegex);

  if (!match) {
    // Could not parse a valid command
    sendReply(userName, "I couldn't parse that command. Example usage: @setmood whimsical genius", channelName);
    return;
  }

  const cmd = match[1];  // e.g. "setmood"
  const args = match[2]; // e.g. "whimsical genius"

  switch (cmd.toLowerCase()) {
    case 'setmood':
      currentMood = args.trim();  // Save the entire multi-word string
      sendReply(userName, `Mood set to: '${currentMood}'`, channelName);
      break;

    default:
      sendReply(userName, `Unknown command: @${cmd}`, channelName);
  }
}

function sendReply(userName, text, channelName) {
  if (channelName) {
    // Send to channel
    client.write(`#${channelName} ..${userName} ${text}\n`);
  } else {
    // Direct user
    client.write(`..${userName} ${text}\n`);
  }
}