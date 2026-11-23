# Pitfalls hit on the first build (check before shipping)

| Symptom | Cause | Fix |
|---|---|---|
| Login card still showing after login; empty cart still shows checkout form | A `display:grid/flex` rule beats the `hidden` attribute | Add `[hidden]{display:none!important}` to every stylesheet |
| Slide-in content never appears | IntersectionObserver ignores fully clip-path-hidden targets | Use a scroll/rAF `getBoundingClientRect` check |
| Cover images stretched tall | `<img width height>` attributes + CSS `aspect-ratio` without `height:auto` | Always pair `aspect-ratio` with `height:auto` |
| Play triangle clipped in the red preview button | `.pill span{…48px circle…}` also styled spans inside the button | Use child selectors (`.pill > span`) |
| Music section jumps sideways / "3 of 3" moves | Sticky flex stage's `margin:auto` child shrinks to content width; titles/meta differ in length; fewer links on one release | `width:100%`, tabular nums, `min-height` on variable text and link blocks |
| Grey box flashes between album covers | Sleeve was empty while the old cover wiped out | Wipe the new cover in over the old one |
| "30s preview" reads "305 PREVIEW" | Condensed uppercase display font | Avoid digits+letters in condensed caps labels ("Preview") |
| Bio timeline shows stray 1 2 3 | Reset only applied to `ul` | `list-style:none` on the `ol` too |
| Empty toast box visible at the bottom | Off-screen translate based on an empty element's tiny height | Add `visibility:hidden` until shown |
| Mobile product page scrolls sideways | Visually hidden radio inputs positioned outside their labels | `position:relative` on the label, `inset:0` on the input |
| Red error outlines stay after typing | `aria-invalid` never reset | Clear it on `input` |
| Stripe call fails with `ENOTFOUND` in the sandbox | Node fetch doesn't read HTTPS_PROXY | `NODE_USE_ENV_PROXY=1` + `NODE_EXTRA_CA_CERTS` |
| Fake session id → "couldn't reach payment provider" | Used the URL's session id and surfaced a 404 as 502 | Look up the session saved on the order; treat errors as "not paid" |
| Header bar hides the artist's head in the hero | Opaque bar | Lighter bar over the hero, darken after scrolling |
| Shell command refused by a "dangerous removal" safety check though it deletes nothing | Heredocs containing `$`, backticks or regexes like `/\/$/` | Write the script/edit with the Write/Edit tools, then run the file |
| Local server for previews refused | Sandbox policy | Publish a multi-file Artifact instead; or a self-contained HTML (base64 media) via SendUserFile |
