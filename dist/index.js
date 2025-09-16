"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer")); // Multer is a node.js middleware for handling multipart/form-data,
// which is used for uploading files
const csv_parser_1 = __importDefault(require("csv-parser")); // for parsing CSV files
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// fs and path used to read the file and delete after processing
const json2csv_1 = require("json2csv"); // for converting JSON to CSV
const dotenv_1 = __importDefault(require("dotenv"));
const genai_1 = require("@google/genai");
dotenv_1.default.config(); // Load environment variables from .env file
const genai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Hello from TypeScript + Express');
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
// configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: 'uploads/', // for temporary storage of the uploaded file
    // fileFileter rejects files that are not CSV
    // so the API does not accept PDFs, images, or other file types
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    }
});
// variables
let offerDetails = {
    name: '',
    value_props: [],
    ideal_use_cases: []
}; // to store the offer details
let uploadedLeads = []; // to store uploaded leads
// post API - to accept the offer from the client
app.post('/offer', async (req, res) => {
    const { name, value_props, ideal_use_cases } = req.body;
    // Validate required fields
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required and must be a string' });
    }
    if (!Array.isArray(value_props)) {
        return res.status(400).json({ error: 'value_props must be an array' });
    }
    if (!Array.isArray(ideal_use_cases)) {
        return res.status(400).json({ error: 'ideal_use_cases must be an array' });
    }
    console.log('Offer received:', { name, value_props, ideal_use_cases });
    offerDetails = { name, value_props, ideal_use_cases }; // store the values in memory
    res.status(201).json({
        message: 'Offer received successfully',
        offer: { name, value_props, ideal_use_cases }
    });
});
// post API - accept a CSV file with columns : name,role,company,industry,location,linkedin_bio
app.post('/leads/upload', upload.single("file"), async (req, res) => {
    // upload.single("file") - uploads a single file with the name "file", middleware
    // so only one file can be uploaded at a time
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // parsing the CSV file
    const filePath = path_1.default.resolve(req.file.path); // resolve the path of the uploaded file
    const leads = []; // array to store the leads
    try {
        const stream = fs_1.default.createReadStream(filePath).pipe((0, csv_parser_1.default)());
        // createReadStream - opens the uploaded CSV file
        // .pipe(csvParser()) - puts file data into CSV parser
        // and each row is collected into the 'leads' array
        // process each row and read the data into the 'leads' array
        stream.on("data", (row) => {
            const lead = {
                name: row.name || "",
                role: row.role || "",
                company: row.company || "",
                industry: row.industry || "",
                location: row.location || "",
                linkedin_bio: row.linkedin_bio || "",
            };
            leads.push(lead);
        });
        // when parsing finishes, delete the file and return the leads
        stream.on('end', () => {
            fs_1.default.unlinkSync(filePath); // delete the uploaded file after processing
            uploadedLeads = leads; // store the uploaded leads in memory
            res.status(200).json({ message: 'CSV file processed successfully', leads });
        });
        // if parsing fails, delete the file and return an error
        stream.on('error', (err) => {
            fs_1.default.unlinkSync(filePath); // delete the uploaded file after processing
            return res.status(500).json({ error: 'Error parsing CSV file', details: err.message });
        });
    }
    catch (error) {
        console.error('Error parsing CSV file:', error);
        return res.status(500).json({ error: 'Error parsing CSV file' });
    }
});
// output APIs
// scoring logic
async function scoreLeadWithRules(lead) {
    let score = 0;
    let reasons = []; // to collect explanation for each scoring
    // 1 - Role relevance
    if (/chief|head|director|vp/i.test(lead.role)) {
        // if role contains these keywords -> decision maker
        score += 20;
        reasons.push("Role is a decision maker (+20).");
    }
    else if (/manager|lead|senior/i.test(lead.role)) {
        // if role contains these keywords → influencer
        score += 10;
        reasons.push("Role is an influencer (+10).");
    }
    else {
        reasons.push("Role has low decision influence (+0).");
    }
    // 2 - industry match
    if (/saas|software|tech/i.test(lead.industry)) {
        score += 20;
        reasons.push("Industry is an exact ICP match (+20).");
    }
    else if (/marketing|consulting|services/i.test(lead.industry)) {
        score += 10;
        reasons.push("Industry is adjacent to ICP (+10).");
    }
    else {
        reasons.push("Industry outside ICP (+0).");
    }
    // 3 - data completeness
    const allFieldsPresent = lead.name && lead.role && lead.company && lead.industry && lead.location && lead.linkedin_bio;
    if (allFieldsPresent) {
        score += 10;
        reasons.push("All fields complete (+10).");
    }
    else {
        reasons.push("Missing fields, no completeness bonus (+0).");
    }
    // intent label according to score
    let intent;
    if (score >= 40) {
        intent = "High";
    }
    else if (score >= 25) {
        intent = "Medium";
    }
    else {
        intent = "Low";
    }
    return score;
    // name: lead.name,
    // role: lead.role,
    // company: lead.company,
    // intent,
    // score,
    // reasoning: reasons.join(" ")
}
;
// AI based scoring
async function scoreLeadWithAI(lead, offerDetails) {
    const prompt = `
    You are a lead scoring AI assistant. Given a lead's details and an offer, score the lead's intent to purchase the offer on a scale of 0-100. 
    Provide reasoning for the score based on the lead's role, company, industry, location, and LinkedIn bio.

    Lead Details:
    Name: ${lead.name}
    Role: ${lead.role}
    Company: ${lead.company}
    Industry: ${lead.industry}
    Location: ${lead.location}
    LinkedIn Bio: ${lead.linkedin_bio}

    Offer Details:
    Name: ${offerDetails.name}
    Value Propositions: ${offerDetails.value_props.join(", ")}
    Ideal Use Cases: ${offerDetails.ideal_use_cases.join(", ")}

    Return the result in the following JSON format:
    {
      "name": "$<Lead Name>",
      "role": "$<Lead Role>",
      "company": "$<Lead Company>",
      "intent": "<High|Medium|Low>",
      "score": "number between 0-100",
      "reasoning": "<Detailed reasoning for the score>"
    }
  `;
    try {
        const response = await genai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        // console.log('AI response:', response.text);
        const text = response.text; // extract the text from the response
        const jsonMatch = text?.match(/\{[\s\S]*\}/); // regex to find JSON in the text, extract JSON from the response
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }
        const aiResult = JSON.parse(jsonMatch[0]); // parse the JSON string to an object
        // parses JSON string into a javascript object
        // jsonMatch[0] contains the matched JSON string
        let aiPoints;
        let intent;
        // Map score to intent if not provided
        if (aiResult.intent === "High") {
            aiPoints = 50;
            intent = "High";
        }
        else if (aiResult.intent === "Medium") {
            aiPoints = 30;
            intent = "Medium";
        }
        else {
            aiPoints = 10;
            intent = "Low";
        }
        return { aiPoints, reasoning: aiResult.reasoning, intent };
        // return {
        //   name: aiResult.name || lead.name,
        //   role: aiResult.role || lead.role,
        //   company: aiResult.company || lead.company, intent,
        //   score: aiPoints,
        //   reasoning: aiResult.reasoning || "AI scoring completed"
        // };
    }
    catch (error) {
        console.error('Error during AI scoring:', error);
        throw new Error('Error during AI scoring');
        // return {
        //   name: lead.name,
        //   role: lead.role,
        //   company: lead.company,
        //   intent: "Low",
        //   score: 0,
        //   reasoning: "Error in AI processing."
        // };
    }
}
let calculatedResult;
// transforms uploaded leads to results and runs the scoring logic
app.post('/score', async (req, res) => {
    if (uploadedLeads.length === 0) {
        return res.status(400).json({ error: 'No leads uploaded to score. Upload CSV first' });
    }
    // results = await Promise.all(uploadedLeads.map((lead) => scoreLeadWithRules(lead))); // score every lead
    // const AIresults = await Promise.all(uploadedLeads.map((lead) => scoreLeadWithAI(lead, offerDetails))); // score every lead
    // const ruleResults = await Promise.all(uploadedLeads.map((lead) => scoreLeadWithRules(lead))); // score every lead
    const finalResults = await Promise.all(uploadedLeads.map(async (lead) => {
        const aiResult = await scoreLeadWithAI(lead, offerDetails);
        const aiScore = aiResult.aiPoints;
        const aiReasoning = aiResult.reasoning;
        const aiIntent = aiResult.intent;
        const ruleScore = await scoreLeadWithRules(lead);
        let finalScore = aiScore + ruleScore;
        const response = {
            name: lead.name,
            role: lead.role,
            company: lead.company,
            intent: aiIntent,
            score: finalScore,
            reasoning: aiReasoning
        };
        return response; // return for map function
    }));
    calculatedResult = finalResults;
    res.end();
});
// GET - /results - returns the JSON array
app.get('/results', async (req, res) => {
    res.json(calculatedResult || []);
});
// export results as a CSV file
app.get('/results/export', async (req, res) => {
    try {
        const fields = ['name', 'role', 'company', 'intent', 'score', 'reasoning']; // fields to export
        const parser = new json2csv_1.Parser({ fields });
        const csv = parser.parse(calculatedResult || []); // convert JSON to CSV
        res.setHeader('Content-Type', 'text/csv'); // set the content type to CSV
        res.attachment('results.csv'); // attachment is the filename of the CSV file
        res.status(200).send(csv); // send CSV to client
    }
    catch (error) {
        console.error('Error exporting results:', error);
        return res.status(500).json({ error: 'Error exporting results' });
    }
});
//# sourceMappingURL=index.js.map