/**
 * GitPulse AI — Agent D: The Supervisor
 *
 * Quality validation layer. Uses Llama 3.3 to:
 * 1. Check the Executor's report for hallucinations against real data
 * 2. Assign confidence scores to each section
 * 3. Flag any claims not supported by the metrics
 *
 * This is the "guardrail" that makes the output enterprise-grade.
 */

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Validate the generated report against the raw metrics
 * Returns a quality assessment with confidence score
 */
export async function validateReport(report, metrics, scoutData) {
  const prompt = `You are a quality assurance auditor for AI-generated technical reports. Your job is to validate this due diligence report against the ACTUAL DATA provided.

## THE GENERATED REPORT:
${report.substring(0, 3000)}

## THE ACTUAL METRICS (ground truth):
- Stars: ${metrics.health.stars}
- Bus Factor: ${metrics.contributors.busFactor}
- Contributors: ${metrics.contributors.count}
- Top contributor share: ${metrics.contributors.topContributors[0]?.percentage ?? 'N/A'}%
- Commits/week: ${metrics.velocity.commitsPerWeek}
- Median PR merge: ${metrics.velocity.prMergeTime.median ?? 'N/A'}h
- Median issue close: ${metrics.velocity.issueCloseTime.median ?? 'N/A'}h
- Releases: ${metrics.releases.count}
- Activity trend: ${metrics.activity.trend}
- Investment Grade: ${metrics.investmentGrade.grade} (${metrics.investmentGrade.score}/100)
- License: ${metrics.health.license ?? 'None'}

## YOUR TASK:
Respond in this EXACT JSON format (no markdown, no explanation, just JSON):

{
  "overallConfidence": <number 0-100>,
  "hallucinations": [
    {"claim": "<exact quote from report>", "issue": "<why it's wrong or unsupported>"}
  ],
  "missingContext": ["<important metric the report should have mentioned but didn't>"],
  "gradeAgreement": <true if you agree with the investment grade, false if not>,
  "suggestedGradeAdjustment": "<null or 'upgrade'/'downgrade' with reason>",
  "qualityScore": <number 0-100>
}

Be strict. If a number in the report doesn't match the actual data, flag it. If the report makes a claim not supported by the metrics, flag it.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
      stream: false
    });

    const raw = completion.choices[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const validation = JSON.parse(jsonMatch[0]);
        return {
          status: 'validated',
          confidence: validation.overallConfidence || 0,
          qualityScore: validation.qualityScore || 0,
          hallucinations: validation.hallucinations || [],
          missingContext: validation.missingContext || [],
          gradeAgreement: validation.gradeAgreement ?? true,
          suggestedGradeAdjustment: validation.suggestedGradeAdjustment || null
        };
      } catch (parseError) {
        return {
          status: 'parse-error',
          confidence: 50,
          qualityScore: 50,
          hallucinations: [],
          missingContext: [],
          gradeAgreement: true,
          suggestedGradeAdjustment: null,
          rawResponse: raw.substring(0, 500)
        };
      }
    }

    return {
      status: 'no-json',
      confidence: 50,
      qualityScore: 50,
      hallucinations: [],
      missingContext: [],
      gradeAgreement: true,
      suggestedGradeAdjustment: null
    };
  } catch (error) {
    // Supervisor failure shouldn't block the report
    return {
      status: 'error',
      confidence: 0,
      qualityScore: 0,
      hallucinations: [],
      missingContext: [],
      gradeAgreement: true,
      suggestedGradeAdjustment: null,
      error: error.message
    };
  }
}
