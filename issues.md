# Application Bug Report & Issues

---

## Navigation & Layout

### [NAV-01] Stray "New Task" Button Visible When Sidebar is Minimized
When the sidebar is collapsed/minimized, a button labeled **"New Task"** incorrectly appears in the top-left corner of the screen. This button should not be visible when the sidebar is minimized. Remove it entirely from that state.

---

## UI Consistency & Design

### [UI-01] Inconsistent Page Header Spacing Across Pages
The **Board**, **Backlog**, **Sprints**, and **Team** pages have inconsistent title/header spacing and placement. They should match the exact spacing and layout used on the **Dashboard** page. Use the Dashboard as the reference standard for all page headers going forward.

### [UI-02] Inconsistent UI Components Across Pages
There are too many visual and structural differences between pages (components, styles, layouts, etc.). All pages should share the same UI components and design patterns to maintain a clean, organized, and unified look throughout the application.

---

## Board Page

### [BOARD-01] Board Defaults to Sprint 5 Instead of All Sprints
When the Board page loads, it automatically selects **Sprint 5** in the sprint dropdown. The default view should show **All Sprints**. The user should be able to manually select a specific sprint from the dropdown menu if desired.

---

## Sprints Page

### [SPRINT-01] Incorrect Status Label — Active Sprint Shown as "Pasado" (Past)
In the **Status** column of the Sprints page, a newly created sprint (with a start date of today and an end date one week from now) is incorrectly displayed as **"Pasado"** (Past). A sprint that is currently active or upcoming should not be labeled as past. Review and fix the status calculation logic.

### [SPRINT-02] "Current" Status Label Not Capitalized
In the **Status** column of the Sprints page, the label **"current"** is displayed in all lowercase. It should be capitalized as **"Current"** to match standard formatting conventions.

---

## Backend & Developer Setup

### [DEV-01] Telegram Long Polling Error on Startup
When starting the project using `bash start-dev.sh`, a **Telegram long polling error** is thrown in the console on every startup. Although the application still runs successfully, this error should be addressed — either by fixing the Telegram integration, handling the error gracefully, or suppressing it if the feature is not in use.

---

*Last updated: June 2026*
