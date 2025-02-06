# Motive Archive Manager - Styling Guide

## Design Philosophy

Our application follows a minimalist, content-focused design approach with a dark-mode-first philosophy. The interface should feel modern, professional, and sophisticated while maintaining excellent readability and usability.

## Color Palette

### Dark Mode (Primary)

```css
/* Background Colors */
--background-primary: #111111; /* Main background */
--background-secondary: #1a1a1a; /* Card backgrounds, elevated surfaces */
--background-tertiary: #222222; /* Hover states, subtle highlights */

/* Text Colors */
--text-primary: #ffffff; /* Primary text */
--text-secondary: #a1a1aa; /* Secondary text, labels */
--text-tertiary: #71717a; /* Disabled text, placeholders */

/* Accent Colors */
--accent-primary: #3b82f6; /* Primary actions, focus states */
--accent-secondary: #1d4ed8; /* Secondary actions */
--accent-success: #22c55e; /* Success states */
--accent-warning: #eab308; /* Warning states */
--accent-error: #ef4444; /* Error states */

/* Border Colors */
--border-primary: #27272a; /* Primary borders */
--border-secondary: #3f3f46; /* Secondary borders */
```

### Light Mode (Secondary)

```css
/* Background Colors */
--background-primary: #ffffff; /* Main background */
--background-secondary: #f4f4f5; /* Card backgrounds, elevated surfaces */
--background-tertiary: #e4e4e7; /* Hover states, subtle highlights */

/* Text Colors */
--text-primary: #18181b; /* Primary text */
--text-secondary: #52525b; /* Secondary text, labels */
--text-tertiary: #71717a; /* Disabled text, placeholders */

/* Border Colors */
--border-primary: #e4e4e7; /* Primary borders */
--border-secondary: #d4d4d8; /* Secondary borders */
```

## Typography

### Font Family

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
  Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
  "Liberation Mono", "Courier New", monospace;
```

### Font Sizes

```css
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
```

## Spacing

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

## Border Radius

```css
--radius-sm: 0.125rem; /* 2px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-2xl: 1rem; /* 16px */
```

## Shadows

```css
/* Dark Mode */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);

/* Light Mode */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

## Component Styling

### Buttons

```css
/* Primary Button */
.btn-primary {
  @apply bg-accent-primary text-white px-4 py-2 rounded-md hover:bg-accent-secondary 
  transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 
  dark:focus:ring-offset-background-primary disabled:opacity-50;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-background-secondary text-text-primary px-4 py-2 rounded-md 
  hover:bg-background-tertiary border border-border-primary transition-colors 
  focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 
  dark:focus:ring-offset-background-primary disabled:opacity-50;
}

/* Ghost Button */
.btn-ghost {
  @apply text-text-secondary hover:text-text-primary px-4 py-2 rounded-md 
  transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary 
  focus:ring-offset-2 dark:focus:ring-offset-background-primary disabled:opacity-50;
}
```

### Cards

```css
.card {
  @apply bg-background-secondary border border-border-primary rounded-lg p-6 
  shadow-sm hover:shadow-md transition-shadow dark:hover:shadow-lg;
}
```

### Forms

```css
/* Input */
.input {
  @apply w-full bg-background-primary border border-border-primary rounded-md px-4 py-2 
  text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 
  focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-background-primary;
}

/* Label */
.label {
  @apply block text-sm text-text-secondary mb-2;
}

/* Select */
.select {
  @apply w-full bg-background-primary border border-border-primary rounded-md px-4 py-2 
  text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary 
  focus:ring-offset-2 dark:focus:ring-offset-background-primary;
}
```

## Layout Guidelines

### Container Widths

```css
.container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}
```

### Grid System

```css
.grid {
  @apply grid gap-4 md:gap-6 lg:gap-8;
}

.grid-cols-1 {
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
}
```

### Spacing Guidelines

- Use consistent spacing between sections (--space-8)
- Use consistent spacing between components (--space-4)
- Use consistent padding within components (--space-6)
- Maintain consistent vertical rhythm with line heights

## Animation Guidelines

```css
/* Transitions */
--transition-base: 150ms ease-in-out;
--transition-slow: 300ms ease-in-out;

/* Hover Effects */
.hover-effect {
  @apply transition-all duration-150 ease-in-out;
}
```

## Accessibility Guidelines

- Maintain a minimum contrast ratio of 4.5:1 for normal text
- Use semantic HTML elements
- Ensure all interactive elements are keyboard accessible
- Provide focus indicators for all interactive elements
- Include proper ARIA labels where necessary

## Best Practices

1. Use CSS variables for theme values to maintain consistency
2. Follow mobile-first responsive design
3. Maintain consistent spacing using the defined spacing scale
4. Use semantic class names
5. Keep components modular and reusable
6. Prioritize performance with minimal CSS
7. Ensure dark mode compatibility for all components
8. Use CSS Grid and Flexbox for layouts
9. Implement smooth transitions for state changes
10. Follow accessibility guidelines for all components

## Implementation Notes

- Use Tailwind CSS utility classes when possible
- Extend theme in tailwind.config.js with these values
- Create custom components for frequently used patterns
- Maintain consistent class ordering in components
- Document any deviations from these guidelines
