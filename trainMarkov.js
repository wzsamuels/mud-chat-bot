import MarkovGenerator from './src/MarkovGenerator.js'

const bot = await MarkovGenerator.create()
console.log(bot)
let text = bot.generate()
console.log(text)

text = bot.generateReply("Your mother is a whore")
console.log(text)
