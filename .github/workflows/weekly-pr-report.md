---
name: Weekly PR Report
on:
  schedule:
    - cron: "0 8 * * 1"
  workflow_dispatch: {}
permissions:
  contents: read
  pull-requests: read
safe-outputs:
  create-pull-request:
    draft: false
engine: claude
---

Generate a report summarizing pull request activity in this repository
over the past 7 days.

1. Determine the current ISO week number of the year (e.g. week 35).
2. Create a new Markdown file at `pr-reports/week-<N>.md`
   (replace `<N>` with that week number, e.g. `pr-reports/week-35.md`).
3. In the file, include:
    - A title `# Week <N> PR Report`
    - Number of PRs opened, merged, and closed this week
    - A list of merged PRs with author and links
    - Any PRs still open for more than 3 days with no review
    - A short natural-language summary of the week's development activity
4. Open this as a pull request adding that single file, titled
   "Week <N> PR Report".