require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Fallback function if AI models fail
function generateFallbackAnalysis(idea) {
  return `**SaaS Idea Validation Report**

**Your Idea:** ${idea}

**STRENGTHS:**
 Addresses a clear market need (resume optimization)
 Leverages AI technology for automation
 Focuses on ATS compatibility (crucial for job seekers)
 Integration with LinkedIn (large user base)
 Automated personalization saves time

**WEAKNESSES:**
 High competition in resume building space
 LinkedIn API access limitations and costs
 ATS algorithms constantly changing
 Privacy concerns with LinkedIn data
 Quality control of AI-generated content

**OPPORTUNITIES:**
 Target specific industries (tech, healthcare, finance)
 Offer freemium model with premium features
 Partner with recruitment agencies
 Expand to cover letters and portfolios
 Add interview preparation features
 B2B sales to corporate HR departments

**THREATS:**
 Established competitors (Zety, Resume.io, Novoresume)
 LinkedIn's own resume features
 AI detection by recruiters becoming common
 Data privacy regulations (GDPR, CCPA)
 Market saturation in resume tools

**IMPROVEMENT SUGGESTIONS:**
1. **Niche Focus**: Target specific job roles (e.g., software engineers, nurses) rather than general market
2. **Value Addition**: Include ATS score with detailed improvement recommendations
3. **Integration**: Add job matching and application tracking features
4. **Differentiation**: Offer video resume creation or portfolio integration
5. **Pricing Strategy**: Start with freemium model, upsell based on number of resumes/applications
6. **Trust Building**: Showcase success rates and testimonials
7. **Compliance**: Ensure GDPR/CCPA compliance from day one

**MARKET POTENTIAL:**
- Global recruitment software market: $3.5B+ (2024)
- Job seekers actively looking: 20M+ monthly (US alone)
- Average willingness to pay: $20-50/month for premium features

**OVERALL VERDICT:** 
✅ **VIABLE** - Solid idea with proven market demand. Success depends on:
- Strong differentiation from competitors
- High-quality AI output
- Excellent user experience
- Strategic pricing
- Effective marketing to build trust

**RECOMMENDED NEXT STEPS:**
1. Build MVP with 1-2 job categories
2. Test with 50-100 beta users
3. Measure resume success rate (interviews secured)
4. Iterate based on feedback
5. Scale marketing after product-market fit`;
}

// POST /validate - send idea to Hugging Face model
app.post('/validate', async (req, res) => {
  const idea = req.body.idea;
  console.log("📝 Received Idea:", idea);

  if (!idea || idea.trim() === '') {
    return res.status(400).json({ error: 'No idea provided' });
  }

  const prompt = `You are a SaaS product expert and business analyst. Analyze this SaaS idea in detail:

"${idea}"

Provide a comprehensive validation report with these sections:

1. STRENGTHS (3-5 key advantages)
2. WEAKNESSES (3-5 potential challenges)
3. MARKET OPPORTUNITIES (growth potential, trends)
4. POTENTIAL THREATS (competition, risks)
5. IMPROVEMENT SUGGESTIONS (actionable recommendations)

Be specific, data-driven, and actionable. Focus on business viability.`;

  // Try multiple models in order of preference
  const models = [
    { id: 'google/flan-t5-large', name: 'FLAN-T5 Large' },
    { id: 'google/flan-t5-base', name: 'FLAN-T5 Base' },
    { id: 'bigscience/bloom-560m', name: 'BLOOM 560M' },
    { id: 'gpt2', name: 'GPT-2' }
  ];

  for (const model of models) {
    try {
      console.log(`🤖 Trying model: ${model.name} (${model.id})`);
      
      const response = await fetch(`https://api-inference.huggingface.co/models/${model.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HF_TOKEN}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      });

      console.log(`📡 Response Status: ${response.status}`);

      if (!response.ok) {
        const errText = await response.text();
        console.error(` ${model.name} failed:`, errText.substring(0, 200));
        continue; // Try next model
      }

      const data = await response.json();
      console.log(` Success with: ${model.name}`);
      
      let aiResponse = '';
      
      // Extract generated text from various response formats
      if (Array.isArray(data)) {
        aiResponse = data[0]?.generated_text || data[0]?.summary_text || '';
      } else if (data?.generated_text) {
        aiResponse = data.generated_text;
      } else if (typeof data === 'string') {
        aiResponse = data;
      }

      if (aiResponse && aiResponse.length > 50) {
        // Clean up the response
        const cleanedResponse = aiResponse
          .replace(prompt, '') // Remove echoed prompt
          .replace(/\[INST\]|\[\/INST\]|\[End of turn\]/g, '')
          .trim();

        console.log(' AI Response length:', cleanedResponse.length);

        return res.json({ 
          response: cleanedResponse,
          model: model.name,
          source: 'AI'
        });
      } else {
        console.warn(` ${model.name} returned empty/short response`);
      }

    } catch (err) {
      console.error(` Error with ${model.name}:`, err.message);
    }
  }

  // If all AI models fail, use fallback
  console.log('⚠️ All AI models failed. Using fallback analysis.');
  res.json({ 
    response: generateFallbackAnalysis(idea),
    model: 'Fallback Analysis (Rule-based)',
    source: 'Fallback'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    tokenConfigured: !!process.env.HF_TOKEN
  });
});

// Start server
app.listen(PORT, () => {
  console.log('=========================================');
  console.log(` Server running at http://localhost:${PORT}`);
  console.log(`🔑 HF Token: ${process.env.HF_TOKEN ? 'Configured ✓' : 'Missing ✗'}`);
  console.log(` Test at: http://localhost:${PORT}`);
  console.log('=========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});