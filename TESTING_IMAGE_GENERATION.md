# 🧪 Testing Guide: AI Image Generation

## Quick Test Scenarios

### 1. Gender Detection Test

**Test A: Male Image Upload**
```
1. Upload a photo of a man's face
2. Type: "show me different hairstyles"
3. Expected: 
   - 15 men's hairstyle images
   - Titles like "Classic Taper Fade", "Modern Undercut"
   - Virtual Try-On link goes to /virtual-tryon/men
```

**Test B: Female Image Upload**
```
1. Upload a photo of a woman's face
2. Type: "recommend hairstyles for me"
3. Expected:
   - 8 women's hairstyle images
   - Titles like "Layered Waves", "Sleek Bob"
   - Virtual Try-On link goes to /virtual-tryon/women
```

**Test C: Text-Based Gender Detection**
```
1. Don't upload image
2. Type: "show men's hairstyles"
3. Expected:
   - 10 men's hairstyle images
   - Men-specific titles
```

---

### 2. Query Type Tests

**Test A: Variety Query**
```
Query: "show me different types of hairstyles for men"
Expected: 15 images with varied men's styles
```

**Test B: Specific Recommendation**
```
Query: "best hairstyles for me"
Expected: 8 images with top recommendations
```

**Test C: Specific Count**
```
Query: "show me 5 hairstyles"
Expected: 5 images
```

**Test D: Hair Characteristic**
```
Query: "curly hairstyles for women"
Expected: 8-10 images of curly hairstyles, women-specific
```

---

### 3. Image Title Tests

**Check Console Logs**:
```javascript
// You should see:
[Image Titles] Generated 10 mens hairstyle titles
[Proactive Images] Sample titles: ["Classic Taper Fade", "Textured Crop Style", ...]
```

**Visual Check**:
- Each image should show a unique title
- Titles should be professional (not "Image 1", "Image 2")
- Titles should match gender (men → fade/undercut, women → bob/layers)

---

### 4. DuckDuckGo Integration Test

**Check Console Logs**:
```javascript
// Success path:
[DuckDuckGo] Extracted vqd token: 4-123456789
[DuckDuckGo] Fetched via API: 8 images

// Fallback path:
[DuckDuckGo] Could not extract vqd token, trying direct HTML extraction...
[DuckDuckGo] Extracted via scraping: 5 images
```

**Visual Check**:
- Images should load successfully
- No broken image icons
- Images should be relevant to query

---

### 5. Makeup Query Tests

**Test A: General Makeup**
```
Query: "show makeup looks"
Expected: 8 images with titles like "Bold Eye Makeup Look", "Smokey Eye Tutorial"
```

**Test B: Specific Type**
```
Query: "bridal makeup looks"
Expected: 8-12 images of bridal makeup
```

**Test C: Variety**
```
Query: "different types of makeup styles"
Expected: 12 images with variety
```

---

### 6. Face Shape Test

```
Query: "hairstyles for round face"
Expected: 
- Keywords include "round face slimming"
- Images show styles that flatter round faces
- Titles remain gender-appropriate
```

---

### 7. Hair Type Test

```
Query: "hairstyles for thick hair"
Expected:
- Keywords include "thick hair voluminous"
- Images show volume-focused styles
```

---

### 8. Image Count Variety Test

**Run 5 different queries and check counts**:
```
Query 1: "different hairstyles" → Should get ~15 images
Query 2: "best hairstyles" → Should get ~8 images
Query 3: "show me hairstyles" → Should get ~10 images
Query 4: "makeup tutorial" → Should get ~6 images
Query 5: "makeup looks" → Should get ~12 images
```

---

## Console Debugging

### Open Browser Console (F12) and check for:

**1. Gender Detection**:
```
[Gender Detection] Detected from image: male
OR
[Keyword Extraction] Using detected gender: female
```

**2. Intent & Keywords**:
```
[Intent Detection] type: hairstyle, confidence: 0.85
[Proactive Images] Fetching 10 images for keywords: "men fade haircut professional mens"
```

**3. Image Fetching**:
```
[Proactive Images] Received 10 raw images from search
[Proactive Images] Generated 10 titles
[Proactive Images] SUCCESS: Prepared 10 images with titles
```

**4. Image Sources**:
```
[Image Sources] Final result: {
  query: "men hairstyles",
  requested: 10,
  fetched: 10,
  sources: {
    googleCSE: 4,
    bing: 2,
    duckDuckGo: 3,
    pexels: 1,
    directSearch: 0,
    unsplash: 0
  }
}
```

---

## Expected Behavior Summary

### ✅ What Should Work:

1. **Gender Auto-Detection**: 
   - Face image → Analyzes gender → Shows appropriate styles
   - Text keywords → Detects "men"/"women" → Shows appropriate styles

2. **Dynamic Image Counts**:
   - "different/types" → 12-15 images
   - "best/recommend" → 8 images
   - Default → 10 images

3. **Professional Titles**:
   - Men: "Classic Taper Fade", "Textured Crop", etc.
   - Women: "Layered Waves", "Sleek Bob", etc.
   - Makeup: "Smokey Eye", "Bold Eye Makeup", etc.

4. **Relevant Images**:
   - DuckDuckGo works with enhanced extraction
   - Multiple sources provide variety
   - All images relevant to query

5. **Unique Every Time**:
   - Titles shuffled on each request
   - Image order varies
   - Never looks identical

---

## ❌ What Should NOT Happen:

1. **Generic Titles**: Should never see "Image 1", "Image 2", "Beauty Style 1"
2. **Fixed Count**: Should never always get same number (e.g., always 6)
3. **Gender Mismatch**: Male face should never get women's bob cuts
4. **No Images**: Should always get at least some images (Unsplash fallback)
5. **Same Results**: Running same query twice should show different title order

---

## Quick Verification Checklist

- [ ] Gender detection works from uploaded images
- [ ] Gender detection works from text ("men's hairstyles")
- [ ] Image counts vary based on query type
- [ ] Titles are professional and unique
- [ ] Titles match detected gender
- [ ] DuckDuckGo successfully fetches images
- [ ] Console shows detailed logging
- [ ] Images display correctly in carousel
- [ ] Virtual Try-On CTA shows correct URL
- [ ] No broken images
- [ ] Titles shuffle on repeated queries

---

## Troubleshooting

### Issue: No images showing
**Check**:
```javascript
// Console should show:
[Proactive Images] SUCCESS: Prepared X images
[Image Sources] Final result: { fetched: X }

// If you see errors, check:
[DuckDuckGo Error] ...
[Google CSE] Failed with status: ...
```

### Issue: All images have generic titles
**Check**:
```javascript
// Should see:
[Image Titles] Generated 10 mens hairstyle titles

// If not, check gender detection:
[Gender Detection] Detected from image: ...
```

### Issue: Wrong gender results
**Check**:
```javascript
// Face analysis should show:
[Gender Detection] Detected from image: male/female

// Keyword extraction should show:
[Keyword Extraction] Using detected gender: male/female
```

### Issue: Always same number of images
**Check**:
```javascript
// Should vary:
[Response Plan] { imageCount: 15 }  // for "different" queries
[Response Plan] { imageCount: 8 }   // for "best" queries
[Response Plan] { imageCount: 10 }  // for default
```

---

## Success Criteria

### The AI chat will feel like image generation when:

1. ✅ Customer uploads face → AI knows their gender without asking
2. ✅ Each image has unique, professional title
3. ✅ Image count varies naturally (not always same)
4. ✅ Results are highly relevant to query
5. ✅ Titles are shuffled each time
6. ✅ Gender-appropriate styles shown
7. ✅ Fast loading (parallel fetching)
8. ✅ Always shows images (fallback sources)

---

## Performance Expectations

- **Image Fetch Time**: 1-3 seconds (parallel fetching)
- **Image Count**: 5-15 based on query
- **Title Variety**: 25 men's, 25 women's, 20 makeup
- **Source Success**: 4-6 sources should contribute
- **Relevance**: 90%+ images should match query

---

## Test Commands for Terminal

```bash
# Run the app
npm run dev

# Check for TypeScript errors
npm run build

# View logs in real-time
# Open browser console (F12) → Console tab
```

---

## Final Verification

Run this sequence:
```
1. Upload male face → "different hairstyles" → Check for 15 men's styles
2. Upload female face → "best hairstyles" → Check for 8 women's styles
3. No upload → "men's fade haircut" → Check for men's results
4. No upload → "curly hairstyles" → Check for 10 curly styles
5. Reload and repeat #1 → Check titles are shuffled
```

If all 5 pass, the system is working perfectly! 🎉
