# Cloud environment notes

- Network is allow-listed. When a needed host is refused (reference site, DistroKid, Stripe Checkout), call `get_environment`, then propose the exact hosts with `update_environment` (or `create_environment` with `switch_session: "network_only"` if the session is on the Default environment). One sentence of why before the call.
- API keys: `request_credential` (secure form; proxy injects the header). Code that needs a key variable gets a placeholder like `proxy-injected`.
- GitHub push 403 = the Claude GitHub App isn't installed / account not linked: point the user to https://claude.ai/connect-github and retry after they fix it.
- `report_preview_port` may be unavailable; the user can't open `localhost` — use Artifacts for previews.
- Changes to the environment persist for future sessions; mention them in the final report.
