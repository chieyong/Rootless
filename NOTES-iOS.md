# Honest notes about iOS

Things that are awkward or unreliable on an iPhone, and how this app deals
with them. Worth reading before Phase 2 and 3 add sound.

## Audio needs a tap first

Safari only lets audio start inside a user gesture. Tone.js will be started
from the first tap (`Tone.start()`), not on page load. Practically: the first
screen with sound will have a clear "start" button; without it the app would
silently produce nothing.

## The silent switch

This is the real trap. On an iPhone, a web page plays through the *ringer*
channel, so with the physical silent switch on you hear nothing at all - and
there is no API that tells us the switch is on. The plan for Phase 3: after the
first playback, show a dismissible hint ("no sound? check the silent switch on
the side of the phone"). Some apps work around this by playing through a
`<video>` element with `playsinline`, which is fragile; the hint is the honest
solution.

## Volume cannot be read or set

`GainNode` volume inside the app is fine, but the system volume cannot be read
or changed from a web page. If the ringer volume is low, playback is quiet.

## Background and interruptions

When the app goes to the background, or a phone call or another app takes over
audio, the audio context is suspended. It has to be resumed on the next tap.
Playback state must survive that, so the player will keep its position rather
than assuming it is still running.

## Piano samples cost bandwidth

A realistic piano (Salamander via `Tone.Sampler`) is several megabytes. The
plan: a small set of samples (one per minor third, `Tone.Sampler` interpolates
the rest), cached by the service worker after the first load so later sessions
work offline. First load on a mobile connection will be noticeably slower.

## Storage can be evicted

`localStorage` on iOS is wiped after around seven days without using the app,
unless the site is installed on the home screen and storage is persisted. So:
`navigator.storage.persist()` is requested at first start (Phase 4), and
progress can be exported as a JSON file. Do not rely on `localStorage` alone
for months of practice history.

## Home screen vs Safari

An installed PWA ("Add to Home Screen") is a separate storage context from
Safari: progress made in the browser does not carry over to the installed app.
Best to install first, then start practising.

## Layout

Portrait only, `viewport-fit=cover` with safe-area insets so nothing hides
behind the home indicator or the dynamic island. Tap targets are at least
44 px, and nothing depends on hover.
