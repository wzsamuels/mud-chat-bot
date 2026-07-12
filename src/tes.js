class Bot {
  constructor(initialGenerator) {
    this.generator = initialGenerator;
    
    // 1. Bot-level system commands
    this.systemCommands = {
      'switch': (genType) => this.switchGenerator(genType),
      'help': () => this.showHelpMenu(),
    };
  }

  async handleUserMessage(message) {
    if (!message.startsWith('@')) {
      // Normal chat loop
      const reply = await this.generator.generateText(message);
      this.sendToUser(reply);
      return;
    }

    // Parse the command (e.g., "@temp 1.2" -> name: "temp", value: "1.2")
    const [commandName, value] = message.slice(1).split(' ');

    // 2. Try to run a Bot-level system command first
    if (this.systemCommands[commandName]) {
      const response = this.systemCommands[commandName](value);
      this.sendToUser(response);
      return;
    }

    // 3. Fall through: Check if the active generator can handle it
    const generatorHandler = this.generator.commands?.[commandName];
    if (generatorHandler) {
      const response = generatorHandler(value);
      this.sendToUser(response);
      return;
    }

    // 4. Command wasn't found anywhere
    this.sendToUser(`Error: Unknown command @${commandName} for the current setup.`);
  }

  switchGenerator(type) {
    // Logic to change this.generator...
    return `Switched engine to ${type}`;
  }

  showHelpMenu() {
    return "System Commands: @switch, @help";
  }

  sendToUser(text) { console.log(text); }
}