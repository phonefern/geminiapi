const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const app = express();
const apiKey = 'AIzaSyAYinKiYLPNeCT5pqRQkpp5UDP_cO9pmYc';

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

const availableModels = {
  "gemini-1.5-flash": genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
  "packagetestv2-nettsfkvxpqs": genAI.getGenerativeModel({ model: "tunedModels/packagetestv2-nettsfkvxpqs" }),
};

// Set up multer to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Function to upload the file to Gemini
async function uploadToGemini(path, mimeType) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

// POST /api/index - Handle both file and question text
app.post('/api/index', upload.single('image'), async (req, res) => {
  const { question, model } = req.body;
  const file = req.file;

  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  if (!model || !availableModels[model]) {
    return res.status(400).json({ error: 'Invalid model selected.' });
  }

  const selectedModel = availableModels[model];
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 512,
    responseMimeType: "text/plain",
  };

  try {
    let uploadedFile = null;

    // If a file is provided, upload it to Gemini
    if (file) {
      const mimeType = file.mimetype;
      uploadedFile = await uploadToGemini(file.path, mimeType);
    }

    const history = [
      {
        role: "user",
        parts: [
          { text: question },
        ],
      }
    ];

    // If the file was uploaded, include it in the chat history
    if (uploadedFile) {
      history.push({
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri,
            },
          }
        ]
      });
    }

    const chatSession = selectedModel.startChat({
      generationConfig,
      history,
    });

    const result = await chatSession.sendMessage(question);
    console.log(result.response.text());
    res.json({ answer: result.response.text().trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing AI response' });
  }
});

module.exports = app;
