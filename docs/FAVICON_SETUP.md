# Favicon Setup Guide

## Current Status
✅ SVG favicon files created with your cocktail glass logo  
✅ Metadata configured in both web and admin apps  
✅ Web app manifest created  

## To Complete the Setup

### 1. Generate ICO and PNG Files

You need to convert your logo to actual favicon files. Use one of these tools:

**Option A: favicon.io (Recommended)**
1. Go to https://favicon.io/favicon-converter/
2. Upload a high-resolution PNG of your logo (at least 512x512px)
3. Download the generated favicon package

**Option B: RealFaviconGenerator**
1. Go to https://realfavicongenerator.net/
2. Upload your logo image
3. Customize settings for different platforms
4. Download the generated files

### 2. Replace Placeholder Files

**For Web App** (`apps/web/app/`):
- Replace `favicon.ico` with the generated ICO file
- Replace `apple-icon.png` with the 180x180px PNG file

**For Admin App** (`apps/admin/app/`):
- Replace `favicon.ico` with the generated ICO file  
- Replace `apple-icon.png` with the 180x180px PNG file (add red crown badge for admin)

### 3. File Specifications

| File | Size | Purpose |
|------|------|---------|
| `favicon.ico` | 16x16, 32x32 | Browser tab icon |
| `icon.svg` | Vector | Modern browsers, dark mode support |
| `apple-icon.png` | 180x180 | iOS home screen, bookmarks |

### 4. Admin App Distinction

The admin app favicon includes a small red crown badge to visually distinguish it from the main app when both are open in browser tabs.

## What's Already Configured

### Web App Features:
- PWA manifest for "Add to Home Screen"
- Apple Web App capability
- Multiple icon sizes and formats
- Theme color matching your brand

### Admin App Features:
- Distinct admin branding
- Apple Web App support
- Same technical capabilities as web app

## Testing

After replacing the placeholder files:

1. **Browser Tab**: Check if the icon appears in browser tabs
2. **Bookmarks**: Verify the icon shows in bookmarks
3. **iOS Safari**: Test "Add to Home Screen" functionality
4. **Dark Mode**: Ensure SVG icons adapt properly

## Troubleshooting

- **Not showing**: Clear browser cache and hard refresh (Cmd/Ctrl + Shift + R)
- **Wrong icon**: Check file paths match the metadata configuration
- **Blurry**: Ensure ICO file contains multiple sizes (16x16, 32x32)