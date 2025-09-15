### Kuvaka Assignment

TypeScript + Express server exposing two APIs: `POST /offer` and `POST /leads/upload`.

### Prerequisites
- Node.js 18+ (tested with Node 24)
- npm 9+

### Setup
```bash
npm install
npm run start
# Server: http://localhost:3000
```

### Scripts
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — build then run `node dist/index.js`

### APIs
#### POST /offer
Body example:
```json
{
  "name": "AI Outreach Automation",
  "value_props": ["24/7 outreach", "6x more meetings"],
  "ideal_use_cases": ["B2B SaaS mid-market"]
}
```
Returns 201 with the normalized offer.

#### POST /leads/upload
Accepts CSV via form field `file` with columns:
`name,role,company,industry,location,linkedin_bio`.
Upload example:
```bash
curl -X POST http://localhost:3000/leads/upload \
  -H "Accept: application/json" \
  -F "file=@./leads.csv;type=text/csv"
```

