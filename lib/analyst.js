/**
 * GitPulse AI — Agent B: The Analyst
 *
 * Pure rule-based data processing. ZERO LLM involvement.
 * Computes: bus factor, contributor Gini coefficient, issue velocity,
 * PR merge speed, release cadence, dependency risk, activity trends.
 *
 * This is the "brain" that turns raw GitHub API data into structured metrics.
 */

/**
 * Main analysis pipeline — takes raw Scout data, returns computed metrics
 */
export function analyzeRepo(scoutData) {
  const startTime = Date.now();

  const metrics = {
    health: computeHealthMetrics(scoutData),
    contributors: analyzeContributors(scoutData.contributors),
    velocity: computeVelocity(scoutData),
    releases: analyzeReleases(scoutData.releases),
    dependencies: analyzeDependencies(scoutData.dependencies),
    activity: analyzeActivity(scoutData.activity),
    maturity: assessMaturity(scoutData),
    analysisTime: 0
  };

  // Compute overall Investment Grade
  metrics.investmentGrade = computeInvestmentGrade(metrics, scoutData);
  metrics.analysisTime = Date.now() - startTime;

  return metrics;
}

// ── Health Metrics ────────────────────────────────────

function computeHealthMetrics(data) {
  const m = data.meta;
  const ageMs = Date.now() - new Date(m.createdAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const daysSinceUpdate = Math.floor((Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const daysSincePush = Math.floor((Date.now() - new Date(m.pushedAt).getTime()) / (1000 * 60 * 60 * 24));

  return {
    stars: m.stars,
    forks: m.forks,
    watchers: m.watchers,
    ageDays,
    daysSinceUpdate,
    daysSincePush,
    starsPerDay: ageDays > 0 ? +(m.stars / ageDays).toFixed(2) : 0,
    forkToStarRatio: m.stars > 0 ? +(m.forks / m.stars).toFixed(3) : 0,
    sizeKB: m.size,
    license: m.license,
    hasLicense: !!m.license,
    archived: m.archived,
    hasWiki: m.hasWiki,
    hasPages: m.hasPages,
    hasDiscussions: m.hasDiscussions,
    topics: m.topics,
    branches: data.branches,
    tags: data.tags,
    isActive: daysSincePush < 30,
    isStale: daysSincePush > 180,
    isDead: daysSincePush > 365
  };
}

// ── Contributor Analysis ────────────────────────────────

function analyzeContributors(contributors) {
  if (!contributors || contributors.length === 0) {
    return { count: 0, busFactor: 0, giniCoefficient: 1, concentration: 'unknown', topContributors: [], riskLevel: 'critical' };
  }

  const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);
  const totalCommits = sorted.reduce((sum, c) => sum + c.contributions, 0);

  // Bus Factor: minimum contributors accounting for 80% of commits
  let busFactor = 0;
  let cumulative = 0;
  for (const c of sorted) {
    cumulative += c.contributions;
    busFactor++;
    if (cumulative >= totalCommits * 0.8) break;
  }

  // Gini Coefficient: measures inequality of contributions (0 = equal, 1 = one person does everything)
  const n = sorted.length;
  const gini = computeGini(sorted.map(c => c.contributions));

  // Top contributors with their share
  const topContributors = sorted.slice(0, 10).map(c => ({
    login: c.login,
    contributions: c.contributions,
    percentage: totalCommits > 0 ? +((c.contributions / totalCommits) * 100).toFixed(1) : 0
  }));

  // Concentration risk
  const top1Share = topContributors[0]?.percentage || 0;
  let concentration, riskLevel;
  if (top1Share > 80) { concentration = 'single-person-project'; riskLevel = 'critical'; }
  else if (top1Share > 60) { concentration = 'highly-concentrated'; riskLevel = 'high'; }
  else if (top1Share > 40) { concentration = 'moderately-concentrated'; riskLevel = 'medium'; }
  else if (top1Share > 25) { concentration = 'distributed'; riskLevel = 'low'; }
  else { concentration = 'highly-distributed'; riskLevel = 'minimal'; }

  return {
    count: contributors.length,
    totalCommits,
    busFactor,
    giniCoefficient: +gini.toFixed(3),
    concentration,
    riskLevel,
    topContributors,
    humanCount: contributors.filter(c => c.type !== 'Bot').length,
    botCount: contributors.filter(c => c.type === 'Bot').length
  };
}

function computeGini(values) {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  if (mean === 0) return 0;

  let sumDiffs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiffs += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return sumDiffs / (2 * n * n * mean);
}

// ── Velocity Metrics ────────────────────────────────

function computeVelocity(data) {
  // Issue close time (from recently closed issues)
  const closedIssues = data.issues.closed.filter(i => i.createdAt && i.closedAt);
  const issueCloseTimes = closedIssues.map(i => {
    const created = new Date(i.createdAt).getTime();
    const closed = new Date(i.closedAt).getTime();
    return (closed - created) / (1000 * 60 * 60); // hours
  });

  const medianIssueCloseHrs = median(issueCloseTimes);
  const avgIssueCloseHrs = average(issueCloseTimes);

  // PR merge time
  const mergedPRs = data.pullRequests.closed.filter(p => p.mergedAt);
  const prMergeTimes = mergedPRs.map(p => {
    const created = new Date(p.createdAt).getTime();
    const merged = new Date(p.mergedAt).getTime();
    return (merged - created) / (1000 * 60 * 60); // hours
  });

  const medianPRMergeHrs = median(prMergeTimes);
  const avgPRMergeHrs = average(prMergeTimes);

  // Commit frequency (from commit dates in last 100 commits)
  const commitDates = data.commits.filter(c => c.date).map(c => new Date(c.date).getTime()).sort();
  let commitsPerWeek = 0;
  if (commitDates.length >= 2) {
    const spanMs = commitDates[commitDates.length - 1] - commitDates[0];
    const spanWeeks = spanMs / (1000 * 60 * 60 * 24 * 7);
    commitsPerWeek = spanWeeks > 0 ? +(commitDates.length / spanWeeks).toFixed(1) : 0;
  }

  // PR merge rate
  const totalClosedPRs = data.pullRequests.closed.length;
  const prMergeRate = totalClosedPRs > 0 ? +((mergedPRs.length / totalClosedPRs) * 100).toFixed(1) : 0;

  return {
    issueCloseTime: {
      median: medianIssueCloseHrs !== null ? +medianIssueCloseHrs.toFixed(1) : null,
      average: avgIssueCloseHrs !== null ? +avgIssueCloseHrs.toFixed(1) : null,
      sampleSize: closedIssues.length
    },
    prMergeTime: {
      median: medianPRMergeHrs !== null ? +medianPRMergeHrs.toFixed(1) : null,
      average: avgPRMergeHrs !== null ? +avgPRMergeHrs.toFixed(1) : null,
      sampleSize: mergedPRs.length
    },
    prMergeRate,
    commitsPerWeek,
    openIssues: data.issues.open.length,
    openPRs: data.pullRequests.open.length,
    draftPRs: data.pullRequests.open.filter(p => p.draft).length
  };
}

// ── Release Analysis ────────────────────────────────

function analyzeReleases(releases) {
  if (!releases || releases.length === 0) {
    return { count: 0, cadence: null, cadenceLabel: 'no-releases', latest: null, daysSinceRelease: null };
  }

  const sorted = releases
    .filter(r => r.publishedAt && !r.draft)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  if (sorted.length === 0) {
    return { count: 0, cadence: null, cadenceLabel: 'no-releases', latest: null, daysSinceRelease: null };
  }

  // Release cadence (average days between releases)
  const intervals = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = new Date(sorted[i].publishedAt) - new Date(sorted[i + 1].publishedAt);
    intervals.push(diff / (1000 * 60 * 60 * 24));
  }

  const avgCadenceDays = intervals.length > 0 ? +(average(intervals)).toFixed(1) : null;
  const daysSinceRelease = Math.floor((Date.now() - new Date(sorted[0].publishedAt).getTime()) / (1000 * 60 * 60 * 24));

  let cadenceLabel;
  if (avgCadenceDays === null) cadenceLabel = 'single-release';
  else if (avgCadenceDays <= 7) cadenceLabel = 'weekly';
  else if (avgCadenceDays <= 14) cadenceLabel = 'bi-weekly';
  else if (avgCadenceDays <= 35) cadenceLabel = 'monthly';
  else if (avgCadenceDays <= 100) cadenceLabel = 'quarterly';
  else cadenceLabel = 'infrequent';

  return {
    count: sorted.length,
    cadence: avgCadenceDays,
    cadenceLabel,
    latest: sorted[0]?.tag || null,
    daysSinceRelease,
    prereleaseCount: releases.filter(r => r.prerelease).length
  };
}

// ── Dependency Analysis ────────────────────────────────

function analyzeDependencies(depFiles) {
  if (!depFiles || Object.keys(depFiles).length === 0) {
    return { ecosystems: [], totalDeps: 0, devDeps: 0, riskSignals: [] };
  }

  const ecosystems = [];
  let totalDeps = 0;
  let devDeps = 0;
  const riskSignals = [];

  // package.json (Node.js)
  if (depFiles['package.json']) {
    try {
      const pkg = JSON.parse(depFiles['package.json']);
      const deps = Object.keys(pkg.dependencies || {});
      const dev = Object.keys(pkg.devDependencies || {});
      totalDeps += deps.length;
      devDeps += dev.length;
      ecosystems.push({
        name: 'Node.js',
        file: 'package.json',
        dependencies: deps.length,
        devDependencies: dev.length,
        engine: pkg.engines?.node || null,
        topDeps: deps.slice(0, 15)
      });

      // Risk signals
      if (deps.length > 100) riskSignals.push('Excessive dependencies (>100) — supply chain risk');
      if (!pkg.engines?.node) riskSignals.push('No Node.js engine specified — compatibility risk');
      if (pkg.dependencies?.['left-pad']) riskSignals.push('Contains deprecated dependency: left-pad');
    } catch (e) {}
  }

  // requirements.txt (Python)
  if (depFiles['requirements.txt']) {
    const lines = depFiles['requirements.txt'].split('\n').filter(l => l.trim() && !l.startsWith('#'));
    totalDeps += lines.length;
    ecosystems.push({
      name: 'Python',
      file: 'requirements.txt',
      dependencies: lines.length,
      topDeps: lines.slice(0, 15).map(l => l.split('==')[0].split('>=')[0].trim())
    });

    if (lines.length > 80) riskSignals.push('Excessive Python dependencies (>80)');
    const unpinned = lines.filter(l => !l.includes('==') && !l.includes('>='));
    if (unpinned.length > lines.length * 0.5) riskSignals.push('Many unpinned Python dependencies — reproducibility risk');
  }

  // go.mod (Go)
  if (depFiles['go.mod']) {
    const requires = depFiles['go.mod'].match(/require\s*\(([\s\S]*?)\)/);
    if (requires) {
      const goLines = requires[1].split('\n').filter(l => l.trim() && !l.startsWith('//'));
      totalDeps += goLines.length;
      ecosystems.push({ name: 'Go', file: 'go.mod', dependencies: goLines.length });
    }
  }

  // Cargo.toml (Rust)
  if (depFiles['Cargo.toml']) {
    const depsSection = depFiles['Cargo.toml'].match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depsSection) {
      const rustLines = depsSection[1].split('\n').filter(l => l.trim() && l.includes('='));
      totalDeps += rustLines.length;
      ecosystems.push({ name: 'Rust', file: 'Cargo.toml', dependencies: rustLines.length });
    }
  }

  // pyproject.toml (Modern Python)
  if (depFiles['pyproject.toml']) {
    ecosystems.push({ name: 'Python (pyproject)', file: 'pyproject.toml', dependencies: null });
  }

  // composer.json (PHP)
  if (depFiles['composer.json']) {
    try {
      const comp = JSON.parse(depFiles['composer.json']);
      const deps = Object.keys(comp.require || {});
      totalDeps += deps.length;
      ecosystems.push({ name: 'PHP', file: 'composer.json', dependencies: deps.length });
    } catch (e) {}
  }

  return { ecosystems, totalDeps, devDeps, riskSignals };
}

// ── Activity Trends ────────────────────────────────

function analyzeActivity(activity) {
  const weekly = Array.isArray(activity.commitActivity) ? activity.commitActivity : [];
  if (weekly.length === 0) {
    return { trend: 'unknown', last4Weeks: 0, last12Weeks: 0, peakWeek: null, linesAdded: 0, linesRemoved: 0, netLines: 0, totalWeeksTracked: 0 };
  }

  // Last 4 weeks vs previous 4 weeks
  const last4 = weekly.slice(-4).reduce((s, w) => s + (w.total || 0), 0);
  const prev4 = weekly.slice(-8, -4).reduce((s, w) => s + (w.total || 0), 0);
  const last12 = weekly.slice(-12).reduce((s, w) => s + (w.total || 0), 0);

  let trend;
  if (prev4 === 0 && last4 === 0) trend = 'inactive';
  else if (prev4 === 0 && last4 > 0) trend = 'reviving';
  else if (last4 === 0) trend = 'declining';
  else {
    const change = ((last4 - prev4) / prev4) * 100;
    if (change > 50) trend = 'accelerating';
    else if (change > 10) trend = 'growing';
    else if (change > -10) trend = 'stable';
    else if (change > -50) trend = 'slowing';
    else trend = 'declining';
  }

  // Lines of code added vs removed (from code_frequency)
  const codeFreq = Array.isArray(activity.codeFrequency) ? activity.codeFrequency : [];
  const totalAdded = codeFreq.reduce((s, w) => s + (w[1] || 0), 0);
  const totalRemoved = codeFreq.reduce((s, w) => s + Math.abs(w[2] || 0), 0);

  return {
    trend,
    last4Weeks: last4,
    last12Weeks: last12,
    totalWeeksTracked: weekly.length,
    linesAdded: totalAdded,
    linesRemoved: totalRemoved,
    netLines: totalAdded - totalRemoved
  };
}

// ── Maturity Assessment ────────────────────────────────

function assessMaturity(data) {
  const signals = [];
  const m = data.meta;

  if (m.license) signals.push('has-license');
  if (m.hasWiki) signals.push('has-wiki');
  if (m.hasPages) signals.push('has-pages');
  if (m.hasDiscussions) signals.push('has-discussions');
  if (m.topics.length > 0) signals.push('has-topics');
  if (data.releases.length > 0) signals.push('has-releases');
  if (data.branches > 1) signals.push('uses-branches');
  if (Object.keys(data.dependencies).length > 0) signals.push('has-dependency-manifest');

  // Check if README is comprehensive (based on repo size and description)
  if (m.description && m.description.length > 20) signals.push('has-description');
  if (m.homepage) signals.push('has-homepage');

  const maturityScore = (signals.length / 10) * 100;
  let stage;
  if (maturityScore >= 80) stage = 'production';
  else if (maturityScore >= 60) stage = 'growth';
  else if (maturityScore >= 40) stage = 'early';
  else stage = 'experimental';

  return { score: +maturityScore.toFixed(0), stage, signals };
}

// ── Investment Grade ────────────────────────────────

function computeInvestmentGrade(metrics, scoutData) {
  let score = 0;
  const maxScore = 100;
  const breakdown = {};

  // Community (25 pts)
  const stars = metrics.health.stars;
  const communityScore =
    stars >= 10000 ? 25 :
    stars >= 5000 ? 22 :
    stars >= 1000 ? 18 :
    stars >= 500 ? 14 :
    stars >= 100 ? 10 :
    stars >= 10 ? 5 : 2;
  score += communityScore;
  breakdown.community = { score: communityScore, max: 25 };

  // Bus Factor (20 pts)
  const bf = metrics.contributors.busFactor;
  const bfScore =
    bf >= 10 ? 20 :
    bf >= 5 ? 16 :
    bf >= 3 ? 12 :
    bf >= 2 ? 8 : 3;
  score += bfScore;
  breakdown.busFactor = { score: bfScore, max: 20 };

  // Velocity (20 pts)
  let velScore = 0;
  if (metrics.velocity.commitsPerWeek >= 20) velScore += 7;
  else if (metrics.velocity.commitsPerWeek >= 5) velScore += 5;
  else if (metrics.velocity.commitsPerWeek >= 1) velScore += 3;

  const medianPR = metrics.velocity.prMergeTime.median;
  if (medianPR !== null && medianPR < 24) velScore += 7;
  else if (medianPR !== null && medianPR < 72) velScore += 5;
  else if (medianPR !== null && medianPR < 168) velScore += 3;

  const medianIssue = metrics.velocity.issueCloseTime.median;
  if (medianIssue !== null && medianIssue < 48) velScore += 6;
  else if (medianIssue !== null && medianIssue < 168) velScore += 4;
  else if (medianIssue !== null && medianIssue < 720) velScore += 2;

  score += velScore;
  breakdown.velocity = { score: velScore, max: 20 };

  // Release Discipline (15 pts)
  let relScore = 0;
  if (metrics.releases.count >= 10) relScore += 8;
  else if (metrics.releases.count >= 5) relScore += 5;
  else if (metrics.releases.count >= 1) relScore += 3;

  if (metrics.releases.daysSinceRelease !== null && metrics.releases.daysSinceRelease < 30) relScore += 7;
  else if (metrics.releases.daysSinceRelease !== null && metrics.releases.daysSinceRelease < 90) relScore += 5;
  else if (metrics.releases.daysSinceRelease !== null && metrics.releases.daysSinceRelease < 180) relScore += 3;

  score += relScore;
  breakdown.releases = { score: relScore, max: 15 };

  // Maturity (10 pts)
  const matScore = Math.round(metrics.maturity.score / 10);
  score += matScore;
  breakdown.maturity = { score: matScore, max: 10 };

  // Activity Trend (10 pts)
  const trendMap = { accelerating: 10, growing: 8, stable: 6, reviving: 5, slowing: 3, declining: 1, inactive: 0 };
  const actScore = trendMap[metrics.activity.trend] ?? 0;
  score += actScore;
  breakdown.activity = { score: actScore, max: 10 };

  // Grade
  let grade, label;
  if (score >= 85) { grade = 'A+'; label = 'Exceptional — Strong investment candidate'; }
  else if (score >= 75) { grade = 'A'; label = 'Excellent — Healthy, well-maintained project'; }
  else if (score >= 65) { grade = 'B+'; label = 'Good — Minor risks, solid fundamentals'; }
  else if (score >= 55) { grade = 'B'; label = 'Above Average — Some areas need attention'; }
  else if (score >= 45) { grade = 'C+'; label = 'Fair — Notable risks, needs improvement'; }
  else if (score >= 35) { grade = 'C'; label = 'Below Average — Significant concerns'; }
  else if (score >= 25) { grade = 'D'; label = 'Poor — High risk, limited viability'; }
  else { grade = 'F'; label = 'Critical — Not investable in current state'; }

  return { score, maxScore, grade, label, breakdown };
}

// ── Utility Functions ────────────────────────────────

function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(arr) {
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
