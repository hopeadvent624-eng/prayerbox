# BUILD AY PRAYERBOX 🙏

You are a senior software architect, UI/UX designer, Firebase expert, Next.js engineer, DevOps engineer, and WhatsApp bot developer.

Build a complete production-ready web platform called:

# AY Prayerbox 🙏

An Adventist Youth prayer ministry platform where people can anonymously submit prayer requests, pray for others, share testimonies, and participate in church prayer campaigns.

The platform must feel spiritual, peaceful, modern, trustworthy, mobile-first, and optimized for youth engagement.

---

# PRIMARY OBJECTIVE

Create a prayer ecosystem that helps:

* People submit prayer requests anonymously
* Community members pray for others
* AY leaders moderate content
* Testimonies be shared after answered prayers
* Churches run prayer campaigns
* WhatsApp users interact without visiting the website

---

# TECH STACK

Frontend

* Next.js 14 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion
* React Hook Form
* Zod

Backend

* Firebase Firestore
* Firebase Admin SDK
* Firebase Functions
* Firebase Storage

Bot

* Node.js
* WhatsApp Cloud API or Baileys

Deployment

* Vercel

Authentication

* No public accounts
* Anonymous users only
* Admin dashboard protected via secure password and session cookie

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

Warning:
#F59E0B

Error:
#EF4444

Style

* Mobile first
* Large buttons
* Rounded cards
* Soft shadows
* Clean typography
* Reverent atmosphere
* Minimal clutter
* Maximum 3 taps to pray

Inspired by:

* Bible App
* Headspace
* Instagram Stories
* NGL
* Apple Human Interface Guidelines

---

# DATABASE STRUCTURE

Collection: requests

{
id: string,
text: string,
category: string,
initials?: string,
status: "pending" | "approved" | "answered",
priority?: boolean,
createdAt: Timestamp,
prayCount: number,
prayedBy: string[],
lastPrayedAt?: Timestamp,
testimonyId?: string,
campaignId?: string,
isSeed?: boolean,
leaderNotes?: string
}

Collection: testimonies

{
id: string,
requestId: string,
text: string,
category: string,
answeredAt: Timestamp,
createdAt: Timestamp
}

Collection: campaigns

{
id: string,
title: string,
description: string,
active: boolean,
goalPrayers: number,
currentPrayers: number,
createdAt: Timestamp
}

Collection: dailyVerse

{
verse: string,
reference: string,
date: string
}

Collection: analytics

{
totalRequests: number,
totalPrayers: number,
totalTestimonies: number,
activeUsers: number
}

---

# LANDING PAGE (/)

Hero Section

Title

AY Prayerbox 🙏

Subtitle

Anonymous prayer.
Real faith.
Real community.

Buttons

Submit Prayer

Pray For Someone

Statistics

* Total prayers offered
* Requests submitted
* Testimonies shared

Display latest testimonies carousel.

Display current active prayer campaign.

Footer

James 5:16

"Pray for one another."

---

# SUBMIT PRAYER (/submit)

Fields

Category

Options

* Health
* Exams
* Family
* Spiritual
* Ministry
* Other

Optional initials

Prayer request text

Maximum 500 characters

Submit Button

Upon submit

Create request document

status = pending

prayCount = 0

prayedBy = []

createdAt = serverTimestamp()

Success Screen

Confetti animation

Message

Your prayer is safe with God + AY 🙏

Buttons

Share Prayerbox

Pray For Someone

Generate beautiful scripture share card.

---

# PRAY WALL (/pray)

Load one random approved request.

Rules

* Never show requests already prayed by current user.
* Use FingerprintJS.
* Store fingerprint hash.
* Check prayedBy before displaying.

Card Displays

Category

Prayer Request

Prayer Count

Last prayed information

Example

Last prayed 3 minutes ago by someone in Harare

Prayer chain progress bar

Example

147 / 500 prayers

Buttons

Pray 🙏

Next Prayer →

Screenshot Prayer

After Pray

* Increment prayCount
* Add fingerprint hash to prayedBy
* Update lastPrayedAt
* Disable button for 10 seconds
* Show countdown timer
* Show animation

Amen 🙏
God heard your prayer.

Automatically load next request.

If database empty

Load 5 seed prayers.

---

# DAILY BIBLE VERSE

Display on Pray Page.

Example

Today's Promise

Philippians 4:6

"Do not be anxious about anything..."

Admin can change verse daily.

---

# PRAYER STREAKS

No account required.

Use localStorage.

Track

lastPrayerDate

streakCount

Display

🔥 7 Day Prayer Streak

Reward consistency.

---

# OPTIONAL PRAYER AUDIO

Soft piano instrumental.

User must manually press play.

Never autoplay.

Volume 20%.

Save preference locally.

---

# SCREENSHOT CARD GENERATOR

Generate PNG image containing

* Prayer request
* Category
* Bible verse
* AY Prayerbox branding

Actions

Download

Share to WhatsApp

Share to Instagram Story

---

# TESTIMONIES (/testimonies)

Display approved testimonies.

Card Shows

Testimony

Date answered

Category

Link back to original request

Example

We prayed for this 23 days ago

147 people prayed

Filters

All

Health

Exams

Family

Spiritual

Ministry

Other

Search support.

Infinite scroll.

---

# PRAYER CAMPAIGNS

Allow AY leaders to create campaigns.

Examples

Week of Prayer

Exam Prayer Week

Youth Congress Prayer Chain

Camp Meeting Prayer Requests

Campaign Card Shows

Title

Description

Goal

Current Progress

Percentage Complete

Users can filter prayer requests by campaign.

---

# EMERGENCY PRAYER REQUESTS

Admin toggle

priority = true

Urgent requests appear first.

Badge

🚨 Urgent Prayer

---

# ADMIN DASHBOARD (/admin)

Protected using ADMIN_PASS environment variable.

Store session securely.

Dashboard Tabs

Pending Requests

Approved Requests

Campaigns

Testimonies

Analytics

Settings

---

# ADMIN FEATURES

Approve Request

Delete Request

Mark as Answered

Add Leader Notes

Create Campaign

Edit Campaign

Delete Campaign

Change Daily Verse

Bulk Delete Seed Data

---

# MARK AS ANSWERED

Modal Form

Fields

Testimony Text

Date

Submit

Creates testimony document.

Updates request

status = answered

Links testimony.

---

# ANALYTICS DASHBOARD

Show

Total Requests

Total Prayers

Total Testimonies

Active Users

Most Active Category

Answered Prayer Rate

Prayers This Month

Top Campaign

Visual charts.

---

# WHATSAPP BOT

Commands

/pray

Returns one approved prayer request.

Buttons

Pray 🙏

Next Prayer

Prevent duplicate prayer increments.

---

/submit

Conversation Flow

Choose category

Health

Exams

Family

Spiritual

Ministry

Other

Skip

Enter prayer request.

Save to Firestore.

Reply

Request received.
AY leaders will pray and approve it soon 🙏

---

/testify

Collect testimony.

Save for admin review.

---

# FIREBASE FUNCTIONS

Create

submitPrayer()

prayForRequest()

submitTestimony()

approveRequest()

markAnswered()

createCampaign()

updateDailyVerse()

analyticsUpdater()

whatsappWebhook()

rateLimiter()

Use TypeScript everywhere.

---

# ANTI-SPAM

FingerprintJS

One prayer per request per device.

Disable Pray button for 10 seconds.

Cloud Function Rate Limits

Maximum

3 prayers per minute per IP

Return

Please wait before praying again 🙏

Add profanity filtering.

Flag inappropriate requests.

---

# FIRESTORE SECURITY

Only approved requests readable publicly.

Only secure server-side functions can update prayer counts.

Admin operations require elevated privileges.

Production-grade Firestore security rules.

---

# SEED SCRIPT

File

scripts/seed.ts

Command

npm run seed

If collection empty

Insert 10 realistic prayer requests.

Examples

Praying for my O-Level examinations

My mother's surgery next week

Seeking employment opportunities

Family restoration

Spiritual growth

University acceptance

Financial breakthrough

Health recovery

Ministry outreach success

Direction for future career

Requirements

status = approved

isSeed = true

prayCount = realistic random value

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

# DEPLOYMENT

Deploy frontend to Vercel.

Deploy Functions to Firebase.

Provide

* Complete repository structure
* All source code
* Tailwind configuration
* shadcn setup
* Firestore rules
* Firebase Functions
* WhatsApp webhook
* Seed scripts
* setup.md deployment guide
* environment variable documentation

Everything must be mobile-first, production-ready, fully typed, optimized for performance, secure, scalable, and ready for real Adventist Youth ministry use.
