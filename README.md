# Training Plans Section Component

On-demand training plans section for Gravel God landing pages.

## The Model

**Old approach:** Pre-build 15 tier plans per race (13.75 hours each, might not sell)

**New approach:** Single CTA → Questionnaire → Custom plan built on demand ($199, same-day delivery)

## What It Generates

```
┌──────────────────────────────────────────────────────┐
│  ◆ Training Plans                                    │
│                                                      │
│  YOUR PLAN. BUILT FOR YOU.                          │
│  We build a plan calibrated to SBT GRVL's           │
│  altitude demands and 8,000+ feet of climbing.      │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │    1    │  │    2    │  │    3    │             │
│  │ Fill Out│  │ I Build │  │ Train   │             │
│  │Question-│  │Your Plan│  │  With   │             │
│  │  naire  │  │         │  │Confidence│            │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │        Ready to Build Your SBT GRVL Plan?     │   │
│  │                                               │   │
│  │        [ BUILD MY TRAINING PLAN → ]           │   │
│  │                                               │   │
│  │  ✓ Custom workouts  ✓ ZWO files              │   │
│  │  ✓ Race guide       ✓ Strategy               │   │
│  │                                               │   │
│  │         $199 one-time | Same-day delivery    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## Usage

### Direct Call

```python
from training_plans_section import generate_training_plans_section

html = generate_training_plans_section(
    race_name="SBT GRVL",
    race_slug="sbt-grvl",
    race_challenge="altitude demands and 8,000+ feet of climbing at elevation"
)
```

### From Race Data Dict

```python
from training_plans_section import generate_training_plans_html

data = {
    "race": {
        "display_name": "SBT GRVL",
        "slug": "sbt-grvl",
        "race_challenge_tagline": "altitude demands and 8,000+ feet of climbing"
    }
}

html = generate_training_plans_html(data)
```

## Integration with Landing Page Generator

In `generate_landing_page.py`:

```python
from training_plans_section import generate_training_plans_html

# In build_elementor_json():
training_html = generate_training_plans_html(data)
```

## Race Challenge Tagline Examples

Add `race_challenge_tagline` to your race data JSON:

| Race | race_challenge_tagline |
|------|------------------------|
| SBT GRVL | altitude demands and 8,000+ feet of climbing at elevation |
| Unbound 200 | heat demands and 200 miles of relentless Flint Hills terrain |
| Mid South | unpredictable weather and potential red dirt chaos |
| BWR California | 10,000+ feet of climbing and punchy SoCal heat |
| Leadville 100 | extreme altitude starting at 10,200 feet |

## Questionnaire

Each race gets its own pre-filled questionnaire:

```
https://wattgod.github.io/training-plans-component/training-plan-questionnaire.html?race={slug}
```

**Examples:**
- Unbound: `?race=unbound-200`
- Mid South: `?race=mid-south`
- SBT GRVL: `?race=sbt-grvl`
- BWR: `?race=belgian-waffle-ride`

The `?race=` parameter:
- Pre-fills race name in header
- Pre-fills race date
- Pre-fills race distance
- Sets hidden fields for backend processing

### Questionnaire Fields

| Section | Fields |
|---------|--------|
| Contact | Name, Email |
| Race Details | Race Date, Distance, Goal |
| Current Fitness | FTP, Years Cycling, Longest Recent Ride |
| Schedule | Hours/Week, Long Ride Day, Trainer Access |
| Additional | Injuries, Notes |

## Tests

```bash
python3 test_training_plans_section.py
```

14 tests covering:
- HTML structure
- Section elements
- Questionnaire URL
- CTA button
- Price ($199)
- Same-day delivery
- 3-step process
- Device compatibility list
- CSS inclusion
- Fallback behavior

## Design System

- **Badge background:** `#F4D03F` (yellow)
- **Step numbers:** `#4ECDC4` (turquoise)
- **CTA button:** `#4ECDC4` background, `#F4D03F` shadow
- **CTA block:** `#2c2c2c` background
- **Font:** Sometype Mono

## Files

```
training-plans-component/
├── training_plans_section.py         # Python module for landing pages
├── test_training_plans_section.py    # Tests (14)
├── training-plan-questionnaire.html  # Race-specific intake form
├── index.html                        # Redirect to questionnaire
├── preview.html                      # Visual preview of section
└── README.md                         # This file
```

## GitHub Pages Setup

This repo uses GitHub Pages to host the questionnaire:

1. Go to repo Settings → Pages
2. Source: Deploy from branch
3. Branch: `main`, folder: `/ (root)`
4. Save

Questionnaire will be live at:
`https://wattgod.github.io/training-plans-component/training-plan-questionnaire.html`

## Related Repos

- [gravel-landing-page-project](https://github.com/wattgod/gravel-landing-page-project) - Landing page generator
- [athlete-profiles](https://github.com/wattgod/athlete-profiles) - Questionnaire + plan automation
