# Changelog

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
