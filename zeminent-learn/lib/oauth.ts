import "server-only";
import { Google, GitHub } from "arctic";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Providers are built lazily (memoised) instead of at module load. Constructing
// them eagerly threw `<VAR> is not set` the moment this module was imported,
// which broke `next build` — page-data collection imports the OAuth routes
// without any runtime env present. Reading env only on first use defers the
// check to request time, where the vars actually exist.
let _google: Google | undefined;
export function getGoogle(): Google {
  if (!_google) {
    _google = new Google(
      required("GOOGLE_CLIENT_ID"),
      required("GOOGLE_CLIENT_SECRET"),
      required("GOOGLE_REDIRECT_URI"),
    );
  }
  return _google;
}

let _github: GitHub | undefined;
export function getGitHub(): GitHub {
  if (!_github) {
    _github = new GitHub(
      required("GITHUB_CLIENT_ID"),
      required("GITHUB_CLIENT_SECRET"),
      required("GITHUB_REDIRECT_URI"),
    );
  }
  return _github;
}
