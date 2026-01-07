const Anthropic = require("@anthropic-ai/sdk").default;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { query, llmName, analysisType } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let promptAddition = "";
    if (analysisType === "backlinks") {
      promptAddition = "Focus on finding backlinks, referring domains, and link-building opportunities.";
    } else if (analysisType === "leadership") {
      promptAddition = "Focus on the person's online reputation, sentiment, thought leadership, and media appearances.";
    } else if (analysisType === "competitor") {
      promptAddition = "Analyze this competitor's online presence, backlinks, and content strategy.";
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `You are simulating how "${llmName}" would respond. Search the web thoroughly. ${promptAddition}

Query: ${query}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "summary": "2-3 sentence summary of findings",
  "entityFound": true or false,
  "confidenceScore": number 1-10,
  "sentimentScore": number 1-10 (10 being very positive sentiment),
  "sentiment": "positive" or "neutral" or "negative",
  "topSources": [{"url": "url", "title": "title", "snippet": "description", "domainAuthority": estimated 1-100}],
  "backlinks": [{"url": "url", "anchorText": "text", "domainAuthority": estimated 1-100, "type": "editorial/directory/guest-post/etc"}],
  "pressOpportunities": [{"outlet": "name", "type": "press release/feature/interview", "relevance": "high/medium/low", "contact": "if found"}],
  "podcastOpportunities": [{"name": "podcast name", "topic": "relevant topic", "audienceSize": "small/medium/large", "url": "if found"}],
  "recommendations": "specific actionable recommendation"
}`
      }]
    });

    let responseText = response.content?.filter(i => i.type === "text").map(i => i.text).join("\n") || "";
    
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        summary: responseText,
        entityFound: false,
        confidenceScore: 5,
        sentimentScore: 5,
        topSources: [],
        backlinks: [],
        pressOpportunities: [],
        podcastOpportunities: [],
        sentiment: "neutral",
        recommendations: "Analysis completed"
      };
    } catch {
      parsed = {
        summary: responseText,
        entityFound: false,
        confidenceScore: 5,
        sentimentScore: 5,
        topSources: [],
        backlinks: [],
        pressOpportunities: [],
        podcastOpportunities: [],
        sentiment: "neutral",
        recommendations: "Analysis completed"
      };
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Analysis failed", message: error.message });
  }
};
