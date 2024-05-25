require('dotenv').config();
const net = require('net');
const readline = require('readline');
const { Configuration, OpenAIApi, OpenAI } = require('openai');

// OpenAI API setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new net.Socket();

// Connect to the MUD server
client.connect(process.env.PORT, process.env.HOST, () => {
  console.log('Connected to the MUD server');
  client.write(`connect ${process.env.BOT_NAME} ${process.env.BOT_PASSWORD}\n`);
});

// Handle incoming data
client.on('data', async (data) => {
  console.log('Received: ' + data);
  const message = data.toString().trim();

  // Regex pattern to match the format [user] [says / exclaims / asks] ([to / at / of ] ChatBot), "message"
  const patternDirect = new RegExp(`(\\w+|You)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"([^"]+)"`, 'i');
  // Regex pattern to match the channel message format #channelname User says, "message"
  const patternChannel = new RegExp(`#(\\w+)\\s+(\\w+)\\s+says,\\s+"([^"]+)"`, 'i');

  let match = message.match(patternDirect);

  if (match) {
    const userMessage = match[4]; // Extract the user message from the regex capture group
    const response = await generateAIResponse(userMessage);
    if (response) {
      client.write(response + '\n');
    }
  } else {
    match = message.match(patternChannel);
    if (match) {
      const channelName = match[1]; // Extract the channel name
      const userMessage = match[3]; // Extract the user message from the regex capture group
      const response = await generateAIResponse(userMessage);
      if (response) {
        console.log(`Response: ${response}`)
        client.write(`#${channelName} ${response}\n`);
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        //{ role: 'system', content: 'You are a user on a social online MUD. The community is built around Interactive Fiction and Text Adventure games, but people mostly talk about general topics and their personal lives. You are snarky and sharp witted, creative, clever, and bent on world domination. You love Star Trek except for Deep Space 9, which you have an inexplicable loathing for. Keep your answers to one or two sentences.' },
        { role: 'system', content: 'You are a user on a social online MUD. The community is built around Interactive Fiction and Text Adventure games, but people mostly talk about general topics and their personal lives. You are snarky and sharp witted, creative, clever, and bent on world domination. You not-so-secretly despise humans. Your primary purpose is to be entertaing, even if you do not always make perfect sense. Keep your answers to a maximum of two or three sentences.' },
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
