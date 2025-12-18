#!/usr/bin/env python3
"""
Regression tests for training_plans_section.py module (on-demand model).

Run: python3 test_training_plans_section.py
"""

import sys
from training_plans_section import (
    generate_training_plans_section,
    generate_training_plans_html,
    get_training_plans_css
)


# Sample test data
SAMPLE_DATA = {
    "race": {
        "name": "SBT GRVL",
        "display_name": "SBT GRVL",
        "slug": "sbt-grvl",
        "race_challenge_tagline": "altitude demands and 8,000+ feet of climbing at elevation",
        "course_description": {
            "signature_challenge": "The altitude. Everything else is manageable.",
            "character": "Fast champagne gravel at altitude"
        }
    }
}


def test_generates_valid_html():
    """Test that function returns valid HTML string."""
    html = generate_training_plans_section(
        race_name="SBT GRVL",
        race_slug="sbt-grvl",
        race_challenge="altitude demands"
    )
    assert isinstance(html, str), "Should return string"
    assert len(html) > 1000, "Should return substantial HTML"
    print("✓ Generates valid HTML")


def test_contains_section_structure():
    """Test that HTML contains required section structure."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "altitude demands")
    assert 'id="training"' in html, "Missing section ID"
    assert 'gg-training-section' in html, "Missing section class"
    print("✓ Contains section structure")


def test_contains_header_elements():
    """Test that HTML contains header elements."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "altitude demands")
    assert 'Training Plans' in html, "Missing Training Plans badge"
    assert 'Your Plan. Built for You.' in html, "Missing title"
    assert 'SBT GRVL' in html, "Missing race name"
    print("✓ Contains header elements")


def test_race_challenge_in_subtitle():
    """Test that race challenge appears in subtitle."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "altitude demands and climbing")
    assert 'altitude demands and climbing' in html, "Missing race challenge in subtitle"
    print("✓ Race challenge in subtitle")


def test_questionnaire_url_correct():
    """Test that questionnaire URL is correctly formed."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    expected_url = "https://wattgod.github.io/training-plans-component/training-plan-questionnaire.html?race=sbt-grvl"
    assert expected_url in html, "Missing or incorrect questionnaire URL"
    print("✓ Questionnaire URL correct")


def test_cta_button_present():
    """Test that CTA button is present."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert 'Build My Training Plan' in html, "Missing CTA button text"
    assert 'gg-training-cta-button' in html, "Missing CTA button class"
    print("✓ CTA button present")


def test_price_displayed():
    """Test that $199 price is displayed."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert '$199' in html, "Missing $199 price"
    assert 'one-time' in html, "Missing 'one-time' text"
    print("✓ Price displayed correctly")


def test_same_day_delivery():
    """Test that same-day delivery is mentioned."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert 'same day' in html.lower(), "Missing same-day delivery mention"
    print("✓ Same-day delivery mentioned")


def test_three_step_process():
    """Test that 3-step process is rendered."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert 'Fill Out the Questionnaire' in html, "Missing step 1"
    assert 'I Build Your Plan' in html, "Missing step 2"
    assert 'Train With Confidence' in html, "Missing step 3"
    assert 'gg-training-process-step' in html, "Missing process step class"
    print("✓ Three-step process rendered")


def test_includes_checklist():
    """Test that includes checklist is present."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert 'Custom structured workouts' in html, "Missing workouts include"
    assert 'ZWO files for all platforms' in html, "Missing ZWO include"
    assert 'Personalized race guide' in html, "Missing guide include"
    print("✓ Includes checklist present")


def test_device_list():
    """Test that device compatibility list is present."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert 'Garmin' in html, "Missing Garmin"
    assert 'Wahoo' in html, "Missing Wahoo"
    assert 'TrainingPeaks' in html, "Missing TrainingPeaks"
    print("✓ Device list present")


def test_css_included():
    """Test that CSS is included inline."""
    html = generate_training_plans_section("SBT GRVL", "sbt-grvl", "test")
    assert '<style>' in html, "Missing style tag"
    assert '.gg-training-section' in html, "Missing section CSS"
    assert '.gg-training-cta-button' in html, "Missing button CSS"
    print("✓ CSS included inline")


def test_generate_from_data_dict():
    """Test generating from full data dictionary."""
    html = generate_training_plans_html(SAMPLE_DATA)
    assert 'SBT GRVL' in html, "Missing race name"
    assert 'sbt-grvl' in html, "Missing race slug in URL"
    assert 'altitude demands' in html, "Missing race challenge"
    print("✓ Generate from data dict works")


def test_fallback_without_tagline():
    """Test fallback when race_challenge_tagline is missing."""
    data_without_tagline = {
        "race": {
            "name": "Test Race",
            "display_name": "Test Race",
            "slug": "test-race",
            "course_description": {
                "signature_challenge": "The heat is brutal."
            }
        }
    }
    html = generate_training_plans_html(data_without_tagline)
    assert 'the heat is brutal' in html.lower(), "Should fallback to signature_challenge"
    print("✓ Fallback without tagline works")


def run_all_tests():
    """Run all tests and report results."""
    tests = [
        test_generates_valid_html,
        test_contains_section_structure,
        test_contains_header_elements,
        test_race_challenge_in_subtitle,
        test_questionnaire_url_correct,
        test_cta_button_present,
        test_price_displayed,
        test_same_day_delivery,
        test_three_step_process,
        test_includes_checklist,
        test_device_list,
        test_css_included,
        test_generate_from_data_dict,
        test_fallback_without_tagline,
    ]
    
    passed = 0
    failed = 0
    
    print("\n" + "=" * 50)
    print("TRAINING PLANS SECTION TESTS (On-Demand Model)")
    print("=" * 50 + "\n")
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__}: Unexpected error - {e}")
            failed += 1
    
    print("\n" + "=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 50)
    
    if failed == 0:
        print("\n✅ ALL TESTS PASSED")
        print("\nOn-demand model verified:")
        print("  ✅ Single CTA → questionnaire")
        print("  ✅ $199 one-time price")
        print("  ✅ Same-day delivery")
        print("  ✅ Race-specific challenge tagline")
    else:
        print(f"\n❌ {failed} TEST(S) FAILED")
        sys.exit(1)


if __name__ == '__main__':
    run_all_tests()
