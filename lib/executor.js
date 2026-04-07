/**
 * GitPulse AI — Agent C: The Executor
 *
 * Takes structured metrics from the Analyst and generates
 * a human-readable Investment Grade due diligence report via Groq/Llama 3.3.
 *
 * This is the ONLY place an LLM is used — all data feeding it is real, computed data.
 */

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Generate the due diligence dossier from computed metrics
 */
export async function generateReport(scoutData, metrics) {
  const m = scoutData.meta;
  const ig = metrics.investmentGrade;

  const prompt = `You are a senior technical due diligence analyst at a top-tier VC firm. Generate a sharp, actionable investment assessment for this GitHub repository.

## TARGET: ${m.fullName}
${m.description || 'No description'}
License: ${m.license || 'None'} | Created: ${m.createdAt?.split('T')[0]} | Last push: ${m.pushedAt?.split('T')[0]}

## COMPUTED METRICS (all from real GitHub API data):

### Investment Grade: ${ig.grade} (${ig.score}/${ig.maxScore})
Breakdown:
- Community: ${ig.breakdown.community.score}/${ig.breakdown.community.max}
- Bus Factor: ${ig.breakdown.busFactor.score}/${ig.breakdown.busFactor.max}
- Velocity: ${ig.breakdown.velocity.score}/${ig.breakdown.velocity.max}
- Releases: ${ig.breakdown.releases.score}/${ig.breakdown.releases.max}
- Maturity: ${ig.breakdown.maturity.score}/${ig.breakdown.maturity.max}
- Activity: ${ig.breakdown.activity.score}/${ig.breakdown.activity.max}

### Community
Stars: ${metrics.health.stars} | Forks: ${metrics.health.forks} | Watchers: ${metrics.health.watchers}
Stars/day: ${metrics.health.starsPerDay} | Fork-to-star ratio: ${metrics.health.forkToStarRatio}
Age: ${metrics.health.ageDays} days | Active: ${metrics.health.isActive} | Stale: ${metrics.health.isStale}

### Contributors (Bus Factor Analysis)
Total: ${metrics.contributors.count} | Human: ${metrics.contributors.humanCount} | Bot: ${metrics.contributors.botCount}
Bus Factor: ${metrics.contributors.busFactor} (${metrics.contributors.concentration})
Gini Coefficient: ${metrics.contributors.giniCoefficient} (0=equal, 1=one person)
Risk Level: ${metrics.contributors.riskLevel}
Top contributors: ${metrics.contributors.topContributors.slice(0, 5).map(c => `${c.login} (${c.percentage}%)`).join(', ')}

### Velocity
Commits/week: ${metrics.velocity.commitsPerWeek}
Issue close time (median): ${metrics.velocity.issueCloseTime.median ?? 'N/A'}h (sample: ${metrics.velocity.issueCloseTime.sampleSize})
PR merge time (median): ${metrics.velocity.prMergeTime.median ?? 'N/A'}h (sample: ${metrics.velocity.prMergeTime.sampleSize})
PR merge rate: ${metrics.velocity.prMergeRate}%
Open issues: ${metrics.velocity.openIssues} | Open PRs: ${metrics.velocity.openPRs}

### Releases
Count: ${metrics.releases.count} | Cadence: ${metrics.releases.cadenceLabel} (~${metrics.releases.cadence ?? 'N/A'} days)
Latest: ${metrics.releases.latest ?? 'None'} | Days since release: ${metrics.releases.daysSinceRelease ?? 'N/A'}

### Dependencies
Ecosystems: ${metrics.dependencies.ecosystems.map(e => `${e.name} (${e.dependencies} deps)`).join(', ') || 'None detected'}
Total deps: ${metrics.dependencies.totalDeps} | Dev deps: ${metrics.dependencies.devDeps}
Risk signals: ${metrics.dependencies.riskSignals.join('; ') || 'None'}

### Activity Trend: ${metrics.activity.trend}
Last 4 weeks: ${metrics.activity.last4Weeks} commits | Last 12 weeks: ${metrics.activity.last12Weeks} commits
Lines added: ${metrics.activity.linesAdded?.toLocaleString() ?? 'N/A'} | Removed: ${metrics.activity.linesRemoved?.toLocaleString() ?? 'N/A'}

### Maturity: ${metrics.maturity.stage} (${metrics.maturity.score}%)
Signals: ${metrics.maturity.signals.join(', ')}

---

Generate a due diligence report with these EXACT sections. Be direct, data-driven, and opinionated:

1. **EXECUTIVE VERDICT** (3-4 sentences): Investment-grade assessment. Is this worth betting on? State the grade and the single biggest risk.

2. **CONTRIBUTOR RISK ASSESSMENT**: Analyze the bus factor. What happens if the top contributor leaves? How distributed is knowledge? Is this a "hero project" or a real team?

3. **ENGINEERING VELOCITY**: Is this team shipping fast? How does their PR merge time and issue resolution compare to industry benchmarks? (Good: <24h PR merge, <48h issue close. Average: <72h PR, <168h issue. Slow: anything above.)

4. **RELEASE DISCIPLINE**: Are they shipping regularly? Is their versioning professional? Is the latest release recent enough to indicate active maintenance?

5. **DEPENDENCY & SUPPLY CHAIN RISK**: How heavy is the dependency tree? Any red flags in the package manifest?

6. **TREND ANALYSIS**: Is this project accelerating, plateauing, or dying? What does the commit trend tell us?

7. **RED FLAGS**: List 3-5 specific concerns, ranked by severity. Be blunt.

8. **GREEN FLAGS**: List 3-5 specific strengths. Be specific.

9. **BOTTOM LINE**: One paragraph. Would you recommend this project for: (a) Enterprise adoption, (b) Investment, (c) Hiring signal for the team? Why or why not?

Use the actual numbers provided. Do not hallucinate data.`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
    stream: false
  });

  return completion.choices[0]?.message?.content || 'Report generation failed.';
}
