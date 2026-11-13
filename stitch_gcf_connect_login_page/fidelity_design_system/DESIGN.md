---
name: Fidelity Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d7dae3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fc'
  surface-container: '#ebedf7'
  surface-container-high: '#e6e8f1'
  surface-container-highest: '#e0e2eb'
  on-surface: '#181c22'
  on-surface-variant: '#414753'
  inverse-surface: '#2d3037'
  inverse-on-surface: '#eef0fa'
  outline: '#717785'
  outline-variant: '#c1c6d5'
  surface-tint: '#005db8'
  primary: '#005cb8'
  on-primary: '#ffffff'
  primary-container: '#1275e2'
  on-primary-container: '#000512'
  inverse-primary: '#aac7ff'
  secondary: '#465f88'
  on-secondary: '#ffffff'
  secondary-container: '#b6d0ff'
  on-secondary-container: '#3f5881'
  tertiary: '#9a4600'
  on-tertiary: '#ffffff'
  tertiary-container: '#c05900'
  on-tertiary-container: '#0d0300'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aec7f7'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#2d476f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#763400'
  background: '#f9f9ff'
  on-background: '#181c22'
  surface-variant: '#e0e2eb'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Fidelity Design System

## Brand & Style
The Fidelity Design System embraces a modern, reliable, and professional aesthetic ("fidelity"). It uses clean lines, ample whitespace, and high-precision typography to communicate trust and clarity. The visual language is refined and purposeful, avoiding unnecessary ornamentation in favor of functional elegance.

## Colors
The color system is built around a vibrant primary blue (`#1275e2`) that establishes trust and technological competence. A supportive secondary slate blue (`#5f78a3`) provides subtle contrast, while an energetic tertiary accent (`#c55b00`) draws attention to key interactive states and callouts. Neutrals (`#74777f`) maintain high legibility and structure across light surfaces.

## Typography
Inter is used consistently across headlines, body copy, and labels. It offers exceptional legibility across digital viewports at any scale. The type hierarchy relies on clean weight variations (400 for body, 500/600 for labels and headlines) to establish visual structure without relying on decorative typefaces.

## Layout & Spacing
A structured spacing scale based on 0.5rem increments is used to maintain consistent rhythm throughout layouts. Gutters are set to 1rem with outer margins at 1.5rem, ensuring comfortable breathing room on standard viewports while scaling gracefully down to mobile screens.

## Elevation & Depth
Elevation is achieved primarily through tonal layering and soft, ambient shadows. Surfaces use subtle opacity shifts and low-contrast borders to delineate cards, dropdowns, and modals without creating harsh visual breaks.

## Shapes
The design system employs a roundedness level of `2` (moderately rounded, ~0.5rem base radius for standard containers, scaling up to 1rem–1.5rem for large elements). This creates a friendly, approachable, yet professional geometry across all interactive elements.

## Components
- **Buttons:** Solid primary buttons use the `#1275e2` background with white text, featuring a moderate corner radius matching the system's roundedness tokens.
- **Input Fields:** Clean bordered fields with neutral outlines (`#74777f`), shifting to the primary blue on focus.
- **Cards:** White surfaces with subtle neutral borders and soft elevation styling.
- **Chips & Badges:** Compact inline elements using secondary and tertiary accents for status communication.