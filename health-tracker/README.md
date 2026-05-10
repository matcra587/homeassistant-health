# Home Assistant Health

Family weight tracker for Home Assistant.

Each household member who can sign in to Home Assistant gets their own profile
with height, age, sex, activity level, starting weight, goal, and target date.
Daily weight entries record optional body fat percentage, waist measurement,
and a note. The dashboard shows derived stats (BMI, BMR, TDEE, ideal weight,
trend, progress to goal, and current streak), a weight chart with goal marker
and time-range filter, and a household view with privacy-aware sharing.

The add-on runs as a Home Assistant ingress app on port `3000` and stores
everything in a SQLite database under the add-on config mount, so data stays
on your Home Assistant instance.

See [`DOCS.md`](DOCS.md) for routes, storage, and local development.
