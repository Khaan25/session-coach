---
title: Privacy policy
description: What Session Coach collects, where it is kept, who processes it and how to delete it.
updated: "2026-10-31"
draft: true
---

Session Coach turns your Claude Code sessions into decision cards and asks you to explain them back on day 1, 3 and 7. This page says what that takes.

Session Coach is built and run by Zia Ur Rehman Khan and Kasam Thapa Magar for the 8x Playmakers trial. It is not run by a company. We are the people responsible for your data, and you can reach us at the email at the bottom of this page.

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

We replace:

- API keys and tokens with a known shape: JSON Web Tokens (including Supabase keys), `sk-` keys, GitHub tokens, Google API keys, and `Bearer` and `Basic` authorization headers.
- The value of any `NAME=value` line where the name contains KEY, TOKEN, SECRET or PASSWORD.
- Long runs of 32 or more letters and digits that look random. Git commit hashes are kept, because cards quote them as evidence.
- Email addresses.
- The username in home folder paths, such as `/Users/you/` or `/home/you/`.

A secret in a shape we don't know can get through. Check what your sessions contain before you send them.

## Where it is kept

Your data is stored in Supabase, in the ap-south-1 region (Mumbai). The app runs on Vercel.

## Who processes it

- **Supabase** stores your account, sessions, cards and answers, and sends sign-in and password emails.
- **Vercel** runs the web app and the daily reminder job.
- **A language model provider** reads a session log to write its cards, and reads your answer to score it. The server uses one of Google Gemini, OpenRouter or Groq.
- **Google Gemini (free tier), if used:** Google may use what is sent to it to improve its products. This is why we try to remove secrets before anything leaves your laptop; removal is not a guarantee.
- **Reminder emails** will be sent through Supabase's email service or a provider we name on this page before reminders start.

## How long we keep it

We keep your data while your account exists. When you delete your account, it is deleted from the live database at once. Database backups can keep a copy for up to 7 days after that, until they expire.

## Deleting your data

You can delete your account from your settings page. This deletes your sessions, their stored logs, your cards, answers and reviews, your CLI tokens, the record of emails we sent you, and your account.

If you can no longer sign in, the [delete account](/delete-account) page explains how to ask us to delete it.

## Contact

Email [kasamthapa89@gmail.com](mailto:kasamthapa89@gmail.com) with any question about your data.
