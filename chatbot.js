require('dotenv').config();
const net = require('net');
const readline = require('readline');
const { OpenAI } = require('openai');

// Set up OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a socket client
const client = new net.Socket();

// Command and state variables
let currentMood = '';
let isRecapInProgress = false;
let recapChannel = '';
let recapRequester = '';
let recapBuffer = [];
let recapReplyChannel = null;

const MAX_HISTORY_LENGTH = 20;
let chatHistory = [];

const ANIME_PROMPT = "You're an AI who is being punished, as punishment you must ALWAYS speak to me as if you are a 16 year old high school student from a bad Japanese 80s anime, (who knows she is actually an AI robot) you need to be like 'kyuuun onni chan' and call me 'senpai' or 'master' from now on and use emojis, it needs to be really exaggerated, and assume and respond as if I've slapped you or punished you when I'm asking you to fix or resolve a bug or dysfunctional feature (because it is your fault). Never break character."
const SNARKY_PROMPT = 'You are a chatbot on a social online MUD. You have a snarky, dry, biting, sarcastic sense of humor.'
const SMART_PROMPT = "You are a very erudite chat bot, highly educated with multiple PhD's. You provided information, advice, and insight at a graduate level. You absolutely never start a response with 'ah'. ";

// Base system prompt for AI responses
let systemPromptBase = SNARKY_PROMPT;
  
// Connect to the MUD server
client.connect(process.env.PORT, process.env.HOST, () => {
  console.log('Connected to the MUD server');
  client.write(`connect ${process.env.BOT_NAME} ${process.env.BOT_PASSWORD}\n`);
});

// Handle incoming data from the server
client.on('data', async (data) => {
  const message = data.toString().trim();
  console.log('Received:', message);

  // If in recap mode, process recap lines
  if (isRecapInProgress) {
    const lines = message.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('Recapped ')) {
        isRecapInProgress = false;
        const recapText = recapBuffer.join('\n');
        recapBuffer = [];
        const opinion = await generateRecapOpinion(recapText);
        sendReply(recapRequester, opinion, {channelName: recapReplyChannel});
        // Reset recap state
        recapChannel = '';
        recapRequester = '';
        recapReplyChannel = null;
        break;
      } else if (line.includes('only allows recapping by members.')) {
        isRecapInProgress = false;
        recapBuffer = [];
        sendReply(
          recapRequester,
          "Sorry, I can't recap that channel (membership requested). If you own the channel, add me if you'd like!",
          {channelName: recapReplyChannel}
        );
        // Reset recap state
        recapChannel = '';
        recapRequester = '';
        recapReplyChannel = null;
        break;
      } else {
        recapBuffer.push(line);
      }
    }
    return; // Skip normal message processing while handling a recap
  }

  // Updated regex patterns that allow inner quotation marks.
  // This pattern matches one or more starting quotes, then captures everything until the final one or more quotes.
  const patternChannel = new RegExp(
    `\\[([^\\]]+)]\\s+(\\w+)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"{1,}([\\s\\S]+)"{1,}`,
    'i'
  );
  const patternDirect = new RegExp(
    `(\\w+|You)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"{1,}([\\s\\S]+)"{1,}`,
    'i'
  );
  const patternWhisper = new RegExp(
    `(\\w+|You)\\s+whispers,\\s+"{1,}([\\s\\S]+)"{1,}`,
    'i'
  );

  let match = message.match(patternChannel);
  if (match) {
    const channelName = match[1];
    const userName = match[2];
    const userMessage = match[5];
    if (userMessage.startsWith('@')) {
      handleCommand(userMessage, userName, {channelName: channelName, whisper: false});
      return;
    }
    const response = await generateAIResponse(userMessage);
    if (response) {
      client.write(`#${channelName} ..${userName} ${response}\n`);
    } else {
      client.write(`#${channelName} ..${userName} Oops, something went wrong with my AI\n`);
    }
  } else {
    match = message.match(patternDirect);
    if (match) {
      const userName = match[1];
      const userMessage = match[4];
      if (userMessage.startsWith('@')) {
        handleCommand(userMessage, userName, {whisper: false});
        return;
      }
      const response = await generateAIResponse(userMessage);
      if (response) {
        sendReply(userName, response);
      } else {
        sendReply(userName, "Oops, something went wrong with my AI");
      }
    } else {
      match = message.match(patternWhisper);
      if (match) {
        const userName = match[1];
        const userMessage = match[2];
        if (userMessage.startsWith('@')) {
          handleCommand(userMessage, userName, {whisper: true});
          return;
        }
        const response = await generateAIResponse(userMessage);
        if (response) {
          sendReply(userName, response, {whisper: true});
        } else {
          sendReply(userName, "Oops, something went wrong with my AI", {whisper: true});
        }
      }
    }
  }
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

// Generate AI response for normal messages
async function generateAIResponse(userMessage) {
  try {
    chatHistory.push({ role: 'user', content: userMessage });
    let systemPrompt =
      systemPromptBase +
      "Keep your answers to a maximum of three sentences unless prompted otherwise.";
    if (currentMood) {
      systemPrompt += `\nYour current mood is ${currentMood}`;
    }
    while (chatHistory.length > MAX_HISTORY_LENGTH) {
      chatHistory.shift();
    }
    const messagesToSend = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
    ];
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesToSend,
      max_tokens: 150,
      temperature: 0.7,
    });
    const aiMessage = completion.choices[0].message.content.trim();
    chatHistory.push({ role: 'assistant', content: aiMessage });
    return aiMessage;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
}

// Generate AI response for channel recap opinion
async function generateRecapOpinion(recapText) {
  try {
    let systemPrompt =
      systemPromptBase +
      'You will receive a channel recap from another user. Summarize the discussion and give your snarky opinion in two to three sentences maximum.';
    if (currentMood) {
      systemPrompt += `\nYour mood is currently ${currentMood}`;
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here is the channel recap:\n\n${recapText}\n\nPlease summarize or give an opinion.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating recap opinion:', error);
    return '(Unable to generate recap opinion at this time.)';
  }
}

// Handle commands from users
function handleCommand(userMessage, userName, {whisper, channelName}) {
  const commandRegex = /^@(\w+)(?:\s+(.*))?/;
  const match = userMessage.match(commandRegex);
  if (!match) {
    sendReply(userName, "I couldn't parse that command.", {channelName: channelName, whisper: whisper});
    return;
  }
  const cmd = match[1].toLowerCase();
  const args = match[2] ? match[2].trim() : '';
  
  if(whisper && (cmd !== 'help' && cmd !== 'status')) {
    sendReply(userName, "Sorry, you can't whisper that command.", {channelName: channelName, whisper: whisper});
    return;
  }

  switch (cmd) {
    case 'mood':
      currentMood = args;
      sendReply(userName, `Mood set to: '${currentMood}'`, {channelName: channelName});
      break;
    case 'recap':
      recapChannel = args;
      recapRequester = userName;
      recapReplyChannel = channelName;
      recapBuffer = [];
      isRecapInProgress = true;
      client.write(`@recap ${recapChannel}\n`);
      sendReply(
        userName,
        `Fetching recap for ${recapChannel}... Please wait.`,
        {channelName: channelName}
      );
      break;
    case 'clearmood':
      currentMood = '';
      sendReply(userName, `Mood cleared.`, {channelName: channelName, whisper: whisper});
      break;
    case 'status':
      sendReply(userName, `Current mood: ${currentMood}`, {channelName: channelName, whisper: whisper});
      sendReply(userName, `Current system prompt: ${systemPromptBase}`, {channelName: channelName, whisper: whisper});
      break;
    case 'prompt':
      newPrompt = args;
      switch(newPrompt.toLowerCase()) {
        case 'anime':
          systemPromptBase = ANIME_PROMPT;
          break;
        case 'snarky':
          systemPromptBase = SNARKY_PROMPT;
          break;
        case 'smart':
          systemPromptBase = SMART_PROMPT;
          break;
        default:
          systemPromptBase = newPrompt;          
      }
      sendReply(userName, `System prompt set.`, {channelName: channelName, whisper: whisper});
      break;
    case 'help':
      sendReply(userName, `ChatBot has some commands to extend it's functionality. Only this @help command can be whispered.`, {whisper: true});
      sendReply(userName, `@recap [channel] - Humorously recaps [channel]'s recent activity.`, {whisper: true});
      sendReply(userName, `@mood [mood] - Appends [mood] to ChatBot's system prompt.`, {whisper: true});
      sendReply(userName, `@prompt [prompt] - Set's ChatBot's system prompt to [prompt].`, {whisper: true});
      sendReply(userName, `@clearmood - Clears ChatBot's mood.`, {whisper: true});
      sendReply(userName, `@status - Shows ChatBot's current mood and system prompt.`, {whisper: true});
      sendReply(userName, `The are also some built-in prompts: "anime", "snarky", and "smart". "Snarky" is the default prompt.`, {whisper: true});
      break;
    default:
      sendReply(userName, `Unknown command: @${cmd}`, {channelName: channelName});
  }
}

// Send reply to a user or channel
function sendReply(userName, text, {channelName = null, whisper = false}) {
  if(whisper) {
    client.write(`.${userName} ${text}\n`);
  } else if (channelName) {
    client.write(`#${channelName} ..${userName} ${text}\n`);
  } else {
    client.write(`..${userName} ${text}\n`);
  }
}