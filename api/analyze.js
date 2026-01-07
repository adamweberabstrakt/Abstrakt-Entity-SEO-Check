const Anthropic = require("@anthropic-ai/sdk").default;

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, llmName } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
      messages: [
        {
          role: "user",
          content: `You are simulating how the AI search engine "${llmName}" would respond to a query. Search the web and provide information as that AI would.

Query: ${query}

Provide your response in this JSON format (respond ONLY with valid JSON, no markdown):
{
  "summary": "2-3 sentence summary of findings",
  "entityFound": true/false,
  "confidenceScore": 1-10,
  "topSources": [
    {"url": "source url", "title": "source title", "snippet": "brief description"}
  ],
  "sentiment": "positive/neutral/negative",
  "recommendations": "brief recommendation for improving visibility"
}`,
        },
      ],
    });

    // Extract text content from response
    let responseText = "";
    if (response.content) {
      responseText = response.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
    }

    // Try to parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = {
          summary: responseText,
          entityFound: false,
          confidenceScore: 5,
          topSources: [],
          sentiment: "neutral",
          recommendations: "Analysis completed",
        };
      }
    } catch {
      parsedResponse = {
        summary: responseText,
        entityFound: false,
        confidenceScore: 5,
        topSources: [],
        sentiment: "neutral",
        recommendations: "Analysis completed",
      };
    }

    return res.status(200).json(parsedResponse);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Analysis failed",
      message: error.message,
    });
  }
};
