# Cloudflare Worker Setup

This worker handles training plan form submissions.

## What It Does

1. **Receives** form submission from `training-plan-questionnaire.html`
2. **Validates** data (required fields, email format, race date in future)
3. **Sends notification email** to you with all request details
4. **Optionally triggers** GitHub Action for automated processing
5. **Returns** success/error response to the form

## Setup Steps

### 1. Create Cloudflare Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it: `training-plan-intake`
4. Click **Deploy**

### 2. Add Worker Code

1. Click **Edit Code**
2. Replace all code with contents of `worker.js`
3. Click **Save and Deploy**

### 3. Configure Environment Variables

Go to **Settings** → **Variables** and add:

| Variable | Value | Required |
|----------|-------|----------|
| `ALLOWED_ORIGINS` | `https://wattgod.github.io,http://localhost:3000` | Yes |
| `NOTIFICATION_EMAIL` | Your email (e.g., `matti@gravelgod.com`) | Yes |
| `SENDGRID_API_KEY` | Your SendGrid API key | Yes |
| `GITHUB_TOKEN` | GitHub PAT with repo scope | Optional |

### 4. Get Your Worker URL

After deploying, your worker URL will be:
```
https://training-plan-intake.{your-subdomain}.workers.dev
```

### 5. Update Questionnaire

In `training-plan-questionnaire.html`, update the fetch URL:

```javascript
const response = await fetch('https://training-plan-intake.YOUR_SUBDOMAIN.workers.dev', {
```

## Email Setup (SendGrid)

### Create SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com)
2. Create free account (100 emails/day free)
3. Verify your email domain or use single sender verification

### Get API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `training-plan-worker`
4. Permissions: **Restricted Access** → **Mail Send** → **Full Access**
5. Copy the key (only shown once!)

### Verify Sender

1. Go to **Settings** → **Sender Authentication**
2. Either verify your domain OR
3. Use **Single Sender Verification** for `plans@gravelgod.com`

## Testing

### Test Locally with Wrangler

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create wrangler.toml
cat > wrangler.toml << EOF
name = "training-plan-intake"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGINS = "http://localhost:3000,https://wattgod.github.io"
EOF

# Add secrets
wrangler secret put NOTIFICATION_EMAIL
wrangler secret put SENDGRID_API_KEY
wrangler secret put GITHUB_TOKEN  # optional

# Run locally
wrangler dev
```

### Test with curl

```bash
curl -X POST https://training-plan-intake.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://wattgod.github.io" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "race_slug": "sbt-grvl",
    "race_name": "SBT GRVL",
    "race_date": "2025-08-16",
    "race_distance": "150mi",
    "race_goal": "finish",
    "years_cycling": "3-5",
    "longest_ride": "4-6",
    "hours_per_week": "8-10",
    "long_ride_day": "saturday",
    "trainer_access": "yes-smart"
  }'
```

## Notification Email Format

When you receive a request, the email will include:

```
🏁 New Training Plan Request
Request ID: tp-sbt-grvl-testuser-abc123

ATHLETE
Name: Test User
Email: test@example.com

RACE
Race: SBT GRVL
Date: 2025-08-16
Distance: 150mi
Goal: finish
Weeks Until: 32 weeks

CURRENT FITNESS
FTP: 250W
Years Cycling: 3-5
Longest Ride: 4-6 hours

SCHEDULE
Hours/Week: 8-10
Long Ride Day: saturday
Trainer: yes-smart
```

## GitHub Action (Optional)

If you add `GITHUB_TOKEN`, the worker will trigger a GitHub Action that can:
- Create a request tracking issue
- Log to a spreadsheet
- Start automated plan generation

Create `.github/workflows/training-plan-request.yml`:

```yaml
name: Training Plan Request

on:
  repository_dispatch:
    types: [training-plan-request]

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Log Request
        run: |
          echo "New request: ${{ github.event.client_payload.request_id }}"
          echo "Race: ${{ github.event.client_payload.race.name }}"
          echo "Athlete: ${{ github.event.client_payload.athlete.name }}"
```

## Troubleshooting

### CORS Errors

- Check `ALLOWED_ORIGINS` includes your domain
- Make sure origin doesn't have trailing slash

### Email Not Sending

- Verify SendGrid API key is correct
- Check sender email is verified in SendGrid
- Look at Worker logs in Cloudflare dashboard

### Form Validation Failing

- All required fields must be filled
- Race date must be at least 4 weeks in future
- Email can't be disposable domain
