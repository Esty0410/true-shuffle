# eque

A Spotify companion app that fixes shuffle — built with vanilla JavaScript, inspired by an iPod Nano.

🔗 **Live app:** https://esty0410.github.io/true-shuffle/

---

## Why I built this

I drive long distances a lot, and Spotify kept playing the same songs twice before I'd heard the full playlist. It drove me crazy.

It made me think about my old iPod Nano — a dark green one, a gift from my uncle, practically an extra limb. I missed it. What I missed most was how it worked: every song played exactly once before anything repeated. Simple, fair, satisfying.

So I built Eque. It does what Spotify's shuffle should do, wrapped in an interface inspired by the iPod Nano. And since I'm working toward becoming a software developer, it made sense to build something real and useful rather than just tutorial projects.

I built this with Claude as my teacher and mentor — explaining every concept, walking me through every line of code, and correcting my English along the way. I didn't just copy and paste. I learned why everything works the way it does. Building Eque was also a way for me to practice working with AI and prompting — something I want to get better at because it's part of the future I'm working toward.

The name comes from my name Esty + queue.

---

## What it does

- **True shuffle** using the Fisher-Yates algorithm — every song plays exactly once before repeating
- **Three-screen iPod-style navigation** — playlists → queue → now playing
- **Shuffle on demand** — browse your playlist first, then shuffle when you're ready
- **Drag to reorder** — rearrange songs in the queue by dragging
- **Current playlist panel** — see and reorder the playing queue from the now playing screen
- **Mini player** — control playback from the playlist and queue screens without leaving
- **Auto-advance** — automatically plays the next song when the current one ends
- **Dark and light mode** toggle
- **Progress bar** with click to seek and drag to seek

---

## Tech stack

- Pure HTML, CSS, and vanilla JavaScript — no frameworks
- Spotify Web API with PKCE OAuth authentication
- Fisher-Yates shuffle algorithm
- Font Awesome icons
- Inter font
- Hosted on GitHub Pages

---

## How to run locally

1. Clone the repo
2. Open in VS Code with the Live Server extension
3. Run on `http://127.0.0.1:5500/index.html`
4. Connect your Spotify account

> Note: the app is in Spotify development mode, which allows up to 25 users. If you'd like access, contact me to be added.

---

## Known limitations

- **Spotify must be active** — the Spotify API requires an active playback session before the app can control it. Open Spotify on your device and play something first, then use Eque to control it.
- **OAuth connects in two steps** — after clicking Connect, Spotify redirects back to the app and completes the token exchange. This is normal OAuth behavior, not a bug.
- **Background tab** — browsers throttle JavaScript when the tab is in the background. The app catches up and advances to the next song when you return to the tab.
- **Token expiry** — if the app stops working, clear localStorage and reconnect. Token refresh is not yet implemented.

---

## A note on the queue

Eque manages its own queue instead of relying on Spotify's skip controls. This was a deliberate decision — Spotify's skip API had inconsistent behavior, and managing the queue internally gives Eque full control over the true shuffle order.

I kept it simple first, and I know how to scale it.

---

## Built by

Esty — working toward MBO 4 Software Development, future HBO student with a focus on AI and cybersecurity.

[GitHub](https://github.com/Esty0410) · [LinkedIn](https://www.linkedin.com/in/esty-willemsen-403460174/)
