const express = require('express');// handle http request
const fetch = require('node-fetch'); // npm install node-fetch@2 (simlar to fech modle)

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// POST /validate - call running Ollama server API with system prompt for better answer
app.post('/validate', async (req, res) => {
  const idea = req.body.idea;
  console.log("Idea:",idea)

  if (!idea || idea.trim() === '') {
    return res.status(400).json({ error: 'No idea provided' });
  }

  const systemInstruction = `
You are a SaaS product expert. Analyze the following idea carefully and give a detailed validation report. Provide the following sections:
- Strengths
- Weaknesses
- Opportunities (including potential market trends, customer needs, etc.)
- Threats (including competition, market risks, etc.)
- Improvement Suggestions.
`;

  const payload = {
    model: 'gemma:2b',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: idea }
    ],
    stream: false //to provide the complete answer at a time 
  };

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'Ollama API error: ' + errText });
    }

    const data = await response.json();
    const aiResponse = data.message?.content || 'No response from AI';

    const cleanedResponse = aiResponse.replace(/\[End of turn\]$/, '').trim();

    // Print AI response in terminal
    console.log('AI Validation Response:');
    console.log(cleanedResponse);

    res.json({ response: cleanedResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

