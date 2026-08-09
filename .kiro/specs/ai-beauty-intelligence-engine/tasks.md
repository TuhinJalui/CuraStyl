# Implementation Plan: AI Beauty Intelligence Engine™

## Overview

This implementation plan covers Phases 4-9 of the AI Beauty Intelligence Engine, a full-screen immersive experience that uses advanced computer vision, 3D rendering, AR virtual try-on, and AI-powered beauty compatibility scoring. The system is built with Next.js, TypeScript, React, TensorFlow.js, Three.js, MediaPipe, and OpenAI Vision API.

**What's Already Complete**: Phases 1-3 (Intro, Consultation, Face Scan) are implemented in `src/components/ai-beauty/AIBeautyEngine.tsx`.

**What We're Building**: Hair Scan (Phase 4), 3D Digital Twin (Phase 5), AR Virtual Makeover (Phase 6), Beauty Compatibility Engine (Phase 7), Salon Intelligence System (Phase 8), and AI Transformation Report (Phase 9).

## Tasks

### Phase 4: Hair Analysis & Segmentation

- [x] 1. Set up hair analysis infrastructure
  - Install TensorFlow.js hair segmentation dependencies (`@tensorflow-models/body-pix` or custom model)
  - Create TypeScript interfaces for `HairAnalysisData` matching design document
  - Set up hair analysis state management in the main AI Beauty Engine component
  - _Requirements: 1.1, 1.7_

- [x] 2. Implement hair segmentation engine
  - [x] 2.1 Create `HairSegmentationEngine` class in `src/lib/ai-beauty/hair-segmentation.ts`
    - Implement model loading with progress tracking
    - Add `segmentHair()` method that processes video frames and returns segmentation mask
    - Implement error handling for model loading failures
    - _Requirements: 1.1, 1.2, 7.3_
  
  - [ ]* 2.2 Write property test for hair segmentation accuracy
    - **Property 1: Hair Segmentation Accuracy**
    - **Validates: Requirements 1.2**
    - Test with diverse set of hair types, lighting conditions, and camera angles
    - Verify segmentation accuracy exceeds 85% across test dataset
  
  - [x] 2.3 Implement hair color extraction
    - Create `extractHairColor()` function that analyzes segmented region
    - Extract dominant color using color clustering algorithm
    - Return hex color code with confidence score
    - _Requirements: 1.3_
  
  - [ ]* 2.4 Write property test for color extraction performance
    - **Property 2: Hair Color Extraction Performance**
    - **Validates: Requirements 1.3**
    - Test that color extraction completes within 500ms for various hair region sizes

- [x] 3. Implement hair classification
  - [x] 3.1 Add texture and length classification
    - Implement texture classifier (straight, wavy, curly, coily)
    - Implement length classifier (short, medium, long)
    - Calculate density metric (thin, medium, thick)
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 3.2 Write property test for hair classification correctness
    - **Property 3: Hair Classification Correctness**
    - **Validates: Requirements 1.4, 1.5**
    - Test with known hair images and verify correct texture/length identification
  
  - [ ]* 3.3 Write property test for confidence score validity
    - **Property 4: Confidence Score Validity**
    - **Validates: Requirements 1.7**
    - Verify confidence scores are always between 0 and 1 inclusive

- [x] 4. Integrate hair scan phase into UI
  - Add "hair-scan" phase to AIBeautyEngine component
  - Create UI with real-time segmentation mask overlay
  - Display hair analysis results (color, texture, length, density)
  - Add graceful handling for edge cases (no hair visible, hats, headbands)
  - _Requirements: 1.6_

- [x] 5. Checkpoint - Hair Analysis Complete
  - Ensure all hair analysis tests pass
  - Verify hair scan phase transitions smoothly from face scan
  - Test edge cases (no hair visible, poor lighting)
  - Ask the user if questions arise

### Phase 5: 3D Digital Twin Generation

- [x] 6. Set up 3D rendering infrastructure
  - Install Three.js and React Three Fiber dependencies (`three`, `@react-three/fiber`, `@react-three/drei`)
  - Create TypeScript interfaces for `DigitalTwinModel` and `GaussianSplatData`
  - Set up 3D scene component structure
  - _Requirements: 2.1_

- [x] 7. Implement 3D mesh generation from facial landmarks
  - [x] 7.1 Create `MeshGenerator` class in `src/lib/ai-beauty/mesh-generator.ts`
    - Convert 468 facial landmarks into 3D mesh vertices
    - Implement face topology mapping (connect vertices into triangles)
    - Generate mesh normals for lighting calculations
    - _Requirements: 2.1_
  
  - [ ]* 7.2 Write property test for mesh generation performance
    - **Property 5: Mesh Generation Performance**
    - **Validates: Requirements 2.1**
    - Verify mesh generation completes within 2 seconds for 468 landmarks
  
  - [ ]* 7.3 Write property test for 3D model size constraint
    - **Property 6: 3D Model Size Constraint**
    - **Validates: Requirements 2.5**
    - Verify generated model file size is less than 5 megabytes

- [x] 8. Implement Gaussian Splat rendering
  - [x] 8.1 Create Gaussian Splat shader and renderer
    - Implement custom Three.js shader for Gaussian Splat technique
    - Create `GaussianSplatRenderer` in `src/lib/ai-beauty/gaussian-splat.ts`
    - Apply Gaussian Splat data (positions, colors, scales, rotations) to mesh
    - _Requirements: 2.2_
  
  - [x] 8.2 Implement texture mapping
    - Capture current video frame as base texture
    - Map skin tone and facial features to mesh surface
    - Apply texture to 3D model with UV coordinates
    - _Requirements: 2.3_
  
  - [ ]* 8.3 Write property test for texture mapping completeness
    - **Property 7: Texture Mapping Completeness**
    - **Validates: Requirements 2.3**
    - Verify texture data is applied to mesh surface

- [x] 9. Create interactive 3D avatar component
  - [x] 9.1 Build `DigitalTwinViewer` React component
    - Set up Three.js scene with lighting and camera
    - Render 3D avatar mesh with Gaussian Splat material
    - Implement 360-degree rotation controls (mouse drag, touch)
    - Add animation rig for head rotation capabilities
    - _Requirements: 2.4, 2.6_
  
  - [ ]* 9.2 Write property test for 3D rendering frame rate
    - **Property 31: 3D Rendering Frame Rate**
    - **Validates: Requirements 2.4, 8.4**
    - Verify rendering maintains 60 FPS during avatar rotation

- [x] 10. Integrate 3D twin phase into UI
  - Add "3d-twin" phase to AIBeautyEngine component
  - Display DigitalTwinViewer with generated avatar
  - Add UI controls for rotation and viewing angles
  - Show loading progress during mesh generation
  - _Requirements: 2.7_

- [x] 11. Checkpoint - 3D Digital Twin Complete
  - Ensure all 3D rendering tests pass
  - Verify avatar displays with correct facial features
  - Test rotation performance on various devices
  - Ask the user if questions arise

### Phase 6: AR Virtual Makeover

- [x] 12. Set up AR overlay infrastructure
  - Install MediaPipe Face Mesh dependency (`@mediapipe/face_mesh`)
  - Create hairstyle asset library (minimum 20 PNG overlays with alpha channel)
  - Set up TypeScript interfaces for AR tracking and overlay rendering
  - _Requirements: 3.1, 3.8_

- [x] 13. Implement face tracking engine
  - [x] 13.1 Create `ARFaceTracker` class in `src/lib/ai-beauty/ar-face-tracker.ts`
    - Load MediaPipe Face Mesh model with progress tracking
    - Implement continuous face landmark detection from video stream
    - Calculate face position, rotation, and scale in real-time
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 13.2 Write property test for face tracking latency
    - **Property 8: Face Tracking Latency**
    - **Validates: Requirements 3.3**
    - Verify AR overlay updates occur within 50ms of face movement
  
  - [ ]* 13.3 Write property test for continuous face tracking
    - **Property 37: Continuous Face Tracking**
    - **Validates: Requirements 3.2**
    - Verify landmark updates don't have gaps exceeding 100ms

- [x] 14. Implement AR overlay renderer
  - [x] 14.1 Create `AROverlayRenderer` class in `src/lib/ai-beauty/ar-overlay-renderer.ts`
    - Map hairstyle assets to facial landmarks (coordinate transformation)
    - Implement lighting adjustment to match camera environment
    - Render overlay on canvas with proper scaling and rotation
    - _Requirements: 3.4, 3.5_
  
  - [ ]* 14.2 Write property test for AR rendering performance
    - **Property 9: AR Rendering Performance**
    - **Validates: Requirements 3.6, 8.5**
    - Verify system maintains at least 30 FPS during AR preview

- [x] 15. Implement style switching and library management
  - [x] 15.1 Create hairstyle library manager
    - Load and preload all 20 hairstyle assets
    - Implement style switching with smooth transitions
    - Add style metadata (name, category, popularity)
    - _Requirements: 3.8_
  
  - [ ]* 15.2 Write property test for style switching performance
    - **Property 10: Style Switching Performance**
    - **Validates: Requirements 3.7**
    - Verify switching between styles completes in less than 1 second

- [x] 16. Implement lighting adaptation
  - [x] 16.1 Add environmental lighting detection
    - Analyze video frame brightness and color temperature
    - Adjust AR overlay lighting parameters dynamically
    - _Requirements: 3.9_
  
  - [ ]* 16.2 Write property test for lighting adaptation
    - **Property 11: Lighting Adaptation**
    - **Validates: Requirements 3.9**
    - Verify overlay lighting adjusts when lighting conditions change

- [x] 17. Integrate AR preview phase into UI
  - Add "ar-preview" phase to AIBeautyEngine component
  - Display live camera feed with AR overlay
  - Add style carousel for browsing hairstyle options
  - Implement style selection and favoriting
  - Show performance indicators (FPS counter)
  - _Requirements: 3.10_

- [x] 18. Checkpoint - AR Virtual Makeover Complete
  - Ensure all AR tests pass
  - Verify smooth overlay tracking with head movements
  - Test all 20 hairstyle options render correctly
  - Ask the user if questions arise

### Phase 7: Beauty Compatibility Scoring Engine

- [x] 19. Set up OpenAI Vision API integration
  - Verify OpenAI API client is installed (already in package.json)
  - Create environment variable configuration for API key
  - Set up TypeScript interfaces for `StyleCompatibilityScore`
  - Create API client wrapper with error handling
  - _Requirements: 4.2, 7.7_

- [x] 20. Implement compatibility scoring engine
  - [x] 20.1 Create `CompatibilityScoringEngine` class in `src/lib/ai-beauty/compatibility-scoring.ts`
    - Implement `preparePrompt()` method that packages face and hair analysis data
    - Create structured prompt with facial features, hair characteristics, and style reference
    - _Requirements: 4.1_
  
  - [ ]* 20.2 Write property test for compatibility prompt structure
    - **Property 12: Compatibility Prompt Structure**
    - **Validates: Requirements 4.1**
    - Verify prompts contain all required fields (facial features, hair, style)
  
  - [x] 20.3 Implement OpenAI API scoring request
    - Send analysis data and style images to GPT-4 Vision API
    - Parse API response for compatibility score (0-100) and reasoning
    - Handle rate limiting and timeout errors
    - _Requirements: 4.2, 4.3_
  
  - [ ]* 20.4 Write property test for compatibility score validity
    - **Property 13: Compatibility Score Validity**
    - **Validates: Requirements 4.4**
    - Verify scores are integers between 0-100 with explanatory text

- [x] 21. Implement batch processing and caching
  - [x] 21.1 Add parallel style scoring
    - Process multiple styles in parallel using Promise.all()
    - Limit concurrent requests to avoid rate limiting
    - _Requirements: 4.5_
  
  - [ ]* 21.2 Write property test for parallel processing efficiency
    - **Property 14: Parallel Processing Efficiency**
    - **Validates: Requirements 4.5**
    - Verify parallel processing is faster than sequential
  
  - [x] 21.3 Implement result caching
    - Cache scores by hash of (face + hair + style) input
    - Return cached results for identical inputs
    - _Requirements: 4.6, 4.9_
  
  - [ ]* 21.4 Write property test for scoring idempotence
    - **Property 15: Scoring Idempotence**
    - **Validates: Requirements 4.6, 4.9**
    - Verify identical inputs return same scores via caching

- [x] 22. Implement fallback scoring and retry logic
  - [x] 22.1 Add exponential backoff retry mechanism
    - Retry failed API requests 3 times with delays (1s, 2s, 4s)
    - _Requirements: 4.7, 7.7_
  
  - [ ]* 22.2 Write property test for API retry behavior
    - **Property 16: API Retry Behavior**
    - **Validates: Requirements 4.7, 7.7**
    - Verify system retries exactly 3 times with exponential backoff
  
  - [x] 22.3 Implement rule-based fallback scoring
    - Create fallback algorithm based on face shape, hair type matching
    - Activate fallback after 3 failed API attempts
    - _Requirements: 4.8_

- [x] 23. Integrate compatibility scoring into UI
  - Add "beauty-score" phase to AIBeautyEngine component
  - Display compatibility scores for each hairstyle
  - Show AI reasoning and recommendations
  - Visualize top 5 styles with score bars
  - _Requirements: 4.10_

- [x] 24. Checkpoint - Beauty Compatibility Complete
  - Ensure all compatibility scoring tests pass
  - Verify API integration works with real OpenAI account
  - Test fallback mechanism by simulating API failure
  - Ask the user if questions arise

### Phase 8: Salon Intelligence & Matching System

- [x] 25. Implement salon query and filtering
  - [x] 25.1 Create `SalonIntelligenceEngine` class in `src/lib/ai-beauty/salon-intelligence.ts`
    - Implement location-based salon search (Supabase query)
    - Add configurable search radius (default 25 miles)
    - Filter salons by style specialization tags
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 25.2 Write property test for salon filtering correctness
    - **Property 17: Salon Filtering Correctness**
    - **Validates: Requirements 5.3**
    - Verify filtered results only include salons with matching specialization tags

- [x] 26. Implement salon ranking algorithm
  - [x] 26.1 Create weighted scoring system
    - Calculate expertise match score (how well salon specializations match recommended styles)
    - Normalize rating score (0-100 scale)
    - Calculate distance score (inverse distance, normalized)
    - Apply weighted formula: 0.5 × expertise + 0.3 × rating + 0.2 × distance
    - _Requirements: 5.4_
  
  - [ ]* 26.2 Write property test for salon ranking formula
    - **Property 18: Salon Ranking Formula**
    - **Validates: Requirements 5.4**
    - Verify ranking follows specified weighted formula
  
  - [ ]* 26.3 Write property test for salon result minimum
    - **Property 19: Salon Result Minimum**
    - **Validates: Requirements 5.5**
    - Verify system returns min(3, N) salons where N is available

- [x] 27. Implement salon data enrichment
  - [x] 27.1 Add salon details retrieval
    - Fetch pricing information from salon records
    - Retrieve availability and booking slots
    - Load portfolio images
    - Include rating and review count
    - _Requirements: 5.6_
  
  - [ ]* 27.2 Write property test for salon data completeness
    - **Property 20: Salon Data Completeness**
    - **Validates: Requirements 5.6**
    - Verify all salons include required fields (pricing, availability, portfolio, rating)

- [x] 28. Implement advanced filtering and search expansion
  - [x] 28.1 Add user-facing filters
    - Implement price range filter
    - Implement minimum rating filter
    - _Requirements: 5.9_
  
  - [ ]* 28.2 Write property test for salon filtering by criteria
    - **Property 21: Salon Filtering by Criteria**
    - **Validates: Requirements 5.9**
    - Verify filters return only matching salons
  
  - [x] 28.3 Add automatic search radius expansion
    - Detect when no salons found in initial radius
    - Automatically expand to 50 miles, then 100 miles
    - Suggest online consultation if still no results
    - _Requirements: 5.7, 5.8_

- [x] 29. Integrate salon matching into UI
  - Add "salon-match" phase to AIBeautyEngine component
  - Display ranked salon cards with match scores
  - Show salon details (pricing, distance, rating, portfolio)
  - Add filtering controls (price, rating)
  - Implement "View on Map" and "Book Now" buttons
  - _Requirements: 5.10_

- [x] 30. Checkpoint - Salon Intelligence Complete
  - Ensure all salon matching tests pass
  - Verify salon ranking algorithm produces expected results
  - Test search radius expansion with limited data
  - Ask the user if questions arise

### Phase 9: AI Transformation Report Generation

- [x] 31. Set up PDF generation infrastructure
  - Install PDF generation dependencies (`jspdf`, `html2canvas`)
  - Create TypeScript interfaces for `AIBeautyBlueprint`
  - Set up PDF template structure and styling
  - _Requirements: 6.2_

- [x] 32. Implement report data aggregation
  - [x] 32.1 Create `ReportGenerator` class in `src/lib/ai-beauty/report-generator.ts`
    - Aggregate face analysis, hair analysis, style scores, and salon matches
    - Validate all required data is present
    - _Requirements: 6.1_
  
  - [ ]* 32.2 Write property test for report data aggregation
    - **Property 22: Report Data Aggregation**
    - **Validates: Requirements 6.1**
    - Verify report includes all four data components

- [x] 33. Implement PDF template rendering
  - [x] 33.1 Create PDF document structure
    - Add branded header with logo and user name
    - Create sections: face analysis, hair analysis, styles, salons
    - Add generation date and personalization
    - _Requirements: 6.2, 6.5_
  
  - [ ]* 33.2 Write property test for report personalization
    - **Property 25: Report Personalization**
    - **Validates: Requirements 6.5**
    - Verify PDF includes user name, date, and branding

- [x] 34. Implement image embedding and visualization
  - [x] 34.1 Add before/after AR preview images
    - Capture AR preview screenshots using html2canvas
    - Embed images at minimum 800px width
    - _Requirements: 6.3_
  
  - [ ]* 34.2 Write property test for report image size
    - **Property 23: Report Image Size**
    - **Validates: Requirements 6.3**
    - Verify images are minimum 800px width
  
  - [x] 34.3 Create compatibility score visualizations
    - Generate bar charts for style compatibility scores
    - Create style comparison grids
    - _Requirements: 6.4_
  
  - [ ]* 34.4 Write property test for report visualization presence
    - **Property 24: Report Visualization Presence**
    - **Validates: Requirements 6.4**
    - Verify PDF contains charts and comparison visualizations

- [x] 35. Implement PDF generation and optimization
  - [x] 35.1 Generate and optimize PDF
    - Compile all sections into final PDF document
    - Compress images to reduce file size
    - Optimize PDF to stay under 3MB
    - _Requirements: 6.7_
  
  - [ ]* 35.2 Write property test for PDF generation performance
    - **Property 26: PDF Generation Performance**
    - **Validates: Requirements 6.6, 8.7**
    - Verify generation completes within 5 seconds
  
  - [ ]* 35.3 Write property test for PDF file size optimization
    - **Property 27: PDF File Size Optimization**
    - **Validates: Requirements 6.7**
    - Verify file size is less than 3 megabytes

- [x] 36. Implement export and sharing options
  - [x] 36.1 Add download and share functionality
    - Implement PDF download with proper filename
    - Add email share option with attachment
    - Store PDF URL in user session for later access
    - _Requirements: 6.8_
  
  - [ ]* 36.2 Write property test for report completeness
    - **Property 28: Report Completeness**
    - **Validates: Requirements 6.9**
    - Verify PDF contains all required sections

- [x] 37. Integrate report generation into UI
  - Add "report" phase to AIBeautyEngine component
  - Display report preview with download button
  - Add email share form
  - Show report generation progress
  - Add option to save report to user account
  - _Requirements: 6.10_

- [x] 38. Checkpoint - Report Generation Complete
  - Ensure all report generation tests pass
  - Verify PDF downloads correctly with all content
  - Test email sharing functionality
  - Ask the user if questions arise

### Cross-Cutting Concerns: Error Handling & Resilience

- [ ] 39. Implement comprehensive error handling
  - [ ] 39.1 Add camera permission error handling
    - Display clear instructions for enabling camera
    - Provide photo upload alternative
    - _Requirements: 7.1, 7.2_
  
  - [ ] 39.2 Add model loading error handling
    - Show loading progress bar with retry option
    - Degrade to manual feature selection after 3 failures
    - _Requirements: 7.3, 7.4_
  
  - [ ] 39.3 Add lighting quality detection
    - Implement real-time lighting quality indicator
    - Prompt user to adjust lighting when below threshold
    - _Requirements: 7.5, 7.6_
  
  - [ ]* 39.4 Write property test for lighting quality detection
    - **Property 29: Lighting Quality Detection**
    - **Validates: Requirements 7.5**
    - Verify quality indicator produces measurable scores

### Cross-Cutting Concerns: Performance Optimization

- [ ] 40. Implement performance optimizations
  - [ ] 40.1 Optimize page load and bundle size
    - Implement code splitting for ML models (lazy load)
    - Optimize images and assets
    - Ensure page loads within 3 seconds on 4G
    - Reduce JavaScript bundle to <2MB gzipped
    - _Requirements: 8.1, 8.9_
  
  - [ ] 40.2 Optimize ML model loading
    - Preload models in background during consultation phase
    - Show loading progress indicators
    - _Requirements: 8.2_
  
  - [ ]* 40.3 Write property test for face analysis frame rate
    - **Property 30: Face Analysis Frame Rate**
    - **Validates: Requirements 8.3**
    - Verify landmark detection maintains 30 FPS minimum
  
  - [ ]* 40.4 Write property test for memory usage constraint
    - **Property 32: Memory Usage Constraint**
    - **Validates: Requirements 8.8**
    - Verify browser memory stays below 500MB during session

### Cross-Cutting Concerns: Privacy & Security

- [ ] 41. Implement privacy and security measures
  - [ ] 41.1 Ensure client-side video processing
    - Verify all video processing happens in browser
    - Add network monitoring to confirm no video uploads
    - _Requirements: 9.1_
  
  - [ ]* 41.2 Write property test for video processing client-side only
    - **Property 33: Video Processing Client-Side Only**
    - **Validates: Requirements 9.1**
    - Monitor network and verify zero video data uploads
  
  - [ ] 41.3 Implement biometric data encryption
    - Encrypt facial landmark data before storage
    - _Requirements: 9.2_
  
  - [ ]* 41.4 Write property test for biometric data encryption
    - **Property 34: Biometric Data Encryption**
    - **Validates: Requirements 9.2**
    - Verify stored data is encrypted
  
  - [ ] 41.5 Add user consent and data controls
    - Require explicit opt-in for data storage
    - Implement 30-day auto-deletion for non-saved data
    - _Requirements: 9.3, 9.4_
  
  - [ ] 41.6 Implement API data anonymization
    - Strip PII from OpenAI API payloads
    - _Requirements: 9.5_
  
  - [ ]* 41.7 Write property test for data anonymization
    - **Property 35: Data Anonymization for API**
    - **Validates: Requirements 9.5**
    - Verify no PII in API payloads
  
  - [ ] 41.8 Add GDPR compliance features
    - Implement full data export capability
    - Add data deletion within 24 hours
    - _Requirements: 9.6, 9.7_
  
  - [ ]* 41.9 Write property test for data export completeness
    - **Property 36: Data Export Completeness**
    - **Validates: Requirements 9.6**
    - Verify export includes all user data

### Cross-Cutting Concerns: Browser Compatibility

- [ ] 42. Implement browser compatibility checks
  - Add browser detection on engine launch
  - Display upgrade notification for unsupported browsers
  - Test all features on Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
  - Test mobile support on iOS Safari 14+ and Chrome Mobile 90+
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

### Final Integration & Testing

- [ ] 43. Final integration and polish
  - Wire all phases together with smooth transitions
  - Add phase navigation (back/forward buttons)
  - Implement progress persistence (save state on page refresh)
  - Add analytics tracking for each phase completion
  - Polish animations and transitions between phases
  - Test complete end-to-end flow from intro to report

- [ ] 44. Final checkpoint - Complete AI Beauty Engine
  - Run full test suite across all phases
  - Test complete user journey from start to finish
  - Verify all performance requirements are met
  - Confirm all privacy measures are in place
  - Test on multiple browsers and devices
  - Ask the user if questions arise before considering the feature complete

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements from requirements.md for traceability
- Property tests validate universal correctness properties from design.md
- Checkpoints ensure incremental validation after major milestones
- The existing component in `src/components/ai-beauty/AIBeautyEngine.tsx` has Phases 1-3 complete
- All new code should use TypeScript with strict type checking
- ML models should be lazy-loaded to optimize initial page load
- All video processing must remain client-side for privacy
- OpenAI API calls should include retry logic and fallback mechanisms
