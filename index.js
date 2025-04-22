import express from 'express';
import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();
const apiKey = process.env.MISTRAL_API_KEY;
console.log("MISTRAL_API_KEY length:", apiKey ? apiKey.length : 0);

const mistral = new Mistral({
  apiKey: apiKey,
});

const app = express();
const port = 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.set("view engine", "ejs");

// Create an object to store conversations (in a real app, use a database)
const sessions = {};

// Render the form on the homepage
app.get('/', (req, res) => {
  // Create a unique session ID (in production, use proper session management)
  const sessionId = Date.now().toString();
  sessions[sessionId] = { messages: [] };
  
  res.render("index", { messages: [], sessionId: sessionId });
});

// Handle form submissions
app.post('/ask', async (req, res) => {
  try {
    const userQuestion = req.body.question || "What is the best French cheese?";
    const sessionId = req.body.sessionId;
    
    // Get or create session
    if (!sessions[sessionId]) {
      sessions[sessionId] = { messages: [] };
    }
    
    // Store user message
    sessions[sessionId].messages.push({
      role: 'user',
      content: userQuestion
    });
    
    // Get chat history for context
    const chatMessages = sessions[sessionId].messages;
    
    // Add system message to encourage code formatting when appropriate
    const systemMessage = {
      role: 'system',
      content: 'When including code in your responses, always format it using markdown code blocks with the appropriate language tag. For example: ```javascript console.log("Hello World"); ```'
    };
    
    const messagesWithSystem = [systemMessage, ...chatMessages];
    
    const chatResponse = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: messagesWithSystem,
    });

    const message = chatResponse.choices[0].message.content;
    console.log('Chat:', message);
    
    // Store AI response
    sessions[sessionId].messages.push({
      role: 'assistant',
      content: message
    });
    
    res.render("index", { 
      messages: sessions[sessionId].messages,
      sessionId: sessionId
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("index", { 
      messages: sessions[sessionId] ? sessions[sessionId].messages : [],
      sessionId: sessionId,
      error: "Error while communicating with Mistral."
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});