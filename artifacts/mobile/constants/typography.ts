/**
 * Global typography defaults.
 *
 * WHY includeFontPadding: false?
 * Android adds extra space above/below every Text node to accommodate tall
 * ascenders/descenders in the *system* font. When you switch to a custom font
 * (Google Sans) this phantom padding remains, pushing text visually up or
 * down inside its container and making vertically-centred layouts look broken.
 * Setting includeFontPadding: false removes that extra space so the text box
 * matches the actual glyph bounds.
 *
 * WHY call this once from _layout.tsx (not per-component)?
 * Calling it here keeps every component clean. The style is merged as the
 * *base* layer — individual component styles always win on top of it.
 */

import { Text, TextInput } from 'react-native';

export function applyGlobalTypographyFix() {
  // ── Text ──────────────────────────────────────────────────────────────────
  if (!(Text as any).defaultProps) (Text as any).defaultProps = {};
  // Merge with any existing defaultProps style so we don't clobber them.
  const existingTextStyle = ((Text as any).defaultProps.style as object) ?? {};
  (Text as any).defaultProps.style = { includeFontPadding: false, ...existingTextStyle };
  // Disable system font-scaling globally; use our own size tokens instead.
  (Text as any).defaultProps.allowFontScaling = false;

  // ── TextInput ─────────────────────────────────────────────────────────────
  if (!(TextInput as any).defaultProps) (TextInput as any).defaultProps = {};
  const existingInputStyle = ((TextInput as any).defaultProps.style as object) ?? {};
  (TextInput as any).defaultProps.style = { includeFontPadding: false, ...existingInputStyle };
  (TextInput as any).defaultProps.allowFontScaling = false;
}
