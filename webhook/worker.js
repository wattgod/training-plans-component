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
 *    - GITHUB_TOKEN: Personal Access Token with repo scope (optional, for GitHub Action)
 *    - NOTIFICATION_EMAIL: Your email for receiving requests
 *    - SENDGRID_API_KEY: SendGrid API key for sending emails (or use Mailgun/Resend)
 *    - ALLOWED_ORIGINS: Comma-separated allowed origins
 * 4. Deploy and copy the worker URL
 * 5. Update training-plan-questionnaire.html with the worker URL
 */

// Disposable email domains to block
const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'throwaway.email', 'fakeinbox.com', 'trashmail.com', 'maildrop.cc',
  'yopmail.com', 'temp-mail.org', 'getnada.com', 'mohmal.com'
];

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Check origin
    const origin = request.headers.get('Origin');
    const allowedOrigins = (env.ALLOWED_ORIGINS || 'https://wattgod.github.io').split(',').map(o => o.trim());
    
    const isAllowed = allowedOrigins.some(allowed => origin?.startsWith(allowed));
    if (!isAllowed) {
      console.log('Blocked origin:', origin);
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const data = await request.json();
      
      // Validate submission
      const validation = validateSubmission(data);
      if (!validation.valid) {
        return jsonResponse({ error: validation.error }, 400, origin);
      }

      // Generate request ID
      const requestId = generateRequestId(data.email, data.race_slug);

      // Format the request for processing
      const trainingRequest = formatTrainingRequest(data, requestId);

      // Send notification email
      if (env.SENDGRID_API_KEY && env.NOTIFICATION_EMAIL) {
        await sendNotificationEmail(env, trainingRequest);
      }

      // Optionally trigger GitHub Action for automated processing
      if (env.GITHUB_TOKEN) {
        await triggerGitHubAction(env.GITHUB_TOKEN, trainingRequest);
      }

      // Log the request (Cloudflare Workers logs)
      console.log('Training plan request received:', {
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
  const required = ['name', 'email', 'race_date', 'race_goal', 'years_cycling', 'longest_ride', 'hours_per_week', 'long_ride_day', 'trainer_access'];
  
  for (const field of required) {
    if (!data[field]) {
      return { valid: false, error: `Missing required field: ${field.replace('_', ' ')}` };
    }
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for disposable email
  const emailDomain = data.email.split('@')[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
    return { valid: false, error: 'Please use a non-disposable email address' };
  }

  // Honeypot check
  if (data.website) {
    return { valid: false, error: 'Bot detected' };
  }

  // Race date validation (must be in the future)
  const raceDate = new Date(data.race_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (raceDate < today) {
    return { valid: false, error: 'Race date must be in the future' };
  }

  // Calculate weeks until race
  const weeksUntilRace = Math.floor((raceDate - today) / (7 * 24 * 60 * 60 * 1000));
  if (weeksUntilRace < 4) {
    return { valid: false, error: 'Race date must be at least 4 weeks away for effective training' };
  }

  return { valid: true };
}

function generateRequestId(email, raceSlug) {
  const base = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 15);
  
  const race = (raceSlug || 'custom').substring(0, 10);
  const timestamp = Date.now().toString(36);
  
  return `tp-${race}-${base}-${timestamp}`;
}

function formatTrainingRequest(data, requestId) {
  const raceDate = new Date(data.race_date);
  const today = new Date();
  const weeksUntilRace = Math.floor((raceDate - today) / (7 * 24 * 60 * 60 * 1000));

  return {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    
    // Contact
    athlete: {
      name: data.name,
      email: data.email
    },
    
    // Race details
    race: {
      slug: data.race_slug || 'custom',
      name: data.race_name || 'Custom Race',
      date: data.race_date,
      distance: data.race_distance || 'unknown',
      goal: data.race_goal,
      weeks_until: weeksUntilRace
    },
    
    // Fitness
    fitness: {
      ftp: data.ftp ? parseInt(data.ftp) : null,
      years_cycling: data.years_cycling,
      longest_recent_ride: data.longest_ride
    },
    
    // Schedule
    schedule: {
      hours_per_week: data.hours_per_week,
      long_ride_day: data.long_ride_day,
      trainer_access: data.trainer_access
    },
    
    // Additional
    notes: {
      injuries: data.injuries || null,
      additional: data.notes || null
    }
  };
}

async function sendNotificationEmail(env, request) {
  const emailBody = formatEmailBody(request);
  
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
          subject: `🏁 Training Plan Request: ${request.race.name} - ${request.athlete.name}`
        }],
        from: {
          email: 'plans@gravelgod.com',
          name: 'Gravel God Training Plans'
        },
        reply_to: {
          email: request.athlete.email,
          name: request.athlete.name
        },
        content: [{
          type: 'text/html',
          value: emailBody
        }]
      })
    });

    if (!response.ok) {
      console.error('SendGrid error:', await response.text());
    }
  } catch (error) {
    console.error('Email send error:', error);
  }
}

function formatEmailBody(req) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Courier New', monospace; background: #f5f5dc; padding: 20px; }
    .card { background: white; border: 3px solid #2c2c2c; padding: 24px; max-width: 600px; margin: 0 auto; }
    h1 { font-size: 20px; border-bottom: 3px solid #2c2c2c; padding-bottom: 8px; }
    h2 { font-size: 14px; color: #8c7568; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.1em; }
    .row { display: flex; margin: 8px 0; }
    .label { width: 140px; color: #8c7568; }
    .value { font-weight: 600; }
    .highlight { background: #4ecdc4; padding: 2px 8px; }
    .notes { background: #f5f5dc; padding: 12px; margin-top: 8px; font-size: 14px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #2c2c2c; font-size: 12px; color: #8c7568; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🏁 New Training Plan Request</h1>
    <p><strong>Request ID:</strong> ${req.request_id}</p>
    
    <h2>Athlete</h2>
    <div class="row"><span class="label">Name:</span><span class="value">${req.athlete.name}</span></div>
    <div class="row"><span class="label">Email:</span><span class="value">${req.athlete.email}</span></div>
    
    <h2>Race</h2>
    <div class="row"><span class="label">Race:</span><span class="value highlight">${req.race.name}</span></div>
    <div class="row"><span class="label">Date:</span><span class="value">${req.race.date}</span></div>
    <div class="row"><span class="label">Distance:</span><span class="value">${req.race.distance}</span></div>
    <div class="row"><span class="label">Goal:</span><span class="value">${req.race.goal}</span></div>
    <div class="row"><span class="label">Weeks Until:</span><span class="value">${req.race.weeks_until} weeks</span></div>
    
    <h2>Current Fitness</h2>
    <div class="row"><span class="label">FTP:</span><span class="value">${req.fitness.ftp ? req.fitness.ftp + 'W' : 'Not provided'}</span></div>
    <div class="row"><span class="label">Years Cycling:</span><span class="value">${req.fitness.years_cycling}</span></div>
    <div class="row"><span class="label">Longest Ride:</span><span class="value">${req.fitness.longest_recent_ride}</span></div>
    
    <h2>Schedule</h2>
    <div class="row"><span class="label">Hours/Week:</span><span class="value">${req.schedule.hours_per_week}</span></div>
    <div class="row"><span class="label">Long Ride Day:</span><span class="value">${req.schedule.long_ride_day}</span></div>
    <div class="row"><span class="label">Trainer:</span><span class="value">${req.schedule.trainer_access}</span></div>
    
    ${req.notes.injuries ? `<h2>Injuries/Limitations</h2><div class="notes">${req.notes.injuries}</div>` : ''}
    ${req.notes.additional ? `<h2>Additional Notes</h2><div class="notes">${req.notes.additional}</div>` : ''}
    
    <div class="footer">
      <p>Reply directly to this email to contact ${req.athlete.name}</p>
      <p>Submitted: ${req.timestamp}</p>
    </div>
  </div>
</body>
</html>
  `;
}

async function triggerGitHubAction(token, request) {
  try {
    const response = await fetch('https://api.github.com/repos/wattgod/training-plans-component/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Gravel-God-Training-Plans-Worker'
      },
      body: JSON.stringify({
        event_type: 'training-plan-request',
        client_payload: request
      })
    });

    if (!response.ok) {
      console.error('GitHub API error:', await response.text());
    }
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
