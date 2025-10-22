// src/theme/typography.ts
// 🔤 Échelle typographique sémantique — cohérente avec Figma

import theme from "@/theme/colors";

const typography = {
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800" as const,
    color: theme.colors.text,
  },
  h2: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800" as const,
    color: theme.colors.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    color: theme.colors.text,
  },
  mute: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    color: theme.colors.muted,
  },
  cta: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800" as const,
    color: theme.colors.onPrimary,
  },
};

export default typography;
