import MarkovGenerator from './src/MarkovGenerator.js'

const bot = new MarkovGenerator();
console.log(bot)
let text = bot.generate()
console.log(text)

text = bot.generateReply("Your mother is a whore")
console.log(text)
