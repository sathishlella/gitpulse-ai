/**
 * GitPulse AI — Vercel Serverless API Endpoint
 *
 * Orchestrates: Scout → Analyst → Executor → Supervisor
 * POST /api/analyze { repo: "owner/repo" or "https://github.com/owner/repo" }
 *
 * Manual equivalent: 4-8 hours of senior engineer due diligence
 */

import { parseRepoUrl, scoutRepo } from '../lib/scout.js';
import { analyzeRepo } from '../lib/analyst.js';
import { generateReport } from '../lib/executor.js';
import { validateReport } from '../lib/supervisor.js';

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const { repo } = req.body || {};
  if (!repo) return res.status(400).json({ error: 'Missing required field: repo (e.g., "facebook/react" or GitHub URL)' });

  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const totalStart = Date.now();
  const pipeline = { scout: null, analyst: null, executor: null, supervisor: null };

  try {
    // Parse repo URL
    const { owner, repo: repoName } = parseRepoUrl(repo);

    // ── AGENT A: SCOUT ──────────────────────────────
    const scoutStart = Date.now();
    const scoutData = await scoutRepo(owner, repoName);
    pipeline.scout = { status: 'done', time: Date.now() - scoutStart, apiCalls: '11+ parallel' };

    // ── AGENT B: ANALYST ────────────────────────────
    const analystStart = Date.now();
    const metrics = analyzeRepo(scoutData);
    pipeline.analyst = { status: 'done', time: Date.now() - analystStart, llmCalls: 0 };

    // ── AGENT C: EXECUTOR ───────────────────────────
    const executorStart = Date.now();
    const report = await generateReport(scoutData, metrics);
    pipeline.executor = { status: 'done', time: Date.now() - executorStart, llmCalls: 1 };

    // ── AGENT D: SUPERVISOR ─────────────────────────
    const supervisorStart = Date.now();
    const validation = await validateReport(report, metrics, scoutData);
    pipeline.supervisor = { status: 'done', time: Date.now() - supervisorStart, llmCalls: 1 };

    return res.status(200).json({
      success: true,
      repo: `${owner}/${repoName}`,
      analyzedAt: new Date().toISOString(),
      totalTime: Date.now() - totalStart,
      humanEquivalent: '4-8 hours of senior engineer due diligence',
      pipeline,
      investmentGrade: metrics.investmentGrade,
      metrics: {
        health: metrics.health,
        contributors: metrics.contributors,
        velocity: metrics.velocity,
        releases: metrics.releases,
        dependencies: metrics.dependencies,
        activity: metrics.activity,
        maturity: metrics.maturity
      },
      report,
      validation
    });

  } catch (error) {
    console.error('Analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
      pipeline,
      hint: 'Ensure the repo is public and the URL format is correct (owner/repo or GitHub URL)'
    });
  }
}
