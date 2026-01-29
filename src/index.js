// Training Plan Intake Worker
// Saves form submissions as GitHub Issues with spam protection

const ALLOWED_ORIGINS = [
  'https://wattgod.github.io',
  'https://gravelgodcycling.com',
  'https://www.gravelgodcycling.com',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(allowedOrigin),
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders(allowedOrigin),
      });
    }

    try {
      const data = await request.json();

      // Spam protection: Honeypot field (should be empty)
      if (data._honeypot) {
        // Silently reject but return success to fool bots
        return jsonResponse({
          success: true,
          message: 'Thank you for your submission!'
        }, 200, allowedOrigin);
      }

      // Spam protection: Verify Turnstile token (if provided)
      if (data.turnstileToken && env.TURNSTILE_SECRET_KEY) {
        const turnstileValid = await verifyTurnstile(data.turnstileToken, env.TURNSTILE_SECRET_KEY, request);
        if (!turnstileValid) {
          return jsonResponse({ error: 'Security verification failed. Please try again.' }, 400, allowedOrigin);
        }
      }

      // Validate required fields
      if (!data.name || !data.email) {
        return jsonResponse({ error: 'Name and email are required' }, 400, allowedOrigin);
      }

      // Basic email validation
      if (!isValidEmail(data.email)) {
        return jsonResponse({ error: 'Please enter a valid email address' }, 400, allowedOrigin);
      }

      // Remove internal fields before saving
      delete data.turnstileToken;
      delete data._honeypot;
      delete data._formLoadTime;

      // Create GitHub Issue
      await createGitHubIssue(data, env);

      return jsonResponse({
        success: true,
        message: `Thanks ${data.name}! Your training plan request has been received. We'll be in touch at ${data.email} soon.`
      }, 200, allowedOrigin);

    } catch (error) {
      console.error('Error processing submission:', error);
      return jsonResponse({
        error: 'Failed to process submission. Please try again.',
        details: error.message
      }, 500, allowedOrigin);
    }
  },
};

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token, secretKey, request) {
  const ip = request.headers.get('CF-Connecting-IP');

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secretKey}&response=${token}&remoteip=${ip}`,
  });

  const result = await response.json();
  return result.success === true;
}

// Basic email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// CORS headers
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// JSON response helper
function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Create GitHub Issue
async function createGitHubIssue(data, env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;

  // Get race name for title (prefer A-race, then first race, then fallback)
  let raceName = 'Custom Plan';
  if (data.races && Array.isArray(data.races) && data.races.length > 0) {
    const aRace = data.races.find(r => r.priority === 'A');
    raceName = aRace ? aRace.name : data.races[0].name;
    if (data.races.length > 1) {
      raceName += ` +${data.races.length - 1} more`;
    }
  } else if (data.race || data.targetRace) {
    raceName = data.race || data.targetRace;
  }
  const title = `Training Plan Request: ${data.name} - ${raceName}`;
  const body = formatIssueBody(data);
  const labels = ['training-plan-request'];

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Training-Plan-Intake-Worker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${error}`);
  }

  return response.json();
}

// Format races table
function formatRaces(data) {
  // Handle new multi-race format
  if (data.races && Array.isArray(data.races) && data.races.length > 0) {
    const sortedRaces = [...data.races].sort((a, b) => {
      // Sort by priority (A first), then by date
      const priorityOrder = { 'A': 0, 'B': 1, 'C': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.date) - new Date(b.date);
    });

    let table = '| Priority | Race | Date | Weeks Out | Distance | Goal |\n';
    table += '|:--------:|------|------|:---------:|:--------:|------|\n';

    sortedRaces.forEach(race => {
      const weeksOut = race.date ? calculateWeeksOut(race.date) : 'N/A';
      const priorityEmoji = race.priority === 'A' ? '🅰️' : race.priority === 'B' ? '🅱️' : '🅲';
      table += `| ${priorityEmoji} **${race.priority}** | ${race.name} | ${race.date} | ${weeksOut} | ${race.distance || 'N/A'} mi | ${race.goal || 'N/A'} |\n`;
    });

    return table;
  }

  // Fallback for old single-race format
  if (data.race || data.targetRace || data.raceDate) {
    const weeksOut = data.raceDate ? calculateWeeksOut(data.raceDate) : 'N/A';
    return `| Field | Value |
|-------|-------|
| Race | ${data.race || data.targetRace || 'N/A'} |
| Date | ${data.raceDate || 'N/A'} |
| Weeks Out | ${weeksOut} |
| Distance | ${data.raceDistance || 'N/A'} |
| Goal | ${data.goal || 'N/A'} |`;
  }

  return '_No races specified_';
}

// Format issue body as markdown
function formatIssueBody(data) {
  return `## Training Plan Request

**Submitted:** ${new Date().toISOString()}
**Source:** ${data._source || 'Direct'}

---

### Contact Info
| Field | Value |
|-------|-------|
| Name | ${data.name} |
| Email | ${data.email} |

---

### Athlete Profile
| Field | Value |
|-------|-------|
| Sex | ${data.sex || 'N/A'} |
| Age | ${data.age || 'N/A'} |
| Weight | ${data.weight || 'N/A'} lbs |
| Height | ${data.heightFeet || ''}' ${data.heightInches || ''}" |
| Years Cycling | ${data.yearsCycling || 'N/A'} |
| Typical Sleep | ${data.typicalSleep || 'N/A'} |
| Stress Level | ${data.stressLevel || 'N/A'} |

---

### Race Calendar
${formatRaces(data)}

---

### Current Fitness
| Field | Value |
|-------|-------|
| Recent Ride Duration | ${data.recentRideDuration || 'N/A'} |
| Power or HR | ${data.powerOrHr || 'N/A'} |
| Avg Power | ${data.avgPower || 'N/A'}w |
| Avg HR | ${data.avgHr || 'N/A'} bpm |
| Estimated FTP | ${data.estimatedFtp || 'N/A'}w |
| Power/Weight | ${data.pwRatio || 'N/A'} w/kg |
| Estimated Category | ${data.estimatedCategory || 'N/A'} |

---

### Weekly Schedule
| Field | Value |
|-------|-------|
| Weekly Hours | ${data.weeklyHours || 'N/A'} |
| Trainer Type | ${data.trainerType || 'N/A'} |
| Long Ride Days | ${Array.isArray(data.longRideDays) ? data.longRideDays.join(', ') : data.longRideDays || 'N/A'} |
| Interval Days | ${Array.isArray(data.intervalDays) ? data.intervalDays.join(', ') : data.intervalDays || 'N/A'} |
| Days Off | ${Array.isArray(data.daysOff) ? data.daysOff.join(', ') : data.daysOff || 'N/A'} |

---

### Strength Training
| Field | Value |
|-------|-------|
| Current Strength Work | ${data.currentStrength || 'N/A'} |
| Include in Plan | ${data.includeStrength || 'N/A'} |

---

### Additional Notes
${data.additionalNotes || '_None provided_'}

---

### Identified Blindspots
${(data.blindspots && data.blindspots.length > 0)
  ? data.blindspots.map(b => `- ${b}`).join('\n')
  : '_None identified_'}

---

### Raw Data
<details>
<summary>Click to expand JSON</summary>

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

</details>
`;
}

// Calculate weeks until race
function calculateWeeksOut(raceDate) {
  const race = new Date(raceDate);
  const now = new Date();
  const diffMs = race - now;
  const diffWeeks = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks > 0 ? `${diffWeeks} weeks` : 'Past';
}
