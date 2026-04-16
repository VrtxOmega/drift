# CONTRIBUTING

## Standards

All contributions to DRIFT must conform to the VERITAS & Sovereign Ecosystem doctrines:

- **Local-first:** Changes must not introduce cloud dependencies, telemetry, or third-party data transmission beyond the declared GitHub API integration.
- **Deterministic:** UI and data behavior must be predictable and reproducible given the same input state.
- **Zero-telemetry:** No analytics, crash reporting, or usage tracking may be added.

## Process

1. **Fork** the repository and create a branch from `main`.
2. **Implement** your change. Ensure the dev server runs cleanly (`npm run dev`) and the production build succeeds (`npm run build`).
3. **Document** any new configuration parameters in the README `CONFIGURATION` table.
4. **Open a Pull Request** with a concise description of what changed and why.

## Commit Style

Use imperative, present-tense commit messages:

```
Add time-range filter to scrubber component
Fix camera drift on low-framerate devices
Update README architecture diagram
```

## Reporting Issues

Open a GitHub Issue with:
- A clear, single-sentence title
- Reproduction steps (browser, OS, GitHub token scope used)
- Expected vs. actual behavior

## License

By contributing, you agree that your contributions are licensed under the MIT License as stated in [LICENSE](LICENSE).
