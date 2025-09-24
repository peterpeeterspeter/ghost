# Amazon-Ready Structured Prompt Schema

## Overview
Enhanced structured prompt schema specifically designed for Amazon marketplace compliance, inspired by clockmaker test results showing **70% success with structured JSON vs 0% with narrative prompts**.

## Total Fields: **32 Amazon-Compliant Fields**

### 1. **Scene** (4 fields)
- `type`: "professional_ecommerce_photography" 
- `effect`: "ghost_mannequin"
- `background`: **"pure_white" | "light_grey"** *(Amazon allows both)*
- `lighting`: **"soft_even_shadowless" | "soft_professional_studio"** *(Amazon prohibits harsh shadows)*

### 2. **Garment** (4 fields) - **Enhanced**
- `category`: string
- `view_angle`: **"front_centered" | "back_centered" | "three_quarter_left" | "three_quarter_right" | "detail_shot" | "flat_lay" | "interior_neckline_shot"** *(Multiple angles for Amazon)*
- `form`: "invisible_human_silhouette"
- `detail_shot_focus`: string (optional) *(Focus context for detail shots)*

### 3. **Colors** (4 fields) - **Unchanged**
- `dominant_hex`: string
- `accent_hex`: string (optional)
- `color_temperature`: "warm" | "cool" | "neutral"
- `saturation`: "muted" | "moderate" | "vibrant"

### 4. **Fabric** (5 fields) - **Unchanged**
- `material`: string
- `drape_quality`: "crisp" | "flowing" | "structured" | "fluid" | "stiff"
- `surface_sheen`: "matte" | "subtle_sheen" | "glossy" | "metallic"
- `transparency`: "opaque" | "semi_opaque" | "translucent" | "sheer"
- `drape_stiffness`: number (0-1 scale)

### 5. **Construction** (4 fields) - **Unchanged**
- `silhouette`: string
- `required_visible_elements`: string[]
- `seam_visibility`: "hidden" | "subtle" | "visible" | "decorative"
- `edge_finishing`: "raw" | "serged" | "bound" | "rolled" | "pinked"

### 6. **Styling** (2 fields) - **New Amazon Category**
- `garment_fit`: **"perfectly_fitted_no_bunching" | "tailored" | "relaxed"** *(Amazon fit requirements)*
- `sleeve_drape`: **"natural_at_sides" | "slightly_forward"** *(Amazon sleeve positioning)*

### 7. **Quality Requirements** (4 fields) - **Amazon Enhanced**
- `detail_sharpness`: **"natural" | "sharp" | "ultra_sharp"** *(Removed "soft" - Amazon needs sharp)*
- `texture_emphasis`: **"subtle" | "enhance" | "maximize"** *(Removed "minimize")*
- `color_fidelity`: **"high" | "critical"** *(Removed "low" & "medium" - Amazon needs accuracy)*
- `market_tier`: "budget" | "mid_range" | "premium" | "luxury"

### 8. **Technical Specs** (7 fields) - **Amazon Compliance**
- `resolution`: **"high_detail_4k"** *(Amazon prefers high resolution)*
- `perspective`: **"straight_frontal_orthographic"** *(Reduces distortion)*
- `dimensional_form`: true
- `no_visible_mannequin`: true
- `frame_fill_percentage`: **85** *(Amazon's 85% frame fill requirement)*
- `negative_constraints`: **["props", "human_models", "branding", "watermarks", "text"]** *(Amazon prohibitions)*
- `commercial_license_required`: **true** *(Renamed from commercial_ready)*

## Key Amazon Compliance Features

### **Structured Requirements** (Like Clockmaker Test)
```json
{
  "amazon_technical_standards": {
    "background": "pure_white (#FFFFFF)",
    "lighting": "soft_even_shadowless",
    "frame_fill": "85% minimum",
    "resolution": "high_detail_4k"
  },
  "prohibited_elements": ["props", "human_models", "branding", "watermarks", "text"]
}
```

### **Machine-Readable Guidelines**
- **85% frame fill**: Numerical requirement instead of vague "fills frame"
- **Shadowless lighting**: Explicit constraint vs "good lighting"
- **Exact hex colors**: #F0EAD6 instead of "cream colored"
- **Fit specifications**: "perfectly_fitted_no_bunching" vs "fits well"
- **View angle options**: 7 specific angles for consistent multi-shot requirements

## Implementation Benefits

1. **Higher Success Rate**: Following clockmaker pattern of structured vs narrative
2. **Amazon Compliance**: Direct translation of marketplace guidelines to fields
3. **Consistency**: Machine-readable requirements ensure consistent outputs
4. **Scalability**: Easy to add new Amazon requirements as fields
5. **Quality Control**: Specific constraints prevent common rejection reasons

## Usage
```json
{
  "options": {
    "useStructuredPrompt": true
  }
}
```

This triggers the Amazon-ready structured prompt generation instead of narrative approaches, ensuring marketplace compliance through discrete, parseable components.