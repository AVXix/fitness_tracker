# Fitness Tracker Requirements

## Core Product Scope

This fitness tracker platform should support the following major features:

- User roles and authentication
- User profile management
- Workout logging, including recording exercises
- Calorie tracker
- Weight tracker
- Analytics, including graphs, records, and recommendations
- Goal setting with notifications and reminders
- Supplement and equipment store
- Fitness-related query forum
- Trainer request flow
- Progress tracking dashboard

## Functional Requirements

### 1. User Roles And Authentication

- Users must be able to register, log in, and log out.
- Authentication should be handled through Supabase Auth.
- The system should support role-based access such as `user` and `admin`.
- Each authenticated user must have a linked profile record.

### 2. User Profile Management

- Users must be able to manage personal profile data.
- Profile data should include:
  - display name
  - age
  - height
  - gender
  - fitness level
  - primary goal
  - bio

### 3. Workout Logging

- Users must be able to create workout entries.
- Each workout should support:
  - workout name
  - workout date
  - notes
  - total duration
  - calories burned
- Users must be able to attach multiple exercises to a workout.
- Exercise logs should support:
  - exercise name or exercise reference
  - sets
  - reps
  - weight
  - duration

### 4. Calorie Tracker

- Users must be able to log calories consumed and calories burned by date.
- The system should calculate net calories.
- Calorie history should be viewable by the user over time.

### 5. Weight Tracker

- Users must be able to log weight by date.
- Users should be able to review previous weight records.
- Weight data should feed into progress tracking and analytics.

### 6. Analytics

- The system should generate analytics snapshots for each user.
- Analytics should support:
  - BMI
  - weekly progress percentage
  - recommendation text
- The UI should eventually include graphs and trend views for logged data.

### 7. Goal Setting, Notifications, And Reminders

- Users must be able to create goals.
- Goals should support:
  - title
  - goal type
  - target value
  - current value
  - unit
  - end date
  - status
- Users must be able to create reminders.
- Reminders should support a scheduled datetime and completion status.

### 8. Supplement And Equipment Store

- The app should include a store catalog for supplements and equipment.
- Store items should support:
  - item name
  - category
  - price
  - stock quantity
- Users should be able to place orders.
- Orders should support multiple order items.

### 9. Fitness Forum

- Users must be able to create forum posts.
- Users must be able to comment on forum posts.
- Forum content should be fitness-related question and answer style content.

### 10. Trainer Request Flow

- Users must be able to browse or reference trainers.
- Users must be able to send trainer requests.
- Trainer requests should include status tracking.
- The platform should support user-uploaded workout videos for trainer review later.

### 11. Progress Tracking Dashboard

- The dashboard should summarize the user’s activity and progress.
- It should eventually show:
  - current goals
  - recent workouts
  - recent weight logs
  - calorie summaries
  - analytics snapshots
  - reminders

## Technical Notes

- Supabase `auth.users` is the canonical user/auth table.
- App-specific user data should live in public tables such as `profiles`.
- User-owned tables must enforce row-level security using `auth.uid()`.
- The project is intended to be hosted on Vercel.
- The database is intended to be hosted on Supabase Postgres.
