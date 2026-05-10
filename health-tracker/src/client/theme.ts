import { createTheme, type MantineColorsTuple } from "@mantine/core";

const githubBlue: MantineColorsTuple = [
  "#f5fafe",
  "#ddf4ff",
  "#b6e3ff",
  "#80ccff",
  "#58a6ff",
  "#0969da",
  "#0550ae",
  "#033d8b",
  "#0a3069",
  "#002155",
];

const githubGreen: MantineColorsTuple = [
  "#f1fdf4",
  "#dafbe1",
  "#aceebb",
  "#6fdd8b",
  "#3fb950",
  "#1a7f37",
  "#116329",
  "#044f1e",
  "#003d16",
  "#002d11",
];

const githubRed: MantineColorsTuple = [
  "#fff8f7",
  "#ffebe9",
  "#ffcecb",
  "#ffaba8",
  "#ff8182",
  "#f85149",
  "#d1242f",
  "#a40e26",
  "#82071e",
  "#660018",
];

const githubGray: MantineColorsTuple = [
  "#f6f8fa",
  "#eaeef2",
  "#d0d7de",
  "#afb8c1",
  "#8c959f",
  "#6e7781",
  "#57606a",
  "#424a53",
  "#32383f",
  "#24292f",
];

// Override Mantine's default dark scale (which is slightly warm) with GitHub's
// cool dark-blue scale so dark-mode surfaces match the body palette instead of
// reading as sepia against it.
const githubDark: MantineColorsTuple = [
  "#e6edf3", // dark.0 — text on dark
  "#b1bac4", // dark.1 — secondary text
  "#7d8590", // dark.2 — dimmed
  "#6e7681", // dark.3
  "#484f58", // dark.4 — strong border
  "#30363d", // dark.5 — default border
  "#21262d", // dark.6 — hover / surface high
  "#161b22", // dark.7 — surface (default Mantine "body" / panel)
  "#0d1117", // dark.8 — body background
  "#010409", // dark.9 — deepest
];

export const theme = createTheme({
  primaryColor: "github-blue",
  primaryShade: { light: 5, dark: 4 },
  colors: {
    "github-blue": githubBlue,
    "github-green": githubGreen,
    "github-red": githubRed,
    "github-gray": githubGray,
    dark: githubDark,
  },
  defaultRadius: "md",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
  fontFamilyMonospace:
    "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  headings: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
    fontWeight: "600",
  },
  cursorType: "pointer",
});
