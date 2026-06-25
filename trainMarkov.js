import MarkovGenerator from './src/MarkovGenerator.js'

const bot = new MarkovGenerator()

await bot.buildCorpus()

let text = bot.generate()
console.log(text)

text = bot.generateReply("How are you doing today?")
console.log(text)
