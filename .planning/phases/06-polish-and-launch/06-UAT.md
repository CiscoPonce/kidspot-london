# Phase 6: User Acceptance Testing (UAT)

## Overview
This document tracks the results of manual user acceptance testing to ensure the platform is ready for soft launch.

## Test Environment
- **URL**: `http://localhost:3000` (Local production build)
- **Devices**: Desktop (Chrome/Firefox), Mobile (Browser simulator or device)

## Test Cases

| ID | Description | Expected Result | Status | Notes |
|----|-------------|-----------------|--------|-------|
| UAT-01 | Search by postcode (e.g., SE1 1AA) | Shows venues in Southwark area on map and list. | PASSED | |
| UAT-02 | Use "My Location" button | Prompts for location and searches near current coords. | PASSED | |
| UAT-03 | Adjust radius slider (1 to 10 miles) | Search results update dynamically. | PASSED | |
| UAT-04 | Click Map Cluster | Map zooms in to reveal individual pins. | PASSED | |
| UAT-05 | Click Venue Pin/Card | Opens detail modal with full info. | PASSED | |
| UAT-06 | Navigate to Standalone Page | Clicking "Info" or sharing link opens `/venue/[slug]`. | PASSED | |
| UAT-07 | Sharing | Clicking share copies link to clipboard and shows toast. | PASSED | |
| UAT-08 | Borough Landing Page | Navigating to `/venues-in/islington` shows Islington venues. | PASSED | |
| UAT-09 | Category Landing Page | Navigating to `/venues-by/softplay` shows soft play venues. | PASSED | |
| UAT-10 | Mobile Responsiveness | UI elements are usable on 375px wide screen. | PASSED | |

## Logged Issues

| ID | Description | Severity | Status | Resolution |
|----|-------------|----------|--------|------------|
| - | No critical issues found | - | - | - |

## Verification Sign-off
- **Functional Stability**: [x]
- **SEO/Metadata Verification**: [x]
- **Analytics Event Verification**: [x]
- **Performance Thresholds (< 2s LCP)**: [x]
