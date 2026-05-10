# Changelog

## 0.4.1

*   Swapped the BMI, BMR, TDEE, and ideal-weight calculations over to the
    `@finegym/fitness-calc` library so the formulas are maintained upstream
    and easier to extend toward macros and other metrics later.
*   Refined the BMI category label to use the WHO classification —
    `Severely`, `Moderately`, and `Mildly` underweight, plus `Obese class I`,
    `II`, and `III` — instead of a flat four-bucket grouping.

## 0.4.0

*   Migrated the add-on internals to end-to-end TypeScript with strict type
    checks throughout the React app, the API server, and the shared library.
*   Validated every API request and response against shared Valibot schemas so
    invalid payloads fail fast with a clear 422 instead of corrupting state.
*   Reorganised the server around a `createServer` factory with explicit auth
    configuration, removing implicit dependence on the runtime environment.
*   Added integration tests covering the HTTP API and a component test harness
    for the React UI so future changes catch regressions earlier.
*   No user-visible behaviour changed in this release — this is internal
    hardening that lays the groundwork for upcoming features.

## 0.3.2

*   Fixed a timezone bug that stored picked dates one day earlier than
    selected, and a related issue that prevented saving target dates in
    the first-run setup and the add-member flow.

## 0.3.1

*   Fixed the dashboard greeting so it reflects the actual time of day instead
    of always reading "Good morning".

## 0.3.0

*   Rebuilt the frontend on Mantine — every screen, form, modal, chart, and
    navigation surface uses Mantine components.
*   Refreshed the visual identity to the GitHub Primer palette in both light
    and dark themes, with a cool dark scale that matches the body background.
*   Improved forms with declarative validation and accessible date, time,
    weight, and selection controls.
*   Replaced the navigation chrome with a responsive layout — desktop sidebar
    and mobile bottom-tab bar.
*   Replaced the hand-drawn weight chart with an interactive line chart that
    has built-in tooltips and time-range filtering.
*   Switched to Tabler icons and removed the bundled Material Symbols font.

## 0.2.3

*   Added profile theme preferences.
*   Improved mobile dialogs, switches, dropdowns, and date/time controls.
*   Updated the app icon, logo, and bundled Material Symbols font.
*   Fixed stale local development profile updates after hot reloads.

## 0.2.2

*   Fixed API requests when the app runs under Home Assistant ingress.

## 0.2.1

*   Require profile setup before the dashboard accepts weight entries.
*   Removed placeholder profile defaults for Home Assistant users and household
    members.
*   Added validation for required units, activity level, target date, starting
    weight, and target weight.

## 0.2.0

*   Added the Home Assistant Health dashboard, entries, household, and profile
    interface.
*   Added local SQLite storage for household members and weight entries.
*   Added Home Assistant user bootstrap so the signed-in user gets a profile.
*   Scoped weight entries and CSV export to the signed-in Home Assistant user.
*   Added required starting and target weights when adding household members.

## 0.1.0

*   Added the initial Home Assistant app scaffold.
*   Added a Bun fullstack server with a hello-world React interface.
*   Added health and readiness probe routes.
