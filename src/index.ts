import express, { Request, Response } from 'express';
import multer from 'multer'; // Multer is a node.js middleware for handling multipart/form-data,
// which is used for uploading files
import csvParser from 'csv-parser'; // for parsing CSV files
import fs from "fs";
import path from 'path';
// fs and path used to read the file and delete after processing

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from TypeScript + Express');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// configure multer for file uploads
const upload = multer({
  dest: 'uploads/', // for temporary storage of the uploaded file

  // fileFileter rejects files that are not CSV
  // so the API does not accept PDFs, images, or other file types
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// defining the structure of a 'Lead' object
interface Lead {
  name: string;
  role: string;
  company: string;
  industry: string;
  location: string;
  linkedin_bio: string;
}





// post API - to accept the offer from the client
app.post('/offer', async (req: Request, res: Response) => {
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
  
  res.status(201).json({ 
    message: 'Offer received successfully',
    offer: { name, value_props, ideal_use_cases }
  });
});

// post API - accept a CSV file with columns : name,role,company,industry,location,linkedin_bio
app.post('/leads/upload', upload.single("file"), async (req: Request, res: Response) => {
  // upload.single("file") - uploads a single file with the name "file", middleware
  // so only one file can be uploaded at a time
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // parsing the CSV file
  const filePath = path.resolve(req.file.path); // resolve the path of the uploaded file
  const leads: Lead[] = []; // array to store the leads

  try {
    const stream = fs.createReadStream(filePath).pipe(csvParser());
    // createReadStream - opens the uploaded CSV file
    // .pipe(csvParser()) - puts file data into CSV parser
    // and each row is collected into the 'leads' array

    // process each row and read the data into the 'leads' array
    stream.on("data", (row) => {
      const lead: Lead = {
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
      fs.unlinkSync(filePath); // delete the uploaded file after processing
      res.status(200).json({ message: 'CSV file processed successfully', leads });
    });

    // if parsing fails, delete the file and return an error
    stream.on('error', (err) => {
      fs.unlinkSync(filePath); // delete the uploaded file after processing
      return res.status(500).json({ error: 'Error parsing CSV file', details: err.message });
    });
  }
  catch (error) {
    console.error('Error parsing CSV file:', error);
    return res.status(500).json({ error: 'Error parsing CSV file' });
  }
})