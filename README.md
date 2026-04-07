# GitPulse AI

**GitHub Repository Due Diligence Agent** — Investment-grade technical assessment from a single URL.

Day 6 of [100 Days, 100 AI Agents](https://github.com/sathishlella) by **Sathish Lella**

**Manual equivalent: 4-8 hours of senior engineer due diligence per repository.**

---

## The Problem

Technical due diligence costs **$25K-$200K per deal** and takes **20-40+ hours per repo**. VCs who invest 40+ hours in due diligence achieve **7.1x returns** vs 1.1x for those who don't. But most skip it because it's too expensive and too slow.

OpenSauced ($3.51M raised) only covers contributor metrics. GitClear charges **$295/mo** and requires integration. Sourcegraph ($223M raised) does code search, not assessment. Nobody gives a single "Investment Grade" from one URL.

## The Anti-Wrapper Moat

This is NOT an AI wrapper. The Scout makes **11+ parallel GitHub API calls** to gather real data. The Analyst computes **bus factor, Gini coefficient, velocity metrics, and dependency risk** using pure rule-based logic — zero LLM involvement. The LLM (Groq/Llama 3.3) only generates the final report from verified, computed data, and a second LLM pass validates the output for hallucinations.

---

## System Architecture

```
GitHub URL Input
      |
      v
[Agent A: SCOUT] ──────── 11+ parallel GitHub REST API calls
  |  Fetches: repo meta, contributors, commits, issues, PRs,
  |  releases, languages, branches, tags, dependency files,
  |  commit activity, code frequency
  |
  v
[Agent B: ANALYST] ─────── Pure rule-based computation (ZERO LLM)
  |  Computes: bus factor, Gini coefficient, contributor concentration,
  |  issue close velocity, PR merge speed, release cadence,
  |  dependency risk signals, activity trends, maturity score,
  |  Investment Grade (A+ to F) with weighted breakdown
  |
  v
[Agent C: EXECUTOR] ────── Groq / Llama 3.3 70B
  |  Generates: Investment dossier with 9 sections
  |  (verdict, contributor risk, velocity, releases,
  |   dependencies, trends, red flags, green flags, bottom line)
  |
  v
[Agent D: SUPERVISOR] ──── Groq / Llama 3.3 70B (validation pass)
  |  Checks: hallucinations against real metrics,
  |  confidence scoring, grade agreement, missing context
  |
  v
Investment-Grade Due Diligence Report
```

### Key Metrics Computed (Agent B — No LLM)

| Metric | What It Measures | How |
|--------|-----------------|-----|
| Bus Factor | Min contributors for 80% of commits | Cumulative commit distribution |
| Gini Coefficient | Contribution inequality (0-1) | Lorenz curve calculation |
| Contributor Concentration | Risk classification | Top-1 contributor share thresholds |
| Issue Close Velocity | Responsiveness | Median hours from open to close |
| PR Merge Speed | Engineering throughput | Median hours from open to merge |
| Release Cadence | Shipping discipline | Average days between releases |
| Activity Trend | Project momentum | 4-week vs prior 4-week commit comparison |
| Dependency Risk | Supply chain exposure | Package manifest parsing + rule-based flags |
| Investment Grade | Overall score (A+ to F) | Weighted composite across 6 dimensions |

---

## Tech Stack

| Layer | Tool | LLM Calls |
|-------|------|-----------|
| Scout | GitHub REST API (native fetch) | 0 |
| Analyst | Pure JavaScript computation | 0 |
| Executor | Groq API (Llama 3.3 70B) | 1 |
| Supervisor | Groq API (Llama 3.3 70B) | 1 |
| Frontend | Vanilla JS, Inter font | 0 |
| Deployment | Vercel Serverless | — |

**Total LLM calls per analysis: 2** (Executor + Supervisor). Everything else is real tool use.

---

## Setup

### 1. Clone

```bash
git clone https://github.com/sathishlella/gitpulse-ai.git
cd gitpulse-ai
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

```env
GROQ_API_KEY=gsk_your_key_here          # Required — get free at console.groq.com
GITHUB_TOKEN=ghp_optional_token_here     # Optional — for higher API rate limits
```

Without a GitHub token, you get 60 API requests/hour (enough for ~5 analyses). With a token, you get 5,000/hour.

### 3. Run Locally

```bash
npx vercel dev
```

Open `http://localhost:3000`

### 4. Deploy to Vercel

```bash
npx vercel --prod
```

Or one-click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sathishlella/gitpulse-ai&env=GROQ_API_KEY)

---

## API Usage

```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo": "facebook/react"}'
```

### Response Structure

```json
{
  "success": true,
  "repo": "facebook/react",
  "totalTime": 8432,
  "humanEquivalent": "4-8 hours of senior engineer due diligence",
  "pipeline": { "scout": {...}, "analyst": {...}, "executor": {...}, "supervisor": {...} },
  "investmentGrade": { "grade": "A+", "score": 92, "breakdown": {...} },
  "metrics": {
    "health": { "stars": 230000, "forks": 47000, ... },
    "contributors": { "busFactor": 12, "giniCoefficient": 0.72, ... },
    "velocity": { "commitsPerWeek": 45, "prMergeTime": { "median": 18.5 }, ... },
    "releases": { "count": 25, "cadenceLabel": "monthly", ... },
    "dependencies": { "ecosystems": [...], "riskSignals": [...] },
    "activity": { "trend": "stable", ... }
  },
  "report": "## EXECUTIVE VERDICT\n...",
  "validation": { "confidence": 87, "hallucinations": [], ... }
}
```

---

## Architecture

```
Day-06-GitPulse/
├── api/
│   └── analyze.js           # Vercel endpoint — orchestrates all 4 agents
├── lib/
│   ├── scout.js              # Agent A: GitHub API data gathering (11+ calls)
│   ├── analyst.js            # Agent B: Rule-based metric computation (0 LLM)
│   ├── executor.js           # Agent C: AI report generation (1 LLM call)
│   └── supervisor.js         # Agent D: Hallucination validation (1 LLM call)
├── public/
│   └── index.html            # Premium UI (black/white, Inter, responsive)
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```

## License

MIT

---

Built by **Sathish Lella** | Groq + Llama 3.3 70B | [github.com/sathishlella](https://github.com/sathishlella)
