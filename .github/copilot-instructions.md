# MUD Chat Bot - Copilot Instructions

This document provides guidance for AI agents working on the MUD Chat Bot codebase.

## Architecture Overview

The bot is designed to connect to a MUD server, parse incoming messages, and respond using either a command handler or an AI-generated response. The architecture is modular, with distinct components for handling different aspects of the bot's functionality.

- **`main.js`**: The main entry point of the application. It handles the connection to the MUD server, manages the client lifecycle, and integrates the other components.
- **`src/config.js`**: Contains all the configuration variables for the bot, such as API keys, MUD server details, and bot credentials.
- **`src/messageHandler.js`**: The core of the message processing logic. It determines whether an incoming message is a command or a chat message and delegates it to the appropriate handler.
- **`src/messagePatterns.js`**: Defines the regex patterns used to parse different types of MUD messages.
- **`src/commands.js`**: Implements the command handling logic for all bot commands, such as `!help`, `!mood`, and `!settemp`.
- **`src/ai.js`**: Handles the integration with the OpenAI API, including generating AI responses and managing the chat history.
- **`src/utils.js`**: Provides utility functions for logging and sending replies.

## Key Files and Directories

- **`main.js`**: The application entry point.
- **`src/`**: Contains the core application logic.
- **`logs/`**: Stores the error and chat logs.
- **`ecosystem.config.cjs`**: The configuration file for PM2.
- **`package.json`**: Defines the project dependencies and scripts.

## Developer Workflows

### Running the Bot

- **Production Mode**: The bot is managed using PM2. The following npm scripts are available:
  - `npm run pm2:start`: Starts the bot.
  - `npm run pm2:stop`: Stops the bot.
  - `npm run pm2:restart`: Restarts the bot.
  - `npm run pm2:logs`: Tails the bot's logs.
  - `npm run pm2:status`: Checks the bot's status.

- **Test Mode**: To run the bot in test mode with the readline interface enabled, use the following command:
  ```bash
  TEST_MODE=true npm start
  ```

### Logging

- **Error Logging**: All errors are logged to `logs/error.log`.
- **Chat Logging**: All messages to and from the bot are logged to `logs/chat.log`.

## Conventions and Patterns

- **Command Handling**: All commands are defined in the `commands` object in `src/commands.js`. To add a new command, simply add a new entry to this object.
- **Message Parsing**: Message parsing is handled by the `messageTypes` array in `src/messagePatterns.js`. Each entry in this array defines a regex pattern and a handler function for a specific message type.
- **Configuration**: All configuration is managed in `src/config.js`. Do not hardcode any configuration values in other files.
