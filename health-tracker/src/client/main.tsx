import "@mantine/core/styles.layer.css";
import "@mantine/dates/styles.layer.css";
import "@mantine/charts/styles.layer.css";
import "@mantine/notifications/styles.layer.css";

import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { theme } from "./theme";

const root = document.getElementById("root");

if (!root) {
  throw new Error("missing root element");
}

createRoot(root).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DatesProvider settings={{ locale: "en", firstDayOfWeek: 1 }}>
        <Notifications position="top-right" />
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
