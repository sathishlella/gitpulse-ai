# GitPulse AI — Startup One-Pager

## Problem
Technical due diligence costs **$25K-$200K per deal** and takes **20-40+ hours** per repository. Angel investors who spend 40+ hours on due diligence achieve **7.1x returns** vs 1.1x for those who don't (Kauffman Foundation). 65% of open source repos have a bus factor of 2 or less, creating hidden enterprise risk that manual reviews miss.

## Solution
GitPulse AI is an open-source due diligence agent that deploys 4 specialized sub-agents against any public GitHub repository: a Scout that makes 11+ parallel API calls, an Analyst that computes bus factor, Gini coefficient, velocity, and dependency risk using pure math (zero LLM), an Executor that generates a 9-section investment report via Groq/Llama 3.3, and a Supervisor that validates output for hallucinations.

## Anti-Wrapper Moat
The Analyst agent uses ZERO LLM calls. Bus factor is computed from cumulative commit distribution. Contributor risk from Gini coefficient. Velocity from actual PR/issue timestamps. Dependency risk from real package manifest parsing. None of this is possible with a system prompt.

## Market
- **TAM**: $28B global due diligence market (MarketsandMarkets 2025)
- **SAM**: $4.5B technical due diligence segment
- **SOM**: $900M VC/PE technical assessment
- OpenSauced: $3.51M raised, contributor-only, joining Linux Foundation
- GitClear: $295/mo, 65+ metrics, requires integration
- Sourcegraph: $223M raised, code search not assessment

## Business Model
- **Free**: 5 analyses/day, basic report
- **Pro ($49/mo)**: Unlimited, PDF export, private repos (with token), API, scheduled monitoring
- **Team ($149/mo)**: Multi-user, portfolio dashboards, Slack alerts, comparative analysis
- **Enterprise ($499/mo)**: Custom scoring weights, white-label, bulk API, SSO, private deployment

## Unit Economics
- Cost per analysis: ~$0.05 (2 Groq calls + GitHub API = free)
- Pro user: ~50 analyses/mo = $2.50 COGS → **95% gross margin**
- Replaces: $25K-$200K manual due diligence per deal

## Human Benchmark
A senior engineer performing technical due diligence on one repository takes **4-8 hours**. GitPulse AI does it in **30 seconds**.

## GTM Strategy
1. **Open Source First**: GitHub → HackerNews → VC Twitter
2. **VC Distribution**: Direct outreach to VC partners who publish "how we do due diligence" posts
3. **Enterprise Hook**: "Run this on your entire portfolio" → team/enterprise plan
4. **Content Loop**: Publish "Investment Grade" reports on trending repos → viral technical content

## Tech Stack
Node.js, GitHub REST API, Groq API (Llama 3.3 70B), Vercel Serverless, Vanilla JS

## Team
**Sathish Lella** — AI Engineer, building 100 AI agents in 100 days
