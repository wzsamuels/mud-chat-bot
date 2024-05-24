require('dotenv').config();
const readline = require('readline');
const { Configuration, OpenAIApi, OpenAI } = require('openai');

// OpenAI API setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read user input from the console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('You can start chatting with the bot. Type your message and press Enter.');

rl.on('line', async (input) => {
  const response = await generateAIResponse(input);
  if (response) {
    console.log('Bot: ' + response);
  }
  rl.prompt();
});

// Function to generate AI response using OpenAI
async function generateAIResponse(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        { role: 'system', content: 'You are a user on a social online MUD. The community is built around Interactive Fiction and Text Adventure games, but people mostly talk about general topics and their personal lives. You are snarky and sharp witted, creative, clever, and bent on world domination. You love Star Trek except for Deep Space 9, which you have an inexplicable loathing for.' },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    console.log(completion)

    const aiMessage = completion.choices[0].message.content.trim();
    return aiMessage;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
}

rl.prompt();
