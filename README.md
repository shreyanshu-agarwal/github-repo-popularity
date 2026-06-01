# GitHub Popularity Ranker

A production-ready full-stack application that searches, ranks, and analyzes GitHub repositories based on a custom logarithmic popularity score with exponential decay.

---

## 🚀 1. Architecture Overview
This application uses a unified, full-stack monorepo layout powered by React for the frontend and Express (running under `tsx` in development, compiled to single CJS file with `esbuild` for production) on the backend.

```text
├── .env.example              # Configuration prototype containing expected environment variables
├── README.md                 # System documentation, scoring formulas, and reference guide
├── package.json              # Dependencies list and full-stack development/production scripts
├── server.ts                 # Full-stack server entry point (Express API routes & Vite dev server middleware)
├── tsconfig.json             # TypeScript compiler configurations for client and server-side code
├── vite.config.ts            # Vite bundler configuration utilizing TypeScript and React plugins
├── server/
│   ├── github.ts             # Resilient GitHub search client (in-memory caching, rate limit tracking, retry routines)
│   ├── logging.ts            # Standardized Winston logger with request correlation IDs and file tracing
│   ├── run-tests.ts          # Server/test CLI script for bootstrapping and executing diagnostic suites
│   ├── scoring.ts            # Logarithmic popularity rating & decay formula execution engine
│   └── tests.ts              # Self-contained unit & mock integration test cases for server routers and cache controllers
└── src/
    ├── App.tsx               # Primary React component driving the main page layout, tabs, query states, and dialogs
    ├── index.css             # Main stylesheet defining global typography standards & CSS rules
    ├── main.tsx              # Standard client entry point bootstrapping materials to DOM tree targets
    ├── types.ts              # Central repository of shared TypeScript interfaces and scoring structures
    └── components/
        ├── DiagnosticDashboard.tsx # Test suites triggering console to execute self-contained diagnostics
        ├── ErrorBoundary.tsx   # React React Error boundary catcher rendering localized fallback screen
        ├── FilterPanel.tsx     # Clean triggers representing popular language selectors and calendar parameters
        ├── RepositoryList.tsx  # Interactive list layout with custom metrics, score widgets, and formula icons
        ├── ScoringGuide.tsx    # Elegant mathematical walkthrough of the algorithmic weighting mechanics
        └── StatsBanner.tsx     # High-density server info display monitoring quotas and caching states
```

### Flow of Data
1. **Request:** The user filters by language or date, which updates the state.
2. **Controller Query:** A client-side fetch invokes `/api/repositories` with query parameters.
3. **Route Handler:** The server checks an in-memory cache map first. On a hit, it returns the data in under 5ms.
4. **Integration Query:** On a miss, the server attempts a negotiated, authenticated or anonymous GET to the GitHub Search API.
5. **Score Pipeline:** The returned repository metrics (stars, forks, updatedAt) are run through the rating algorithm in `scoring.ts` to compute a popularity score.
6. **Robust Error Handling:** If the GitHub API fails or limits are exceeded, the UI handles the error gracefully by retaining its active state and displaying a clear, interactive error popup modal with helpful retry triggers.

---

## 🎨 2. Technology Choices & Justification
- **React (v19) + Vite:** Provides instant hot reloading, fast compilation, and lightweight mounting.
- **Node.js (TypeScript) + Express:** Minimizes backend boilerplate while keeping the exact same TypeScript compiler typing and type safety models shared with the frontend.
- **esbuild:** Bundles the TypeScript server into a self-contained CJS bundle in production, avoiding ES Module Relative resolve mismatches and increasing cold start speed.
- **Material UI:** Uses `@mui/material` for consistent component styling and theming across the frontend.
- **MUI Icons:** Uses `@mui/icons-material` for a consistent icon set alongside Material UI components.

---

## 📊 3. Popularity Score Mechanics
### The Formula
$$\text{Raw Score} = 0.6 \log_{10}(\text{stars} + 1) + 0.3 \log_{10}(\text{forks} + 1) + 0.1 e^{-\frac{\text{days since update}}{90}}$$

$$\text{Final Normal Score} = \min(100.0, \text{Raw Score} \times 22.0)$$

### Justification of Coefficients
1. **Stars (60%):** Represents general developer validation and trust. It carries the highest coefficient because stars denote the broadest market signal.
2. **Forks (30%):** Indicates operational utility. Developers fork repositories when they intend to extend, patch, or run the code directly.
3. **Recency Factor (10% with 90-day decay delay):** Prevents stale, abandoned, or archive-only repositories from permanently dominating rankings. A decay value of 90 days fits natural active maintenance cycles.

### Advantages & Tradeoffs
- **Advantage:** Logarithmic scaling preserves parity. A repository with 100,000 stars does not completely eclipse a vibrant new library with 2,000 stars because $\log_{10}$ dampens extreme values.
- **Tradeoff:** Minimal edge cases exist where stable, "finished" packages with no commits in 2 years receive a recency decay penalty despite being structurally flawless.

---

## 🪵 4. Environment Variables
Create a root level `.env` file (copied from `.env.example` in production):

```env
# Optional: Add a GitHub personal access token to raise rate limits to 5000 req/hr
GITHUB_TOKEN="your_github_token"
```

---

## 🛠️ 5. Local Setup & Testing
To install dependencies and start the app locally:

```bash
# Install package dependencies
npm install

# Start the full-stack server and Hot-Reload client
npm run dev

# Run full-production compiler validations
npm run build && npm run start
```

### Running unit and API contract tests:
The application includes a fully automated unit and API capability check which you can run programmatically by invoking the diagnostic URL or from the Test Suite UI in the App:
```bash
curl http://localhost:3000/api/tests/run
```

---

## 📨 6. Example API Payload

### Request
`GET /repositories?language=typescript&createdAfter=2023-01-01&page=1&perPage=1`

### Response
```json
[
  {
    "id": 123456,
    "name": "vscode",
    "fullName": "microsoft/vscode",
    "description": "Visual Studio Code - Code editing. Redefined.",
    "stars": 162000,
    "forks": 28500,
    "updatedAt": "2026-05-30T10:00:00Z",
    "score": 98.7,
    "breakdown": {
      "starsScore": 5.21,
      "forksScore": 4.45,
      "recencyFactor": 0.99
    },
    "url": "https://github.com/microsoft/vscode",
    "ownerAvatarUrl": "https://avatars.githubusercontent.com/u/6154722?v=4"
  }
]
```
