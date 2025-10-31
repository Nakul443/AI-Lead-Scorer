# LIVE LINK : https://kuvaka-assignment-9cvz.onrender.com

# Lead Scoring Pipeline

TypeScript + Express server with AI-powered lead scoring using rule-based and AI layers. Accepts offer details, processes CSV leads, and provides intent scoring.

## Prerequisites
- Node.js 18+ (tested with Node 24)
- npm 9+
- Gemini API key (Google AI)

## Setup

### Option 1: Docker (Recommended)

#### 1. Prerequisites
- Docker and Docker Compose installed
- Gemini API key

#### 2. Environment Configuration
Copy the example environment file:
```bash
cp env.example .env
```

Edit `.env` and add your Gemini API key:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

#### 3. Build and Run with Docker
```bash
# Build and start the application
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

**Access the application:**
- Direct: http://localhost:3000
- With nginx (production): http://localhost:80

#### 4. Production Deployment with Nginx
```bash
# Start with nginx reverse proxy
docker-compose --profile production up --build -d
```

### Option 2: Local Development

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Environment Configuration
Create `.env` file in project root:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

#### 3. Start Server
```bash
npm run start
# Server: http://localhost:3000
```

## Scripts

### Local Development
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — build then run `node dist/index.js`

### Docker Commands
```bash
# Build Docker image
docker build -t kuvaka-assignment .

# Run container
docker run -p 3000:3000 --env-file .env kuvaka-assignment

# Run with Docker Compose
docker-compose up --build

# Stop and remove containers
docker-compose down

# View container logs
docker-compose logs -f kuvaka-app

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v
```

## API Workflow (Proper Order)

### Step 1: Input APIs

#### POST /offer
Submit your product/offer details first.

**Request:**
```bash
curl -X POST http://localhost:3000/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings"],
    "ideal_use_cases": ["B2B SaaS mid-market"]
  }'
```

**Response (201):**
```json
{
  "message": "Offer received successfully",
  "offer": {
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings"],
    "ideal_use_cases": ["B2B SaaS mid-market"]
  }
}
```

#### POST /leads/upload
Upload CSV with lead data.

**CSV Format (leads.csv):**
```csv
name,role,company,industry,location,linkedin_bio
Jane Doe,Head of Sales,Acme Inc,Manufacturing,NYC,"15 years in B2B sales"
John Smith,CTO,TechCo,SaaS,Austin,"Built ML platform at scale"
```

**Request:**
```bash
curl -X POST http://localhost:3000/leads/upload \
  -H "Accept: application/json" \
  -F "file=@./leads.csv;type=text/csv"
```

**Response (200):**
```json
{
  "message": "CSV file processed successfully",
  "leads": [
    {
      "name": "Jane Doe",
      "role": "Head of Sales",
      "company": "Acme Inc",
      "industry": "Manufacturing",
      "location": "NYC",
      "linkedin_bio": "15 years in B2B sales"
    }
  ]
}
```

### Step 2: Scoring Pipeline

#### POST /score
Run scoring on uploaded leads using hybrid rule-based + AI approach.

**Request:**
```bash
curl -X POST http://localhost:3000/score
```

**Response (200):**
```json
[
  {
    "name": "Jane Doe",
    "role": "Head of Sales",
    "company": "Acme Inc",
    "intent": "High",
    "score": 85,
    "reasoning": "Role is decision maker with relevant industry experience."
  }
]
```

### Step 3: Output APIs

#### GET /results
Retrieve scored results.

**Request:**
```bash
curl http://localhost:3000/results
```

#### GET /results/export
Download results as CSV.

**Request:**
```bash
curl http://localhost:3000/results/export -o results.csv
```

## Scoring Logic

### Rule Layer (Max 50 points)

1. **Role Relevance:**
   - Decision maker (chief/head/director/vp): +20 points
   - Influencer (manager/lead/senior): +10 points
   - Others: +0 points

2. **Industry Match:**
   - Exact ICP match (saas/software/tech): +20 points
   - Adjacent (marketing/consulting/services): +10 points
   - Outside ICP: +0 points

3. **Data Completeness:**
   - All fields present: +10 points
   - Missing fields: +0 points

### AI Layer (Max 50 points)

**Prompt sent to Gemini:**
```
You are a lead scoring AI assistant. Given a lead's details and an offer, score the lead's intent to purchase the offer on a scale of 0-100. 
Provide reasoning for the score based on the lead's role, company, industry, location, and LinkedIn bio.

Lead Details:
Name: {lead.name}
Role: {lead.role}
Company: {lead.company}
Industry: {lead.industry}
Location: {lead.location}
LinkedIn Bio: {lead.linkedin_bio}

Offer Details:
Name: {offer.name}
Value Propositions: {offer.value_props.join(", ")}
Ideal Use Cases: {offer.ideal_use_cases.join(", ")}

Return the result in JSON format with intent (High|Medium|Low), score (0-100), and reasoning.
```

**AI Score Mapping:**
- High intent → 50 points
- Medium intent → 30 points
- Low intent → 10 points

### Final Score Calculation
```
Final Score = Rule Score + AI Points
Intent = AI-determined (High/Medium/Low)
```

## Project Structure
```
src/
  index.ts          # Express app, routes, and scoring logic
dist/               # Compiled JavaScript
uploads/            # Temporary CSV storage
.env                # Environment variables
```

## Error Handling
- Missing offer details: 400 error on `/score`
- No leads uploaded: 400 error on `/score`
- Invalid CSV format: 500 error on `/leads/upload`
- AI API failures: Fallback to rule-based scoring
