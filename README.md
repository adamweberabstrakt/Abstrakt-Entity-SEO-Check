# Entity SEO Checker (Full Version with Backend)

A multi-LLM Entity-Based SEO Checker that analyzes your brand's visibility across AI search engines.

## Quick Setup

### 1. Get Your Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### 2. Upload to GitHub
Drag and drop ALL these files into your GitHub repository:
- `api/` folder (contains `analyze.js`)
- `public/` folder
- `src/` folder
- `package.json`
- `vercel.json`
- `.gitignore`
- `.env.example`

### 3. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project** → Select your repo
3. **IMPORTANT: Add Environment Variable**
   - Click **Environment Variables**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your API key (sk-ant-...)
4. Click **Deploy**

### 4. Done!
Your app will be live and fully functional at your Vercel URL.

---

## Project Structure

```
entity-seo-checker/
├── api/
│   └── analyze.js          # Serverless API endpoint
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── EntitySEOChecker.js  # Main component
│   ├── index.css
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

## How It Works

1. User enters company info, leadership, and keywords
2. Frontend sends requests to `/api/analyze`
3. Serverless function calls Anthropic API with web search
4. Results are displayed in the dashboard

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env.local

# Install Vercel CLI for local API testing
npm i -g vercel

# Run locally
vercel dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from console.anthropic.com |

## Costs

Anthropic API pricing (approximate):
- Claude Sonnet: ~$3 per million input tokens, ~$15 per million output tokens
- Each analysis query uses roughly 1-2K tokens
- A full analysis (5 LLMs × 5 queries) ≈ $0.05-0.15

## Troubleshooting

**"API returned 401"** → Check your API key is correct in Vercel environment variables

**"API returned 429"** → Rate limited, wait a moment and try again

**"API returned 500"** → Check Vercel function logs for details

---

Built for **Abstrakt Marketing Group**
