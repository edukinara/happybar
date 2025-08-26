# Happy Bar Brand Guidelines

## Brand Identity

### Mission Statement
Happy Bar empowers bars and restaurants to create exceptional customer experiences through intelligent inventory management, seamless POS integration, and data-driven insights.

### Brand Values
- **Simplicity** - Making complex operations effortless
- **Reliability** - Trusted partner for business operations
- **Innovation** - Modern solutions for modern establishments
- **Community** - Supporting the hospitality industry

## Visual Identity

### Logo
The Happy Bar logo combines a stylized cocktail glass with a subtle smile curve, representing both the product focus and the positive experience we deliver.

### Brand Colors

#### Primary Colors
```css
--brand-primary: #8B5CF6;        /* Purple - Innovation & Premium */
--brand-primary-dark: #7C3AED;   /* Darker Purple - Hover states */
--brand-primary-light: #A78BFA;  /* Light Purple - Backgrounds */

--brand-accent: #F59E0B;         /* Amber - Energy & Warmth */
--brand-accent-dark: #D97706;    /* Dark Amber - CTAs */
--brand-accent-light: #FCD34D;   /* Light Amber - Highlights */
```

#### Neutral Colors
```css
--neutral-50: #FAFAFA;
--neutral-100: #F4F4F5;
--neutral-200: #E4E4E7;
--neutral-300: #D4D4D8;
--neutral-400: #A1A1AA;
--neutral-500: #71717A;
--neutral-600: #52525B;
--neutral-700: #3F3F46;
--neutral-800: #27272A;
--neutral-900: #18181B;
```

#### Semantic Colors
```css
--success: #10B981;    /* Green - Success states */
--warning: #F59E0B;    /* Amber - Warning states */
--error: #EF4444;      /* Red - Error states */
--info: #3B82F6;       /* Blue - Information */
```

### Typography

#### Font Families
- **Headings**: Inter (font-weight: 600-800)
- **Body**: Inter (font-weight: 400-500)
- **Monospace**: JetBrains Mono (for data, codes)

#### Type Scale
```css
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px */
```

## UI Components Style

### Border Radius
```css
--radius-sm: 0.375rem;   /* 6px - Small elements */
--radius-md: 0.5rem;     /* 8px - Default */
--radius-lg: 0.75rem;    /* 12px - Cards */
--radius-xl: 1rem;       /* 16px - Large cards */
--radius-full: 9999px;   /* Pills, badges */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### Spacing
Based on 4px grid system:
- 1 = 0.25rem (4px)
- 2 = 0.5rem (8px)
- 3 = 0.75rem (12px)
- 4 = 1rem (16px)
- 6 = 1.5rem (24px)
- 8 = 2rem (32px)
- 12 = 3rem (48px)
- 16 = 4rem (64px)

## Application Themes

### Customer App (Web)
- Primary: Purple gradient
- Accent: Amber for CTAs
- Clean, modern interface
- Focus on product discovery

### Admin Dashboard
- Professional dark sidebar
- Purple accents for actions
- Data-focused layouts
- Clear hierarchy

### POS Integration
- Minimal, unobtrusive design
- Quick action buttons
- High contrast for visibility
- Optimized for touch

## Brand Voice & Tone

### Voice Characteristics
- **Friendly** but professional
- **Clear** and concise
- **Helpful** without being patronizing
- **Confident** but not arrogant

### Messaging Examples
- ❌ "You must configure your settings"
- ✅ "Let's set up your account"

- ❌ "Error: Invalid input"
- ✅ "Please check your entry and try again"

- ❌ "Transaction processed"
- ✅ "Order placed successfully!"

## Icon Style
- Use Lucide React icons consistently
- Line weight: 2px
- Size: 16px (small), 20px (default), 24px (large)
- Always maintain consistent sizing within context

## Motion & Animation

### Timing Functions
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Duration
```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
```

### Transitions
- Hover states: 150ms ease-out
- Page transitions: 250ms ease-in-out
- Modal/drawer: 350ms ease-out

## Implementation Guidelines

### Consistency Rules
1. Always use CSS variables for colors
2. Maintain 4px grid alignment
3. Use semantic color names for states
4. Keep animations subtle and purposeful
5. Ensure AA accessibility standards minimum

### Component Hierarchy
1. **Primary Actions**: Brand primary color, larger size
2. **Secondary Actions**: Outlined or ghost variants
3. **Tertiary Actions**: Text only, smaller size
4. **Destructive Actions**: Error color, require confirmation

### Data Visualization
- Use brand colors for primary data
- Ensure sufficient contrast
- Provide colorblind-friendly alternatives
- Include data labels for accessibility

## Logo Usage

### Clear Space
Maintain minimum clear space equal to the height of the "H" in Happy around all sides of the logo.

### Minimum Size
- Digital: 24px height minimum
- Print: 0.5 inch height minimum

### Don'ts
- Don't stretch or distort
- Don't change colors arbitrarily
- Don't add effects or shadows
- Don't place on busy backgrounds

## File Naming Conventions

### Assets
- Icons: `icon-{name}-{size}.svg`
- Images: `img-{description}-{size}.{ext}`
- Logos: `logo-happybar-{variant}.svg`

### Components
- React: `PascalCase` (e.g., `ProductCard.tsx`)
- Styles: `kebab-case` (e.g., `product-card.css`)
- Utils: `camelCase` (e.g., `formatPrice.ts`)