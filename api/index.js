const { GoogleGenerativeAI } = require('@google/generative-ai');

// Set up your Google Gemini API Key
const apiKey = 'AIzaSyAYinKiYLPNeCT5pqRQkpp5UDP_cO9pmYc'; // Replace with your actual Gemini API key
const genAI = new GoogleGenerativeAI(apiKey);

// Define available models
const availableModels = {
  "gemini-1.5-flash": genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
  "packagetestv2-nettsfkvxpqs": genAI.getGenerativeModel({ model: "tunedModels/packagetestv2-nettsfkvxpqs" }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const { question, model } = req.body;

  // Validate if the question and model are provided
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  if (!model || !availableModels[model]) {
    return res.status(400).json({ error: 'Invalid or missing model selected.' });
  }

  const selectedModel = availableModels[model];

  const generationConfig = {
    temperature: 0.6,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 512,
  };

  try {
    // Start a chat session using the selected model
    const chatSession = selectedModel.startChat({
      generationConfig,
      history: [],
    });

    // Send the message and get the response
    const result = await chatSession.sendMessage(question);

    res.status(200).json({ answer: result.response.text().trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing AI response' });
  }
}