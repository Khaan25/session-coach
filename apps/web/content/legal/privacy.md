---
title: Privacy policy
description: What Session Coach collects, where it is kept, who processes it and how to delete it.
updated: "2026-10-29"
draft: true
---

Session Coach turns your Claude Code sessions into decision cards and asks you to explain them back on day 1, 3 and 7. This page says what that takes.

TODO(zia): the legal entity that runs Session Coach and its address.

## What we collect

- **Your account:** your name, your email address, your profile picture if your sign-in provider has one, and how you signed in (email and password, or Google).
- **Your sessions:** the log of each Claude Code session you send, after secrets are removed (see below), with its title, repository name, branch, start time and length.
- **Your cards:** the 3 to 5 decision cards made from each session, with the quotes from the session that back them.
- **Your answers:** what you write when you explain a card back, its score (0, 1 or 2) and your review schedule.
- **Your settings:** your time zone and whether you want reminder emails.
- **Your CLI tokens:** a fingerprint (hash) of each token you create for the command-line tool, its label and when it was last used. The token itself is never stored.
- **Emails we send you:** a record of each email we send you, its kind and the day it was sent, so the same email is never sent twice.

## What we try to remove

We try to remove secrets from a session log twice: on your laptop before it is sent, and again on our server before it is stored. Thinking blocks and attachments from the session are dropped and not stored.

TODO(zia): the list of patterns treated as secrets, once the redaction rules are final.

## Where it is kept

Your data is stored in Supabase, in the ap-south-1 region (Mumbai). The app runs on Vercel.

## Who processes it

- **Supabase** stores your account, sessions, cards and answers.
- **Vercel** runs the web app and the daily reminder job.
- **A language model provider** reads a session log to write its cards, and reads your answer to score it. Model names are configured on the server.
- **Google Gemini (free tier), if used:** Google may use what is sent to it to improve its products. This is why secrets are removed before anything leaves your laptop.
- **An email provider** sends the daily reminder, if you turned reminders on.

TODO(zia): name the model providers and the email provider once they are chosen.

## How long we keep it

We keep your data while your account exists.

TODO(zia): how long backups keep data after an account is deleted.

## Deleting your data

You can delete your account from your settings page. This deletes your sessions, their stored logs, your cards, answers and reviews, your CLI tokens, the record of emails we sent you, and your account.

TODO(zia): the settings page and a delete-account page for people who cannot sign in (Phase 8).

## Contact

TODO(zia): the contact email for privacy questions.
