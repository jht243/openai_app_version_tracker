export const DEFAULT_READ_ONLY_ASSESSMENT =
  "Read Only is true because the tool only computes and returns the calculator widget/results; it doesn't change user data, files, or accounts (server logs are internal).";

export const DEFAULT_OPEN_WORLD_ASSESSMENT =
  "Open World is false because the tool doesn't fetch arbitrary internet content; any external requests are to fixed, pre-approved endpoints, not user-directed browsing.";

export const DEFAULT_DESTRUCTIVE_ASSESSMENT =
  "Destructive is no because the tool can't delete/overwrite data or perform irreversible actions; it just produces calculations and a UI that can be adjusted or refreshed.";
