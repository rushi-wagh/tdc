The Date Crew --- Matchmaker Dashboard
An internal matchmaking workspace built for The Date Crew (TDC)
assignment. It helps matchmakers review assigned customer profiles,
inspect compatibility recommendations, record call/meeting notes, and
understand why a candidate was recommended.
Project status: MVP implementation. The "Send Match" interaction
is a mock demonstration and does not send a real email.

Features
- Authentication: Username/password login using the backend
  authentication API and protected application routes.
- Assigned profiles: Dashboard for the logged-in matchmaker with
  search, filters, sorting, and pagination where supported.
- Profile details: Customer biodata grouped into personal details,
  location, education/career, family/background, and preferences.
  Missing values are shown neutrally rather than invented.
- Compatibility recommendations: Displays recommendations, scores,
  match-quality labels, and score breakdowns returned by the backend.
- AI match explanations: Requests a structured explanation for an
  existing recommendation, including summary, compatibility points,
  discussion points, and missing information. AI does not calculate or
  override the compatibility score.
- Call and meeting notes: Saves notes against a customer through
  the backend and displays note history, including note type, author,
  and timestamp when available. Notes do not automatically change
  preferences or scores.
- Mock Send Match flow: Shows a confirmation/demo interaction for
  a selected candidate. It does not deliver an actual email.
Technology
Frontend
- React
- JavaScript
- Vite (verify against the current frontend package.json)
- CSS and reusable UI components
Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT-based authentication
- NVIDIA NIM API using the OpenAI-compatible SDK for AI-generated candidate
  explanations
The frontend and backend are separate applications. Check each
application's package.json for exact scripts and dependency versions.
Matching approach
The backend owns candidate eligibility, scoring, recommendation
filtering, and ranking. The scoring model uses these dimensions:
  Dimension                    Weight
  Family goals                    25%
  Location and relocation         20%
  Values and life goals           20%
  Profession and education        15%
  Lifestyle                       10%
  Other factors                   10%
Current configured quality thresholds: - STRONG: score ≥ 60 -
POTENTIAL: score ≥ 40 and < 60 - Scores below 40 are excluded from
qualifying recommendations.
The engine applies eligibility checks such as excluding the customer's
own profile and considering opposite-gender candidates. ANY
preferences mean no preference. Missing information should be treated as
unknown rather than automatically counted as a mismatch.
The frontend presents backend results and does not independently
recalculate compatibility.
Data and access control
The seed dataset contains 100 fictional profiles (50 female and 50
male) distributed across three matchmakers. Profile access is scoped to
the authenticated matchmaker by the backend. Do not use real personal
data in the demo.
API areas
The backend uses versioned API routes. Main integration areas include:
  Purpose                             Route
  Login                               POST /api/v1/auth/login
  Read one assigned profile           GET /api/v1/profiles/:profileId
  Read a customer's notes             GET /api/v1/profiles/:profileId/notes
  Create a call/meeting note          POST /api/v1/profiles/:profileId/notes
  Get match suggestions               GET /api/v1/matches/:profileId/suggestions
  Explain a selected recommendation   GET /api/v1/matches/:profileId/suggestions/:candidateProfileId/explanation
Verify the exact dashboard/list route and response shapes in the current
route/controller files. Protected requests require the authentication
credential expected by the backend.
Example: create a note
POST /api/v1/profiles/PROF-0004/notes
Content-Type: application/json
Authorization: Bearer <token>
{
  "text": "Discussed preferred city and relocation flexibility.",
  "noteType": "CALL"
}
Supported note types are CALL and MEETING; note text is limited to
2,000 characters.
Environment configuration
Use the repository's .env.example files as the source of truth for
variable names. Never commit .env files, database credentials, JWT
secrets, or API keys.
Typical values for this architecture may include:
Backend
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
FRONTEND_URL=<your-frontend-origin>
NVIDIA_API_KEY=<your-nvidia-api-key>
Frontend
VITE_API_BASE_URL=<your-backend-api-base-url>
These names are illustrative. Retain the exact names expected by the
code. For Vite, browser-exposed environment variables must use the
VITE_ prefix. Never put server secrets in frontend variables.
Run locally
Run commands from the relevant application directory and use the scripts
defined in that directory's package.json.
1. Clone the repository.
2. Install dependencies in both backend and frontend directories.
3. Create local environment files based on .env.example.
4. Configure MongoDB and required secrets.
5. Start the backend using its available development script.
6. Start the frontend using its available development script.
7. Open the local frontend URL printed by the dev server and sign in
   with a seeded demo account.
Example commands (adjust directory names and scripts to match the
repository):
cd Backend
npm install
npm run dev
In a second terminal:
cd Frontend
npm install
npm run dev
If the project uses different directory or script names, follow the
actual repository structure and package.json scripts.
Assessment focus
This implementation demonstrates: - A React-based internal dashboard
integrated with a REST API. - Authenticated, matchmaker-scoped profile
access. - Backend-owned compatibility scoring with an explainable score
breakdown. - An NVIDIA NIM LLM used to explain recommendations without controlling
the scoring algorithm. - Persistent call/meeting notes. - A clearly
labeled mock match-send interaction.
