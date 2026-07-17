// SLMGenerator.js

class SLMGenerator {
  #temperature;

  constructor(temperature = 1.0) {
    this.#temperature = temperature;
  }

  commands = { 
    status: () => this.status(),
    temp: (newTemp) => this.setTemperature(newTemp),
  };

  status() {
    return [
        `Current AI: SLM`,
        `Current temperature: ${this.#temperature}`,
        `Current prompt: N/A`,
    ];
  }

  setTemperature(newTemp) {
    const temp = parseFloat(newTemp);
    if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
      return ["Temperature must be a number between 0.0 and 2.0."];
    }
    this.#temperature = temp;
    return [`Temperature set to ${this.#temperature}`];
  }

  async generateReply(userMessage) {
    const apiUrl = SLM_API; 

    // This payload explicitly matches your Python FastAPI ChatRequest Pydantic model
    const payload = {
      prompt: userMessage,
      temperature: this.#temperature,       // Adjust for chaos level (0.8 - 1.2 is the sweet spot)
      max_new_tokens: 50      // Prevents the model from generating infinitely
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      // FastAPI returns the dictionary we defined: {"response": "clean_response"}
      return [data.response.trim().replace(/(\r\n|\n|\r)/gm, " ")];
      

    } catch (error) {
      console.error("Failed to communicate with the Victorian Troll API:", error);
      return ["*Chatbot glares at you in silence due to a server error...*"];
    }
  }
}
export default SLMGenerator;