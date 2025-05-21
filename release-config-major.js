/**
 * Semantic Release configuration for major releases
 * This configuration forces all commits to be treated as major releases
 */
export default {
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer", {
      preset: "angular",
      releaseRules: [
        { type: "*", release: "major" }
      ]
    }],
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/github"
  ],
  dryRun: false,
  ci: false
};
