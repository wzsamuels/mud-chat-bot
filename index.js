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
  // Send initial commands if necessary
  // client.write('your_initial_command\n');
});

// Handle incoming data
client.on('data', async (data) => {
  console.log('Received: ' + data);
  const message = data.toString().trim();

  // Regex pattern to match the format [user] [says / exclaims / asks] ([to / at / of ] ChatBot)
  const pattern = new RegExp(`\\[([^\\]]+)]\\s+(\\w+)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"([^"]+)"`, 'i');
  const match = message.match(pattern);

  if (match) {
    const userMessage = message.split(')').slice(1).join(')').trim(); // Extract the message content
    const response = await generateAIResponse(userMessage);
    if (response) {
      client.write('#chatbot ' + response + '\n');
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
      model: 'gpt-3.5-turbo-0125',
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
