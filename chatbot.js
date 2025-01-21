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
let currentMood = '';        // from your existing code
let isRecapInProgress = false;
let recapChannel = '';
let recapRequester = '';     // the username of who asked for the recap
let recapBuffer = [];        // to store lines of the MUD’s recap
let recapReplyChannel = null; // store the channel context if needed

// Connect to the MUD server
client.connect(process.env.PORT, process.env.HOST, () => {
  console.log('Connected to the MUD server');
  client.write(`connect ${process.env.BOT_NAME} ${process.env.BOT_PASSWORD}\n`);
});

// Handle incoming data
client.on('data', async (data) => {
  
  const message = data.toString().trim();
  console.log('Received:', message);

  // 1) If we are in recap mode, collect lines
  //    *unless* we detect an "end-of-recap" signal.
  if (isRecapInProgress) {
    // Split the received chunk on newlines
    const lines = message.split(/\r?\n/);
  
    for (const line of lines) {
      // If this line starts with "Recapped "
      // (or matches a regex if you want a more flexible check)
      if (line.startsWith('Recapped ')) {
        // End of recap
        isRecapInProgress = false;
  
        // Join everything we’ve buffered so far, plus any lines we got before this one
        const recapText = recapBuffer.join('\n');
        recapBuffer = []; // clear for next time
  
        // Generate opinion
        const opinion = await generateRecapOpinion(recapText);
        sendReply(recapRequester, opinion, recapReplyChannel);
  
        // Reset state
        recapChannel = '';
        recapRequester = '';
        recapReplyChannel = null;
  
        // Because we found the end-of-recap line, we don’t add it to the buffer
        // or process further lines in this chunk. 
        // You can `break;` if you like, 
        // but be aware there *could* be more lines after "Recapped...".
        // For safety, you might want to `continue;` or `break;`
        break;
      } else if (line.includes('only allows recapping by members.')) {
        isRecapInProgress = false;
        recapBuffer = [];

        sendReply(
          recapRequester,
          "Sorry, I can't recap that channel (membership requested). If you own the channel, add me if you'd like!",
          recapReplyChannel
        );

        // Reset state
        recapChannel = '';
        recapRequester = '';
        recapReplyChannel = null;

        break;
      } else {
        // We’re still in the recap lines
        recapBuffer.push(line);
      }
    }
  
    // Important: Return to avoid your normal message handling below
    return;
  }

  // 2) If not in recap mode, do your usual detection:
  // (the channel message pattern, the direct message pattern, etc.)
  const patternChannel = new RegExp(
    `\\[([^\\]]+)]\\s+(\\w+)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"([^"]+)"`,
    'i'
  );
  const patternDirect = new RegExp(
    `(\\w+|You)\\s+(says|exclaims|asks)\\s+\\((to|at|of)\\s+${process.env.BOT_NAME}\\),\\s+"([^"]+)"`,
    'i'
  );

    // 4) **New** regex for whispers (i.e. "Player whispers, 'blah'")
  //    You can capture "You" as well if needed:
  const patternWhisper = new RegExp(
    `(\\w+|You)\\s+whispers,\\s+"([^"]+)"`,
    'i'
  );

  let match = message.match(patternChannel);
  if (match) {
    const channelName = match[1];
    const userName = match[2];
    const userMessage = match[5];

    // Is it a command?
    if (userMessage.startsWith('@')) {
      handleCommand(userMessage, userName, channelName);
      return;
    }

    const response = await generateAIResponse(userMessage);
    if (response) {
      client.write(`#${channelName} ..${userName} ${response}\n`);
    } else {
      client.write(`#${channelName} ..${userName} Oops, something went wrong with my AI`)
    }
  } else {
    match = message.match(patternDirect);
    if (match) {
      const userName = match[1];
      const userMessage = match[4];

      if (userMessage.startsWith('@')) {
        handleCommand(userMessage, userName);
        return;
      }

      const response = await generateAIResponse(userMessage);
      if (response) {
        client.write(`..${userName} ${response}\n`);
      } else {
        client.write(`..${userName} Oops, something went wrong with my AI`)
      }
    } else {
      match = message.match(patternWhisper);
      if (match) {
        const userName = match[1];
        const userMessage = match[2];

        if (userMessage.startsWith('@')) {
          handleCommand(userMessage, userName);
          return;
        }

        const response = await generateAIResponse(userMessage);
        if (response) {
          client.write(`.${userName} ${response}\n`)
        } else {
          client.write(`.${userName} Oops, something went wrong with my AI`)
        }
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
  const commandRegex = /^@(\w+)\s+(.*)/;
  const match = userMessage.match(commandRegex);

  if (!match) {
    sendReply(userName, "I couldn't parse that command.", channelName);
    return;
  }

  const cmd = match[1].toLowerCase();  // e.g. 'recap'
  const args = match[2].trim();        // e.g. '#channelname'

  switch (cmd) {
    case 'setmood':
      currentMood = args;
      sendReply(userName, `Mood set to: '${currentMood}'`, channelName);
      break;

    case 'recap':
      // 1) parse the channel name, e.g. "#channelname"
      recapChannel = args;
      recapRequester = userName;
      recapReplyChannel = channelName;

      // 2) clear out the recap buffer
      recapBuffer = [];
      isRecapInProgress = true;

      // 3) tell the MUD to send the recap lines for that channel
      //    Adjust this line to whatever your MUD's syntax is
      client.write(`@recap ${recapChannel}\n`);

      // 4) Let the user know we’re fetching the recap
      sendReply(
        userName, 
        `Fetching recap for ${recapChannel}... Please wait.`, 
        channelName
      );
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
async function generateRecapOpinion(recapText) {
  try {
    let systemPrompt = 
      'You are a witty, creative, and clever user on a social online MUD. ' +
      'You will receive a channel recap from another user. ' +
      'Summarize the discussion and give your snarky opinion in two to three sentences maximum.';

    if (currentMood) {
      systemPrompt += `\nCurrent mood: ${currentMood}`;
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
