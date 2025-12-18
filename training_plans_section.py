"""
Training Plans Section Generator - On-Demand Model

Generates the Training Plans section with single CTA pointing to questionnaire.
Part of the Gravel God landing page system.

Usage:
    from training_plans_section import generate_training_plans_section
    
    html = generate_training_plans_section(
        race_name="SBT GRVL",
        race_slug="sbt-grvl",
        race_challenge="altitude demands and 8,000+ feet of climbing at elevation"
    )

Business Model:
    - Old: Pre-built 15-tier plans per race (13.75 hrs each, might not sell)
    - New: On-demand via questionnaire ($199, same-day delivery, 30 min per actual customer)
"""

from typing import Dict, Optional


def generate_training_plans_section(
    race_name: str,
    race_slug: str,
    race_challenge: str
) -> str:
    """
    Generate Training Plans section HTML.
    
    Args:
        race_name: Display name of the race (e.g., "SBT GRVL")
        race_slug: URL-safe race identifier (e.g., "sbt-grvl")
        race_challenge: Race-specific challenge description for subtitle
                        (e.g., "altitude demands and 8,000+ feet of climbing")
    
    Returns:
        Complete HTML string for the Training Plans section
    """
    
    questionnaire_url = f"https://wattgod.github.io/athlete-profiles/athlete-questionnaire.html?race={race_slug}"
    
    html = f"""<section class="gg-training-section" id="training">

{get_training_plans_css()}

  <!-- Section Header -->
  <div class="gg-training-header">
    <div class="gg-training-badge">◆ Training Plans</div>
    <h2 class="gg-training-title">Your Plan. Built for You.</h2>
    <p class="gg-training-subtitle">We build a plan calibrated to <strong>{race_name}'s</strong> {race_challenge}.</p>
  </div>
  
  <!-- 3-Step Process -->
  <div class="gg-training-process-row">
    <div class="gg-training-process-step">
      <div class="gg-training-process-number">1</div>
      <h3>Fill Out the Questionnaire</h3>
      <p>Hours per week, race goals, schedule constraints, injury history. Takes 5 minutes.</p>
    </div>
    <div class="gg-training-process-step">
      <div class="gg-training-process-number">2</div>
      <h3>I Build Your Plan</h3>
      <p>A custom training plan structured around YOUR life with workouts you can upload to any device or platform.</p>
      <p class="gg-training-device-list">Garmin · Wahoo · Hammerhead · Zwift · TrainerRoad · TrainingPeaks</p>
    </div>
    <div class="gg-training-process-step">
      <div class="gg-training-process-number">3</div>
      <h3>Train With Confidence</h3>
      <p>Personalized guide with race strategy, fueling, pacing, and race-day execution.</p>
    </div>
  </div>
  
  <!-- CTA Block -->
  <div class="gg-training-cta-block">
    <h3>Ready to Build Your {race_name} Plan?</h3>
    
    <a href="{questionnaire_url}" class="gg-training-cta-button" target="_blank">
      Build My Training Plan →
    </a>
    
    <div class="gg-training-includes-row">
      <div class="gg-training-includes-item">
        <div class="gg-training-includes-icon">✓</div>
        <span>Custom structured workouts</span>
      </div>
      <div class="gg-training-includes-item">
        <div class="gg-training-includes-icon">✓</div>
        <span>ZWO files for all platforms</span>
      </div>
      <div class="gg-training-includes-item">
        <div class="gg-training-includes-icon">✓</div>
        <span>Personalized race guide</span>
      </div>
      <div class="gg-training-includes-item">
        <div class="gg-training-includes-icon">✓</div>
        <span>Race-specific strategy</span>
      </div>
    </div>
    
    <div class="gg-training-cta-footer">
      <div class="gg-training-cta-price">$199 <span>one-time</span></div>
      <div class="gg-training-cta-delivery">Plans delivered same day.</div>
    </div>
  </div>
  
</section>"""
    
    return html.strip()


def get_training_plans_css() -> str:
    """
    Return the CSS for the Training Plans section.
    Included inline with the component.
    """
    return """<style>
/* Training Plans Section - On-Demand Model */
.gg-training-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 48px 24px;
}

.gg-training-header {
  text-align: center;
  margin-bottom: 48px;
}

.gg-training-badge {
  display: inline-block;
  background: #F4D03F;
  color: #2c2c2c;
  padding: 8px 20px;
  font-family: 'Sometype Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: 3px solid #2c2c2c;
  box-shadow: 4px 4px 0 #2c2c2c;
  margin-bottom: 20px;
}

.gg-training-title {
  font-family: 'Sometype Mono', monospace;
  font-size: 36px;
  font-weight: 700;
  text-transform: uppercase;
  color: #2c2c2c;
  margin-bottom: 16px;
  letter-spacing: 0.02em;
}

.gg-training-subtitle {
  font-family: 'Sometype Mono', monospace;
  font-size: 16px;
  color: #8C7568;
  max-width: 650px;
  margin: 0 auto;
  line-height: 1.6;
}

.gg-training-subtitle strong {
  color: #59473C;
}

/* 3-Step Process */
.gg-training-process-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.gg-training-process-step {
  background: #fff;
  border: 3px solid #2c2c2c;
  padding: 28px 24px;
  width: 280px;
  text-align: center;
  position: relative;
  box-shadow: 6px 6px 0 #2c2c2c;
  font-family: 'Sometype Mono', monospace;
}

.gg-training-process-number {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  background: #4ECDC4;
  color: #2c2c2c;
  width: 32px;
  height: 32px;
  border: 3px solid #2c2c2c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.gg-training-process-step h3 {
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 12px;
  margin-top: 8px;
  letter-spacing: 0.03em;
  color: #2c2c2c;
}

.gg-training-process-step p {
  font-size: 13px;
  color: #59473C;
  line-height: 1.6;
  margin: 0;
}

.gg-training-device-list {
  font-size: 12px !important;
  color: #8C7568 !important;
  margin-top: 10px !important;
  font-style: italic;
}

/* CTA Block */
.gg-training-cta-block {
  background: #2c2c2c;
  padding: 40px;
  text-align: center;
  border: 4px solid #2c2c2c;
  box-shadow: 8px 8px 0 #59473C;
}

.gg-training-cta-block h3 {
  font-family: 'Sometype Mono', monospace;
  color: #F5F5DC;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.gg-training-cta-button {
  display: inline-block;
  background: #4ECDC4;
  color: #2c2c2c !important;
  padding: 18px 40px;
  font-family: 'Sometype Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  text-decoration: none !important;
  letter-spacing: 0.05em;
  border: 3px solid #F5F5DC;
  box-shadow: 6px 6px 0 #F4D03F;
  transition: transform 0.1s, box-shadow 0.1s;
}

.gg-training-cta-button:hover {
  transform: translate(3px, 3px);
  box-shadow: 3px 3px 0 #F4D03F;
  color: #2c2c2c !important;
}

.gg-training-includes-row {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.gg-training-includes-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #F5F5DC;
  font-family: 'Sometype Mono', monospace;
  font-size: 13px;
}

.gg-training-includes-icon {
  width: 24px;
  height: 24px;
  background: #4ECDC4;
  border: 2px solid #F5F5DC;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #2c2c2c;
}

.gg-training-cta-footer {
  margin-top: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.gg-training-cta-price {
  font-family: 'Sometype Mono', monospace;
  color: #4ECDC4;
  font-size: 28px;
  font-weight: 700;
}

.gg-training-cta-price span {
  font-size: 14px;
  color: #A89074;
  font-weight: 400;
  margin-left: 8px;
}

.gg-training-cta-delivery {
  font-family: 'Sometype Mono', monospace;
  color: #A89074;
  font-size: 13px;
}

/* Responsive */
@media (max-width: 900px) {
  .gg-training-process-row {
    flex-direction: column;
    align-items: center;
  }
  
  .gg-training-process-step {
    width: 100%;
    max-width: 400px;
  }
}

@media (max-width: 600px) {
  .gg-training-includes-row {
    flex-direction: column;
    align-items: center;
  }
  
  .gg-training-cta-footer {
    flex-direction: column;
  }
  
  .gg-training-title {
    font-size: 28px;
  }
}
</style>"""


def generate_training_plans_html(data: Dict) -> str:
    """
    Generate Training Plans section from race data dict.
    
    This is the entry point for integration with generate_landing_page.py.
    Extracts race_name, race_slug, and race_challenge_tagline from data.
    
    Args:
        data: Race data dictionary with 'race' key
    
    Returns:
        Complete HTML string for the Training Plans section
    """
    race = data['race']
    race_name = race.get('display_name', race.get('name', 'This Race'))
    race_slug = race.get('slug', 'race')
    
    # Get race_challenge_tagline from data, or derive from course character
    race_challenge = race.get('race_challenge_tagline')
    
    if not race_challenge:
        # Fallback: derive from course_description.signature_challenge or character
        course = race.get('course_description', {})
        if course.get('signature_challenge'):
            race_challenge = course['signature_challenge'].lower()
        elif course.get('character'):
            race_challenge = course['character'].lower()
        else:
            # Ultimate fallback
            race_challenge = "unique demands and challenging terrain"
    
    return generate_training_plans_section(
        race_name=race_name,
        race_slug=race_slug,
        race_challenge=race_challenge
    )


# Test
if __name__ == "__main__":
    html = generate_training_plans_section(
        race_name="SBT GRVL",
        race_slug="sbt-grvl",
        race_challenge="altitude demands and 8,000+ feet of climbing at elevation"
    )
    print("Generated HTML length:", len(html))
    print("\nFirst 500 chars:")
    print(html[:500])
    print("\n✓ Module working correctly")
