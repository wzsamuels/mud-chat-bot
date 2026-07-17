// MarkovGenerator.js
import fs from 'fs'
import path from 'path'

class MarkovGenerator {
  #persona

  constructor(persona = 'modern') {
    this.#persona = persona; 
  }

  commands = {
    status: () => this.status(),
    markov_persona: (args) => this.updatePersona(args),
  };

  status() {
    let status = [
      `Current AI: Markov`,
      `Current persona: ${this.#persona}`,
      `Current prompt: N/A`,
      `Current temperature: N/A`,
    ]
    
    return status;
  }

  updatePersona(newPersona) {
    if (!newPersona || (newPersona !== 'modern' && newPersona !== 'classic' && newPersona !== 'blended'))
      return [`[ERROR]: ${newPersona} is not a valid persona.`];

    this.#persona = newPersona;
    return [`Persona updated to ${this.#persona}`];
  }

  async generateReply(userPrompt, maxTokens = 30) {
    // Quick check to ensure the database is populated
    const apiUrl = "http://127.01.1:3001/generate";
    const payload = {
      prompt: userPrompt,
      persona: this.#persona   
    }
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return [data];
    } catch (error) {
      console.error('Error generating reply:', error);
      return [`[ERROR]: Failed to generate reply.`];
    }
  }
}

export default MarkovGenerator