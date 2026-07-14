class SLMGenerator {
  constructor() {
  }

  commands = { 
    status: (args) => this.status()
  };

  status() {
    return [
        `Current AI: SLM`,
        `Current temperature: N/A`,
        `Current prompt: N/A`,
    ];
  }

  async generateReply(userMessage) {
    const apiUrl = "http://127.0.0.1:8000/generate"; 

    // This payload explicitly matches your Python FastAPI ChatRequest Pydantic model
    const payload = {
        prompt: userMessage,
        temperature: 1.0,       // Adjust for chaos level (0.8 - 1.2 is the sweet spot)
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
        return data.response; 

    } catch (error) {
        console.error("Failed to communicate with the Victorian Troll API:", error);
        return "*(The troll glares at you in silence due to a server error...)*";
    }
  }
}
export default SLMGenerator;