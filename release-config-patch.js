/**
 * Semantic Release configuration for patch releases
 * This configuration forces all commits to be treated as patch releases
 */
export default {
  branches: [
    {name: "main"},
    {name: "release/v1.0.2", channel: "release-v1.0.2"}
  ],
  plugins: [
    ["@semantic-release/commit-analyzer", {
      preset: "angular",
      releaseRules: [
        { type: "*", release: "patch" }
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
