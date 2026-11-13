# MY DIU — Permanent Project Rules

These rules govern future MY DIU implementation work.

## Product

- Project: MY DIU — Your City. Your Everything.
- Primary location: Diu, Gujarat, India.
- Target domain: `mydiu.com`.
- Platforms: responsive website, Android and iOS.
- Languages: English, Gujarati and Hindi.
- Architecture: centralized backend/shared database and multi-city ready.
- Launch scope: all approved modules in one coordinated launch.

## Commerce and fulfilment

- Payments are online only.
- COD and Pay at Store are prohibited.
- Payment success must be verified server-side; never fake payment success.
- Use integer paise and never store card details or UPI PINs.
- Support both MY DIU delivery-partner fulfilment and vendor-managed delivery.
- Never fake live GPS or delivery availability.

## Engineering

- Inspect before editing and preserve useful existing functionality.
- Keep category business logic independent; do not create one generic booking engine.
- Use Next.js/React/TypeScript, React Native, NestJS, PostgreSQL/Prisma, Redis and REST where compatible with the existing stack.
- Add validation, authorization, loading/success/error states and relevant tests.
- Do not claim an integration or test passed unless it was actually verified.
- Treat prototypes and demo data as references, never as production functionality.
- Maintain `DEVELOPMENT_STATUS.md`, `documentation/ARCHITECTURE.md`, `documentation/API_DOCUMENTATION.md` and `documentation/TESTING_REPORT.md`.

## Safety and delivery

- Obtain approval before destructive commands, database resets, dependency removals, large refactors or deployments.
- Do not expose secrets.
- End implementation reports with inspected files, changed files, implemented functionality, API/database changes, commands, tests/results, blockers and the exact next task.
