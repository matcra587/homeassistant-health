# homeassistant-health

Home Assistant add-on repository for a family health tracker.

## Feature Set

*   Home Assistant add-on packaging with ingress and Home Assistant API access
*   Home Assistant user detection through ingress headers
*   user profiles with height, age, gender, activity level, goal weight, and target date
*   daily weight logging with optional body fat, waist, chest, hip, notes, and past-date entries
*   BMI, BMR, TDEE, ideal weight, trend, progress, and streak calculations
*   weight charts with moving averages, goal markers, and time range filters
*   entry history with update and delete actions
*   household progress views with privacy-aware exact weight sharing
*   user settings for units, reminders, milestone alerts, focus mode, and timezone
*   metric and imperial display/conversion support
*   CSV export for weight and measurement history
*   SQLite storage under the add-on data path
*   Home Assistant sensors for personal stats, household stats, reminders, and milestones
*   milestone detection for streaks, weight loss, goal reached, and new low entries
