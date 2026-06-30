# SYSTEM PROMPT: BUILD AY PRAYERBOX

You are a senior full-stack engineer, UX designer, Firebase architect, and Next.js expert.

Build a complete production-ready application called:

# AY Prayerbox 🙏

A mobile-first anonymous prayer platform for Adventist Youth that combines:

* Prayer request submission
* Public prayer wall
* Testimonies
* WhatsApp integration
* Admin moderation
* Firebase backend

The application should feel sacred, modern, trustworthy, peaceful, and community-driven.

---

# TECH STACK

Frontend

* Next.js 14 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion
* React Hook Form
* Zod Validation

Backend

* Firebase Firestore
* Firebase Admin SDK
* Firebase Cloud Functions
* Firebase Storage

Authentication

* No public accounts
* Anonymous visitors only
* Admin dashboard protected using ADMIN_PASS environment variable

Deployment

* Vercel

Bot

* Node.js
* Baileys OR Meta WhatsApp Cloud API
* Firestore integration

---

# DESIGN SYSTEM

Theme

Primary:
#1E3A8A

Accent:
#FBBF24

Background:
#FFFFFF

Text:
#111827

Success:
#22C55E

Error:
#EF4444

Use:

* Large rounded corners
* Soft shadows
* Mobile-first layout
* Large touch targets
* Clean typography
* Reverent atmosphere
* No clutter
* Maximum 3 taps required to pray

Design inspiration:

* Bible App
* Headspace
* Instagram Stories
* NGL
* Apple Human Interface Guidelines

---

# FIRESTORE SCHEMA

Collection: requests

{
id: string,
text: string,
category: string,
initials?: string,
status: "pending" | "approved" | "answered",
createdAt: Timestamp,
prayCount: number,
prayedBy: string[],
lastPrayedAt?: Timestamp,
testimonyId?: string,
isSeed?: boolean
}

Collection: testimonies

{
id: string,
requestId: string,
text: string,
category: string,
createdAt: Timestamp,
answeredAt: Timestamp
}

Collection: analytics

{
totalPrayers: number,
activeUsers: number
}

---

# PAGE: /

Landing page

Hero section

Title:

AY Prayerbox 🙏

Subtitle:

Anonymous prayer.
Real people.
Real faith.

Buttons

[ Submit Prayer ]

[ Pray For Someone ]

Statistics section

* Requests prayed for
* Testimonies shared
* Community prayers

Recent testimonies carousel

Footer

James 5:16

---

# PAGE: /submit

Prayer request form

Fields

Category dropdown

Options:

* Health
* Exams
* Family
* Spiritual
* Other

Optional initials

Prayer text

Validation

* Required
* Maximum 500 characters

Submit button

On submit:

Create Firestore document

status = pending

prayCount = 0

prayedBy = []

createdAt = serverTimestamp()

Success page

Large centered illustration

Confetti animation

Message:

Your prayer is safe with God + AY 🙏

Buttons:

Share Prayer
Pray For Someone

Generate beautiful scripture share card.

---

# PAGE: /pray

Main feature.

Load:

Random approved request

Requirements

Never show request already prayed by current visitor.

Use FingerprintJS.

Store fingerprint hash.

Query:

status == approved

fingerprint NOT IN prayedBy

Card displays:

Category Badge

Prayer Request

Prayer Count

Last prayed:

Example:

Last prayed 3 minutes ago by someone in Harare

Progress bar

Example:

147 prayers offered

Buttons

Pray 🙏

Next Prayer →

Screenshot Prayer

When Pray clicked

* Increment prayCount
* Add fingerprint hash to prayedBy
* Update lastPrayedAt
* Disable button for 10 seconds
* Countdown timer visible
* Show Amen animation

Text:

Amen 🙏
God heard your prayer.

Load next prayer.

If empty

Show 5 seed prayers.

Empty state:

No new prayers today.
Thank you for praying.

---

# OPTIONAL AUDIO

Prayer room audio.

User must manually start.

Never autoplay.

Controls:

▶️ Play
⏸ Pause

Volume

20%

Persist preference in localStorage.

---

# SCREENSHOT CARD GENERATOR

Generate image card containing:

Category

Prayer text

AY Prayerbox branding

Bible verse footer

Export PNG

Share to WhatsApp

Share to Instagram Stories

Download

---

# PAGE: /testimonies

Display approved testimonies.

Card layout

Testimony text

Date answered

Category

Link back to original request

Example:

We prayed for this 23 days ago

147 people prayed

Filters

* All
* Health
* Exams
* Family
* Spiritual
* Other

Search functionality

Infinite scrolling

---

# PAGE: /admin

Password protected.

Use:

ADMIN_PASS

Session stored in secure cookie.

Dashboard includes:

Stats Cards

* Total Requests
* Total Prayers This Month
* Total Testimonies
* Active Users

Tabs

Pending Requests

Approved Requests

Testimonies

Analytics

---

# PENDING REQUESTS TABLE

Columns

Category

Initials

Request

Date

Actions

Approve

Delete

Mark Answered

---

# MARK ANSWERED WORKFLOW

Modal

Fields

Testimony Text

Date

Submit

Creates testimony document.

Updates request:

status = answered

Links testimony.

---

# BULK SEED DATA MANAGEMENT

Button

Delete All Seed Data

Delete documents where

isSeed == true

---

# WHATSAPP BOT

Node.js service.

Commands:

/pray

Returns random approved request.

Buttons

Pray 🙏

Next Prayer

When Pray selected

Increment prayCount.

Check duplicate fingerprint or phone hash.

Prevent duplicate prayers.

---

/submit

Conversation flow

Step 1

Choose category

Health
Exams
Family
Spiritual
Other

Skip option available.

Step 2

Enter prayer request.

Save to Firestore.

Reply:

Request received.
AY leaders will pray and approve it soon 🙏

---

/testify

Collect testimony text.

Save to testimonies collection.

status = pending

---

# FIREBASE FUNCTIONS

Create functions:

submitPrayer()

prayForRequest()

submitTestimony()

approveRequest()

markAnswered()

whatsappWebhook()

analyticsUpdater()

rateLimiter()

All functions must use TypeScript.

---

# ANTI-SPAM SYSTEM

FingerprintJS

Store fingerprint hash.

Pray button rules

* One prayer per request per fingerprint
* Disable button for 10 seconds
* Countdown visible

Cloud Function rate limits

Maximum:

3 prayers per minute per IP

Reject additional requests.

Return:

Please wait before praying again 🙏

---

# FIRESTORE SECURITY RULES

Only approved requests readable publicly.

Only prayer updates allowed from secure functions.

Admin operations require custom admin claim.

Implement production-grade rules.

---

# SEED DATA SCRIPT

File:

scripts/seed.ts

Command:

npm run seed

Requirements

If requests collection empty

Insert 10 realistic prayer requests.

Examples:

Praying for my O-Level examinations

My mother's surgery is next week

Seeking employment opportunities

Family restoration

Spiritual growth

University acceptance

Financial breakthrough

Health recovery

Ministry outreach success

Direction for future career

Each record:

isSeed = true

status = approved

prayCount = random realistic value

Use Firebase Admin SDK.

---

# ENVIRONMENT VARIABLES

ADMIN_PASS

NEXT_PUBLIC_SITE_URL

FIREBASE_PROJECT_ID

FIREBASE_CLIENT_EMAIL

FIREBASE_PRIVATE_KEY

FIREBASE_API_KEY

FIREBASE_AUTH_DOMAIN

FIREBASE_STORAGE_BUCKET

FIREBASE_MESSAGING_SENDER_ID

FIREBASE_APP_ID

WHATSAPP_TOKEN

WHATSAPP_VERIFY_TOKEN

WHATSAPP_PHONE_ID

FINGERPRINTJS_API_KEY

---

# DELIVERABLES

Generate complete repository structure.

Include:

* Next.js App Router project
* All pages
* Components
* Hooks
* Types
* Firebase setup
* Cloud Functions
* WhatsApp webhook
* Firestore rules
* Tailwind config
* shadcn components
* scripts/seed.ts
* package.json scripts
* setup.md deployment guide
* Vercel deployment instructions

Everything must be production-ready, mobile-first, fully typed, and ready to deploy.
