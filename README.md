# Highlight Scaled Images UserScript

A useful tool for frontend developers to detect bad image quality issues on HTML pages. The script scans all images and highlights problematic images: adds a tint and overlay text to images scaled by the browser (upscaled, downscaled).

- [Test page »»»](https://murznn.github.io/highlight-scaled-images-userscript/)

## Features

### Visual Indicators
- **Blue tint and overlay** for downsized images (rendered smaller than their natural size)
- **Green tint and overlay** for proportional downsized images (exactly 2x or 4x smaller)
- **Red tint and overlay** for upsized images (rendered larger than their natural size)

### Detailed Information
- **Scale percentage** with 2 decimal precision when needed
- **Original image dimensions** (natural width × height)
- **Rendered dimensions** (displayed width × height)
- **Scale factor** for proportional images (2x, 4x)

### Smart Detection
- **Real-time monitoring** - automatically detects images loaded via AJAX or lazy loading
- **Responsive updates** - overlays update when window is resized
- **Dynamic content support** - works with single-page applications and dynamic content

### Example Overlay Text
- `Downsized 75.50% [800x600 → 604x453]`
- `Downsized 2x (50%) [400x300 → 200x150]`
- `Upsized 150.25% [200x150 → 300x225]`

## Installation

Install the script with a userscript manager (Tampermonkey or Greasemonkey) — the steps are the same across browsers:

1. Install Tampermonkey (Chrome, Firefox, Edge) or Greasemonkey (Firefox).
2. Using the script search, find this script by the name "Highlight Scaled Images", or install using [this direct link](https://github.com/MurzNN/highlight-scaled-images-userscript/raw/refs/heads/main/highlight-scaled-images.user.js).



## Usage

- Open any page with images — the script scans and highlights scaled images automatically.
- Overlays show: scale % (2 decimals), natural size, rendered size, and proportional hints (2x/4x).

Customization
- Use your userscript manager menu to toggle highlights (Downscale/Proportional) — changes persist.

Quick guide
- Blue: downsized images (consider smaller files or responsive breakpoints).
- Green: exact proportional downsizing (2x/4x).
- Red: upsized images (risk of blurriness).

## Use Cases

### Frontend Development
- **Performance optimization**: Identify oversized images that slow down page load
- **Responsive design**: Ensure images scale properly across different screen sizes
- **Quality assurance**: Detect blurry or pixelated images before deployment

### Content Management
- **Image audit**: Review existing content for image quality issues
- **SEO optimization**: Ensure images are properly sized for better Core Web Vitals scores
- **Accessibility**: Verify images display correctly across different devices


## Screenhot of the demo page

![Screenshot of the Highlight Scaled Images UserScript demo](https://github.com/MurzNN/highlight-scaled-images-userscript/raw/refs/heads/main/screenshot.png)
