# First-run experience: findings and a kept idea (8 Nov 2026) - NOT approved, NOT released

Trigger: the owner's smart friend was confused when first opening the app. Owner rule (8 Nov, later): do not build anything until the owner gives the order; write ideas down. Also: the app has grown fast, so SIMPLE, UNDERSTANDABLE and REACHABLE FOR EVERYONE must be weighed against every addition.

## What a fresh install shows today (CONFIRMED by screenshot of the live build, 8 Nov)
After the language choice the person lands on an empty Home: a Safe to Spend box saying it "appears once this month's income has arrived", a month card with zeros, a "Get set up" list of four steps, and "Nothing recorded yet - Add first transaction - How it works". Three competing prompts, no explanation of what the app is for, "Safe to Spend" never explained, nothing says where to start.
(The default budget of 400 I first saw was test data, not a real fresh install: a fresh install starts with no budgets.)

## Idea that was drafted (code kept on local branch wip/first-run-welcome, commit f23c153, NOT pushed, 3 test checks still failing)
- Four welcome cards after the language choice: what the app is for; data stays on the phone; optional "add this month's income" (creates one editable salary entry); ready / take the tour or start. Skip on every card.
- A four-stop spotlight tour of Home (Safe to Spend, + button, tabs, Settings) that can be replayed from Settings.
- Stored as an optional `intro` field set only for a genuinely fresh install; existing users never see it.
- Open points before any release: tests that pass through the language chooser need updating; az/ru wording needs a native reader; and the big question below.

## The question the owner raised (to decide before building)
Is a 4-card welcome plus tour the SIMPLEST fix? Lighter options to compare: (a) no cards at all, only clean the empty Home to ONE clear first step ("Add your first income") with a one-line plain explanation of Safe to Spend; (b) one single welcome card; (c) the cards as drafted. Watch a real newcomer (the friend) use each before choosing. Success test: a stranger records their first entry in under a minute without help.
