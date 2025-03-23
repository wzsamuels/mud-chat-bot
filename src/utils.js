export function sendReply(client, userName, text, {channelName = null, whisper = false}) {
  if(whisper) {
    client.write(`.${userName} ${text}\n`);
  } else if (channelName) {
    client.write(`#${channelName} ..${userName} ${text}\n`);
  } else {
    client.write(`..${userName} ${text}\n`);
  }
}

module.exports = {
  sendReply
}; 