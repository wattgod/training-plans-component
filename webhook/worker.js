/**
 * Cloudflare Worker: Training Plan Request Handler
 * 
 * Receives form submissions from training-plan-questionnaire.html
 * Validates data, sends notification email, optionally triggers GitHub Action
 * 
 * SETUP:
 * 1. Create a Cloudflare Worker at dash.cloudflare.com
 * 2. Paste this code
 * 3. Add environment variables:
 *    - NOTIFICATION_EMAIL: Your email for receiving requests
 *    - SENDGRID_API_KEY: SendGrid API key for sending emails
 *    - ALLOWED_ORIGINS: Comma-separated allowed origins
 *    - GITHUB_TOKEN: (optional) Personal Access Token with repo scope
 * 4. Deploy and copy the worker URL
 * 5. Update training-plan-questionnaire.html with the worker URL
 */

const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'throwaway.email', 'fakeinbox.com', 'trashmail.com', 'maildrop.cc',
  'yopmail.com', 'temp-mail.org', 'getnada.com', 'mohmal.com'
];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const origin = request.headers.get('Origin');
    const allowedOrigins = (env.ALLOWED_ORIGINS || 'https://wattgod.github.io').split(',').map(o => o.trim());
    const isAllowed = allowedOrigins.some(allowed => origin?.startsWith(allowed));
    
    if (!isAllowed) {
      console.log('Blocked origin:', origin);
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const data = await request.json();
      
      const validation = validateSubmission(data);
      if (!validation.valid) {
        return jsonResponse({ error: validation.error }, 400, origin);
      }

      const requestId = generateRequestId(data.email, data.race_slug);
      const trainingRequest = formatTrainingRequest(data, requestId);

      if (env.SENDGRID_API_KEY && env.NOTIFICATION_EMAIL) {
        await sendNotificationEmail(env, trainingRequest);
      }

      if (env.GITHUB_TOKEN) {
        await triggerGitHubAction(env.GITHUB_TOKEN, trainingRequest);
      }

      console.log('Training plan request:', {
        request_id: requestId,
        race: data.race_name,
        email: data.email,
        timestamp: new Date().toISOString()
      });

      return jsonResponse({
        success: true,
        message: `Got it! I'll build your ${data.race_name || 'training'} plan and send it to ${data.email} within 24 hours (usually same day).`,
        request_id: requestId
      }, 200, origin);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Invalid request' }, 400, origin);
    }
  }
};

function validateSubmission(data) {
  // Required fields
  const required = [
    'name', 'email', 'sex', 'age', 'weight', 'height_ft', 'height_in',
    'years_cycling', 'race_date', 'race_goal', 'longest_ride',
    'hours_per_week', 'trainer_access', 'long_ride_day', 'interval_day',
    'strength_current', 'strength_want'
  ];
  
  for (const field of required) {
    if (!data[field]) {
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return { valid: false, error: `Missing required field: ${label}` };
    }
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Disposable email check
  const emailDomain = data.email.split('@')[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
    return { valid: false, error: 'Please use a non-disposable email address' };
  }

  // Honeypot
  if (data.website) {
    return { valid: false, error: 'Bot detected' };
  }

  // Race date validation
  const raceDate = new Date(data.race_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (raceDate < today) {
    return { valid: false, error: 'Race date must be in the future' };
  }

  const weeksUntilRace = Math.floor((raceDate - today) / (7 * 24 * 60 * 60 * 1000));
  if (weeksUntilRace < 4) {
    return { valid: false, error: 'Race date must be at least 4 weeks away' };
  }

  return { valid: true };
}

function generateRequestId(email, raceSlug) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 15);
  const race = (raceSlug || 'custom').substring(0, 10);
  const timestamp = Date.now().toString(36);
  return `tp-${race}-${base}-${timestamp}`;
}

function formatTrainingRequest(data, requestId) {
  const raceDate = new Date(data.race_date);
  const today = new Date();
  const weeksUntilRace = Math.floor((raceDate - today) / (7 * 24 * 60 * 60 * 1000));

  // Calculate height in inches for BMI etc
  const heightInches = (parseInt(data.height_ft) * 12) + parseInt(data.height_in);
  const heightCm = Math.round(heightInches * 2.54);
  const weightKg = Math.round(parseInt(data.weight) * 0.453592);

  return {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    
    athlete: {
      name: data.name,
      email: data.email,
      sex: data.sex,
      age: parseInt(data.age),
      weight_lbs: parseInt(data.weight),
      weight_kg: weightKg,
      height_ft: parseInt(data.height_ft),
      height_in: parseInt(data.height_in),
      height_cm: heightCm,
      years_cycling: data.years_cycling
    },
    
    race: {
      slug: data.race_slug || 'custom',
      name: data.race_name || 'Custom Race',
      date: data.race_date,
      distance: data.race_distance || 'unknown',
      goal: data.race_goal,
      weeks_until: weeksUntilRace
    },
    
    fitness: {
      longest_recent_ride: data.longest_ride,
      ftp: data.ftp ? parseInt(data.ftp) : null,
      hr_max: data.hr_max ? parseInt(data.hr_max) : null,
      hr_threshold: data.hr_threshold ? parseInt(data.hr_threshold) : null,
      hr_resting: data.hr_resting ? parseInt(data.hr_resting) : null
    },
    
    schedule: {
      hours_per_week: data.hours_per_week,
      trainer_access: data.trainer_access,
      long_ride_day: data.long_ride_day,
      interval_day: data.interval_day,
      off_days: Array.isArray(data.off_days) ? data.off_days : (data.off_days ? [data.off_days] : [])
    },
    
    strength: {
      current: data.strength_current,
      want_in_plan: data.strength_want,
      equipment: Array.isArray(data.strength_equipment) ? data.strength_equipment : (data.strength_equipment ? [data.strength_equipment] : [])
    },
    
    notes: {
      injuries: data.injuries || null,
      additional: data.notes || null
    }
  };
}

async function sendNotificationEmail(env, req) {
  const emailBody = formatEmailBody(req);
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: env.NOTIFICATION_EMAIL }],
          subject: `🏁 Training Plan: ${req.race.name} - ${req.athlete.name} (${req.race.goal})`
        }],
        from: { email: 'plans@gravelgod.com', name: 'Gravel God Plans' },
        reply_to: { email: req.athlete.email, name: req.athlete.name },
        content: [{ type: 'text/html', value: emailBody }]
      })
    });

    if (!response.ok) {
      console.error('SendGrid error:', await response.text());
    }
  } catch (error) {
    console.error('Email error:', error);
  }
}

function formatEmailBody(req) {
  const offDays = req.schedule.off_days.length > 0 ? req.schedule.off_days.join(', ') : 'None specified';
  const equipment = req.strength.equipment.length > 0 ? req.strength.equipment.join(', ') : 'Not specified';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Courier New', monospace; background: #f5f5dc; padding: 20px; margin: 0; }
    .card { background: white; border: 3px solid #2c2c2c; padding: 24px; max-width: 650px; margin: 0 auto; }
    h1 { font-size: 18px; border-bottom: 3px solid #2c2c2c; padding-bottom: 8px; margin-top: 0; }
    h2 { font-size: 13px; color: #8c7568; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .row { display: flex; margin: 6px 0; font-size: 14px; }
    .label { width: 150px; color: #8c7568; flex-shrink: 0; }
    .value { font-weight: 600; color: #2c2c2c; }
    .highlight { background: #4ecdc4; padding: 2px 8px; color: #2c2c2c; }
    .goal-tag { display: inline-block; background: #F4D03F; padding: 4px 12px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
    .notes-box { background: #f5f5dc; padding: 12px; margin-top: 8px; font-size: 13px; border-left: 3px solid #4ecdc4; }
    .footer { margin-top: 20px; padding-top: 16px; border-top: 2px solid #2c2c2c; font-size: 12px; color: #8c7568; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .metrics { background: #f9f9f9; padding: 12px; margin-top: 8px; }
    .metric { display: inline-block; margin-right: 16px; }
    .metric-value { font-weight: 700; color: #2c2c2c; }
    .metric-label { font-size: 11px; color: #8c7568; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🏁 Training Plan Request</h1>
    <p style="margin: 0 0 16px 0;"><strong>ID:</strong> ${req.request_id}</p>
    
    <h2>Athlete Profile</h2>
    <div class="grid">
      <div>
        <div class="row"><span class="label">Name:</span><span class="value">${req.athlete.name}</span></div>
        <div class="row"><span class="label">Email:</span><span class="value">${req.athlete.email}</span></div>
        <div class="row"><span class="label">Sex:</span><span class="value">${req.athlete.sex}</span></div>
        <div class="row"><span class="label">Age:</span><span class="value">${req.athlete.age}</span></div>
      </div>
      <div>
        <div class="row"><span class="label">Height:</span><span class="value">${req.athlete.height_ft}'${req.athlete.height_in}" (${req.athlete.height_cm}cm)</span></div>
        <div class="row"><span class="label">Weight:</span><span class="value">${req.athlete.weight_lbs} lbs (${req.athlete.weight_kg}kg)</span></div>
        <div class="row"><span class="label">Experience:</span><span class="value">${req.athlete.years_cycling} years</span></div>
      </div>
    </div>
    
    <h2>Race</h2>
    <div class="row"><span class="label">Race:</span><span class="value"><span class="highlight">${req.race.name}</span></span></div>
    <div class="row"><span class="label">Date:</span><span class="value">${req.race.date} (${req.race.weeks_until} weeks)</span></div>
    <div class="row"><span class="label">Distance:</span><span class="value">${req.race.distance}</span></div>
    <div class="row"><span class="label">Goal:</span><span class="value"><span class="goal-tag">${req.race.goal}</span></span></div>
    
    <h2>Current Fitness</h2>
    <div class="row"><span class="label">Longest Ride:</span><span class="value">${req.fitness.longest_recent_ride} hours (last 4 weeks)</span></div>
    <div class="metrics">
      <span class="metric"><span class="metric-value">${req.fitness.ftp || '—'}</span> <span class="metric-label">FTP</span></span>
      <span class="metric"><span class="metric-value">${req.fitness.hr_max || '—'}</span> <span class="metric-label">Max HR</span></span>
      <span class="metric"><span class="metric-value">${req.fitness.hr_threshold || '—'}</span> <span class="metric-label">LTHR</span></span>
      <span class="metric"><span class="metric-value">${req.fitness.hr_resting || '—'}</span> <span class="metric-label">Resting HR</span></span>
    </div>
    
    <h2>Schedule</h2>
    <div class="row"><span class="label">Hours/Week:</span><span class="value">${req.schedule.hours_per_week}</span></div>
    <div class="row"><span class="label">Long Ride:</span><span class="value">${req.schedule.long_ride_day}</span></div>
    <div class="row"><span class="label">Intervals:</span><span class="value">${req.schedule.interval_day}</span></div>
    <div class="row"><span class="label">Off Days:</span><span class="value">${offDays}</span></div>
    <div class="row"><span class="label">Trainer:</span><span class="value">${req.schedule.trainer_access}</span></div>
    
    <h2>Strength Training</h2>
    <div class="row"><span class="label">Current:</span><span class="value">${req.strength.current}</span></div>
    <div class="row"><span class="label">Include:</span><span class="value">${req.strength.want_in_plan}</span></div>
    <div class="row"><span class="label">Equipment:</span><span class="value">${equipment}</span></div>
    
    ${req.notes.injuries ? `<h2>Injuries/Limitations</h2><div class="notes-box">${req.notes.injuries}</div>` : ''}
    ${req.notes.additional ? `<h2>Additional Notes</h2><div class="notes-box">${req.notes.additional}</div>` : ''}
    
    <div class="footer">
      <p>↩️ Reply directly to contact ${req.athlete.name}</p>
      <p>Submitted: ${req.timestamp}</p>
    </div>
  </div>
</body>
</html>`;
}

async function triggerGitHubAction(token, request) {
  try {
    await fetch('https://api.github.com/repos/wattgod/training-plans-component/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Gravel-God-Training-Plans'
      },
      body: JSON.stringify({
        event_type: 'training-plan-request',
        client_payload: request
      })
    });
  } catch (error) {
    console.error('GitHub trigger error:', error);
  }
}

function handleCORS(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGINS || 'https://wattgod.github.io').split(',').map(o => o.trim());
  const isAllowed = allowedOrigins.some(allowed => origin?.startsWith(allowed));
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*'
    }
  });
}
