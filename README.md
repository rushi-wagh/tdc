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
Matching algorithm
The matching engine is deterministic and rule-based. It first builds an eligible candidate pool, then compares the customer's preferences with each candidate's profile, calculates an explainable score, and returns qualifying recommendations. The frontend displays the backend's results and does not calculate or change scores.
1. Candidate eligibility
- Only profiles assigned to the authenticated matchmaker can be accessed through the profile workflow.
- Recommendations exclude the customer's own profile.
- The candidate pool uses opposite-gender profiles for this assignment.
- Duplicate candidates should not appear more than once in a recommendation list.
- The backend applies the configured qualification thresholds before returning recommendations.
2. Gender-specific compatibility
The assignment calls for different compatibility considerations depending on the customer:
- Male customer: Evaluate whether the woman is younger, earns less, and is shorter than the male customer, along with compatibility on views about having children. These comparisons should be checked against the actual profile values and preference data; do not infer a value when it is missing.
- Female customer: Evaluate compatibility thoughtfully across profession and education, values and life goals, location and relocation preferences, family goals, and lifestyle. The implementation should not assume that every factor has the same importance for every customer.
The direction of the age, income, and height comparisons is intentional for the male-customer rule specified in the assignment. These criteria should not be silently generalized into identical hard rules for every customer type. Where a comparison is intended to be a hard eligibility rule, candidates that fail it should be excluded; where it is a weighted compatibility factor, it should affect the score instead. Keep this distinction explicit in the implementation and when explaining a recommendation.
3. Weighted score
The current scoring configuration distributes compatibility across these dimensions:
Dimension	Weight
Family goals	25%
Location and relocation	20%
Values and life goals	20%
Profession and education	15%
Lifestyle	10%
Other factors	10%
Total	100%


The engine compares available profile data and preferences within these dimensions and provides a score breakdown so the matchmaker can understand the result.
4. Match-quality thresholds
The current configured thresholds are:
- STRONG: score ≥ 60
- POTENTIAL: score ≥ 40 and < 60
- Below 40: excluded from qualifying recommendations.
These thresholds are applied by the backend. The frontend must not independently recalculate the score, alter ranking, or promote a candidate that the backend filtered out.
5. Preferences and missing information
- ANY means the customer has no specific preference for that field; it should not create a mismatch.
- Missing or unknown data is not automatically a negative match. The engine should distinguish a confirmed incompatibility from information that has not been provided.
- Sensitive fields such as religion and caste should be evaluated only when relevant preferences and data are explicitly available; missing values must not be treated as incompatibilities by default.
- Views on children and other Yes/No/Maybe preferences should be compared using the actual stored values rather than guessed.
- The score breakdown and AI explanation should agree with the same underlying comparisons.
6. AI's role
NVIDIA NIM is used to generate a structured explanation for a recommendation that the deterministic engine has already produced. The explanation can include a summary, compatibility points, discussion points, and missing information.
AI does not determine candidate eligibility, calculate the compatibility score, change thresholds, or reorder recommendations. If the AI service is unavailable or returns an invalid response, the recommendation and its backend-generated score should remain available without a fabricated explanation.
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
