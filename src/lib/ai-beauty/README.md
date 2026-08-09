# AI Beauty Intelligence Engine™ - Library Components

This directory contains the core AI processing engines for the Beauty Intelligence system.

## Hair Segmentation Engine

The `HairSegmentationEngine` class provides hair region detection and analysis using TensorFlow.js BodyPix model.

### Features

- **Hair Region Segmentation**: Identifies hair pixels in video frames with >85% accuracy target
- **Color Extraction**: Extracts dominant hair color as hex code within 500ms
- **Characteristic Classification**: Determines texture (straight/wavy/curly/coily), length (short/medium/long), and density (thin/medium/thick)
- **Confidence Scoring**: Provides 0-1 confidence score for analysis quality
- **Error Handling**: Graceful handling of edge cases (no hair visible, loading failures)

### Usage Example

```typescript
import { HairSegmentationEngine, ensureTensorFlowReady } from '@/lib/ai-beauty/hair-segmentation';

// Ensure TensorFlow.js is ready
await ensureTensorFlowReady();

// Create engine instance
const engine = new HairSegmentationEngine({
  architecture: 'MobileNetV1',
  outputStride: 16,
  multiplier: 0.75,
  segmentationThreshold: 0.5,
});

// Load model with progress tracking
await engine.loadModel((progress) => {
  console.log(`Loading: ${progress}%`);
});

// Segment hair from video element
const videoElement = document.querySelector('video');
const hairAnalysis = await engine.segmentHair(videoElement);

console.log('Hair Color:', hairAnalysis.color);
console.log('Texture:', hairAnalysis.texture);
console.log('Length:', hairAnalysis.length);
console.log('Density:', hairAnalysis.density);
console.log('Confidence:', hairAnalysis.confidence);

// Clean up when done
engine.dispose();
```

### Configuration Options

- **architecture**: `'MobileNetV1'` | `'ResNet50'` - Model architecture (default: MobileNetV1)
- **outputStride**: `8` | `16` | `32` - Output stride, lower = more accurate but slower (default: 16)
- **multiplier**: `0.50` | `0.75` | `1.0` - Model size multiplier (default: 0.75)
- **segmentationThreshold**: `number` - Segmentation confidence threshold 0-1 (default: 0.5)

### Error Handling

The engine throws specific errors for different failure scenarios:

```typescript
try {
  const hairAnalysis = await engine.segmentHair(videoElement);
} catch (error) {
  if (error.message.includes('No hair visible')) {
    // Prompt user to adjust camera or remove head coverings
    console.error('Please ensure your hair is visible in the frame');
  } else if (error.message.includes('Model not loaded')) {
    // Load model first
    await engine.loadModel();
  } else {
    // Other segmentation errors
    console.error('Hair analysis failed:', error);
  }
}
```

### Performance Targets

- **Model Loading**: <5 seconds (Requirement 1.1)
- **Segmentation Accuracy**: >85% across diverse hair types (Requirement 1.2)
- **Color Extraction**: <500ms (Requirement 1.3)
- **Confidence Score**: Always 0-1 range (Requirement 1.7)

### Integration with AI Beauty Engine

The hair segmentation engine integrates into Phase 4 (Hair Scan) of the main AI Beauty Engine workflow:

1. User completes face scan (Phase 3)
2. Hair scan phase initiates
3. Engine loads BodyPix model with progress indicator
4. Real-time segmentation processes video frames
5. Results displayed: color swatch, texture, length, density
6. Data stored in `HairAnalysisData` format
7. Proceeds to Phase 5 (3D Digital Twin)

## Type Definitions

All TypeScript interfaces are defined in `types.ts`:

- `HairAnalysisData` - Complete hair analysis results
- `FaceAnalysisData` - Facial landmark and feature data
- `DigitalTwinModel` - 3D avatar model data
- `StyleCompatibilityScore` - AI style scoring results
- `SalonMatch` - Salon recommendation data
- `AIBeautyBlueprint` - Complete report data

## Dependencies

- `@tensorflow/tfjs` ^4.22.0 - TensorFlow.js core
- `@tensorflow-models/body-pix` ^2.2.1 - Body segmentation model

## Browser Compatibility

- Chrome 90+
- Safari 14+ (with WebRTC)
- Firefox 88+ (with WebGL 2.0)
- Edge 90+
- Mobile: iOS Safari 14+, Chrome Mobile 90+
