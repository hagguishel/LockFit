// src/theme/colors.ts
// 🎨 Palette principale LockFit — à utiliser partout (aucun hex direct dans les écrans)

export type Theme = {
  colors: {
    bg: string;            // fond global
    surface: string;       // cartes, blocs
    surfaceAlt: string;    // variantes secondaires
    border: string;        // bordures / séparateurs
    primary: string;       // accent LockFit
    onPrimary: string;     // texte sur bouton primary
    text: string;          // texte principal
    muted: string;         // texte secondaire
    dot: string;           // pastilles, icônes neutres
    danger: string;
    success: string;
    warning: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  shadow: {
    card: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
  };
};

const theme: Theme = {
  colors: {
    bg: "#0F1420",
    surface: "#121927",
    surfaceAlt: "#0B0D14",
    border: "#232A3A",
    primary: "#12E29A",
    onPrimary: "#061018",
    text: "#E6F0FF",
    muted: "#98A2B3",
    dot: "#1C1F2A",
    danger: "#FF6B6B",
    success: "#2ED573",
    warning: "#FFD166",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 22 },
  spacing: { xs: 6, sm: 12, md: 16, lg: 24 },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  },
};

export default theme;
