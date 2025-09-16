# Kuvaka Assignment - API Documentation

## Overview
This API provides a lead scoring pipeline that combines rule-based scoring with AI-powered analysis. The system accepts offer details, processes CSV lead data, and returns scored results with intent classification.

**Base URL:** `http://localhost:3000`

---

## API Endpoints

### 1. POST /offer
Submit product/offer details for lead scoring context.

**Endpoint:** `POST /offer`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "AI Outreach Automation",
  "value_props": ["24/7 outreach", "6x more meetings"],
  "ideal_use_cases": ["B2B SaaS mid-market"]
}
```

**Request Body Schema:**
- `name` (string, required): Product/service name
- `value_props` (array of strings, required): Value propositions
- `ideal_use_cases` (array of strings, required): Target use cases

**Response (Success - 201):**
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

**Response (Error - 400):**
```json
{
  "error": "name is required and must be a string"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings"],
    "ideal_use_cases": ["B2B SaaS mid-market"]
  }'
```

---

### 2. POST /leads/upload
Upload CSV file containing lead data for scoring.

**Endpoint:** `POST /leads/upload`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (file, required): CSV file with lead data

**CSV Format Requirements:**
- File type: CSV (.csv)
- Required columns: `name,role,company,industry,location,linkedin_bio`
- Headers must match exactly (case-sensitive)

**Sample CSV Content:**
```csv
name,role,company,industry,location,linkedin_bio
Jane Doe,Head of Sales,Acme Inc,Manufacturing,NYC,"15 years in B2B sales"
John Smith,CTO,TechCo,SaaS,Austin,"Built ML platform at scale"
Ava Patel,VP Marketing,FlowMetrics,Technology,San Francisco,"Growth expert with 10+ years experience"
```

**Response (Success - 200):**
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
    },
    {
      "name": "John Smith",
      "role": "CTO",
      "company": "TechCo",
      "industry": "SaaS",
      "location": "Austin",
      "linkedin_bio": "Built ML platform at scale"
    }
  ]
}
```

**Response (Error - 400):**
```json
{
  "error": "No file uploaded"
}
```

**Response (Error - 500):**
```json
{
  "error": "Error parsing CSV file",
  "details": "Invalid CSV format"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/leads/upload \
  -H "Accept: application/json" \
  -F "file=@./leads.csv;type=text/csv"
```

---

### 3. POST /score
Execute scoring algorithm on uploaded leads using hybrid rule-based + AI approach.

**Endpoint:** `POST /score`

**Content-Type:** `application/json`

**Request Body:** None (uses previously uploaded offer and leads data)

**Response (Success - 200):**
```json
[
  {
    "name": "Jane Doe",
    "role": "Head of Sales",
    "company": "Acme Inc",
    "intent": "High",
    "score": 85,
    "reasoning": "Role is decision maker with relevant industry experience and strong LinkedIn presence."
  },
  {
    "name": "John Smith",
    "role": "CTO",
    "company": "TechCo",
    "intent": "High",
    "score": 90,
    "reasoning": "Perfect ICP match with technical background and decision-making authority."
  },
  {
    "name": "Ava Patel",
    "role": "VP Marketing",
    "company": "FlowMetrics",
    "intent": "Medium",
    "score": 65,
    "reasoning": "Good role match but company size may not align with ideal customer profile."
  }
]
```

**Response Schema:**
- `name` (string): Lead name
- `role` (string): Lead job role
- `company` (string): Company name
- `intent` (string): Intent classification ("High", "Medium", "Low")
- `score` (number): Final score (0-100)
- `reasoning` (string): AI-generated explanation for the score

**Response (Error - 400):**
```json
{
  "error": "No leads uploaded to score. Upload CSV first"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/score
```

---

### 4. GET /results
Retrieve previously scored results.

**Endpoint:** `GET /results`

**Content-Type:** `application/json`

**Response (Success - 200):**
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

**Response (No Data - 200):**
```json
[]
```

**cURL Example:**
```bash
curl http://localhost:3000/results
```

---

### 5. GET /results/export
Download scored results as CSV file.

**Endpoint:** `GET /results/export`

**Response (Success - 200):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="results.csv"`

**CSV Output Format:**
```csv
name,role,company,intent,score,reasoning
Jane Doe,Head of Sales,Acme Inc,High,85,"Role is decision maker with relevant industry experience."
John Smith,CTO,TechCo,High,90,"Perfect ICP match with technical background."
Ava Patel,VP Marketing,FlowMetrics,Medium,65,"Good role match but company size concerns."
```

**Response (Error - 500):**
```json
{
  "error": "Error exporting results"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/results/export -o results.csv
```

---

## Scoring Algorithm

### Rule-Based Scoring (Max 50 points)

**1. Role Relevance (0-20 points):**
- Decision Maker (chief, head, director, vp): +20 points
- Influencer (manager, lead, senior): +10 points
- Others: +0 points

**2. Industry Match (0-20 points):**
- Exact ICP Match (saas, software, tech): +20 points
- Adjacent (marketing, consulting, services): +10 points
- Outside ICP: +0 points

**3. Data Completeness (0-10 points):**
- All fields present: +10 points
- Missing fields: +0 points

### AI-Based Scoring (Max 50 points)

**AI Provider:** Google Gemini 2.0 Flash

**Prompt Template:**
```
You are a lead scoring AI assistant. Given a lead's details and an offer, score the lead's intent to purchase the offer on a scale of 0-100. 
Provide reasoning for the score based on the lead's role, company, industry, location, and LinkedIn bio.

Lead Details:
Name: {name}
Role: {role}
Company: {company}
Industry: {industry}
Location: {location}
LinkedIn Bio: {linkedin_bio}

Offer Details:
Name: {offer_name}
Value Propositions: {value_props}
Ideal Use Cases: {ideal_use_cases}

Return the result in JSON format with intent (High|Medium|Low), score (0-100), and reasoning.
```

**AI Score Mapping:**
- High Intent: 50 points
- Medium Intent: 30 points
- Low Intent: 10 points

### Final Score Calculation
```
Final Score = Rule Score + AI Score (0-100)
Intent Classification = AI-determined (High/Medium/Low)
```

---

## Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Missing required fields, invalid data types |
| 500 | Internal Server Error | CSV parsing errors, AI API failures |

---

## Complete Workflow Example

**Step 1: Submit Offer**
```bash
curl -X POST http://localhost:3000/offer \
  -H "Content-Type: application/json" \
  -d '{"name": "AI Outreach Automation", "value_props": ["24/7 outreach"], "ideal_use_cases": ["B2B SaaS"]}'
```

**Step 2: Upload Leads**
```bash
curl -X POST http://localhost:3000/leads/upload \
  -F "file=@leads.csv;type=text/csv"
```

**Step 3: Score Leads**
```bash
curl -X POST http://localhost:3000/score
```

**Step 4: Get Results**
```bash
curl http://localhost:3000/results
```

**Step 5: Export Results**
```bash
curl http://localhost:3000/results/export -o results.csv
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI API key for scoring | Yes |
| `PORT` | Server port (default: 3000) | No |

---

## Rate Limits & Performance

- No rate limits currently implemented
- AI scoring may take 2-5 seconds per lead
- Recommended batch size: 100 leads or less per upload
- CSV file size limit: 10MB

---

## Troubleshooting

**Common Issues:**

1. **"No leads uploaded to score"**
   - Ensure CSV was uploaded successfully via `/leads/upload`
   - Check that offer was submitted via `/offer`

2. **"Invalid file type"**
   - Upload only CSV files
   - Ensure file has correct MIME type

3. **"Error during AI scoring"**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API key permissions and quotas

4. **Empty results array**
   - Ensure leads were uploaded and scored successfully
   - Check server logs for error details
