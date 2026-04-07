VCs spend $25,000-$200,000 on technical due diligence per deal. Most still skip it because a senior engineer needs 4-8 hours per repo. That means investment decisions are made on vibes, not data.

Standard approach: ask ChatGPT to "analyze this GitHub repo." It hallucinates the star count, invents contributors, and has zero access to commit history or dependency manifests. Useless for real assessment.

So I built GitPulse AI — 4 agents, one URL, 30-second investment-grade dossier:

Scout Agent → 11 parallel GitHub API calls (metadata, contributors, commits, issues, PRs, releases, dependencies)
Analyst Agent → computes bus factor, Gini coefficient, velocity metrics, dependency risk (zero LLM — pure math)
Executor Agent → Groq/Llama 3.3 generates 9-section due diligence report from verified data
Supervisor Agent → second LLM pass validates output against real metrics, flags hallucinations

The Analyst uses zero AI. Bus factor is calculated from cumulative commit distribution. Contributor risk from Gini coefficients. Velocity from actual PR timestamps. Real math, not vibes.

Stack: Node.js, GitHub REST API, Groq API, Vercel Serverless.

Replaces a $25K technical audit. Costs $0.05 per analysis. Open source. Live demo in the first comment.

Day 6 of 100. Follow to watch the next 94 agents ship.

#AIAgents #BuildInPublic #100DaysOfAI #TechnicalDueDiligence

---

**FIRST COMMENT:**
Live demo: https://gitpulse-ai.vercel.app | Source code: https://github.com/sathishlella/gitpulse-ai

**SECOND COMMENT (post 5 min later):**
Architecture deep-dive: Scout makes 11 parallel GitHub API calls (repo meta, 100 contributors, 100 commits, open/closed issues, open/closed PRs, releases, languages, branches, tags, dependency files, commit activity). Analyst computes bus factor via cumulative 80th-percentile commit threshold + Gini coefficient for inequality measurement. Two LLM calls total — one for report generation, one for hallucination validation. Everything else is pure computation.
