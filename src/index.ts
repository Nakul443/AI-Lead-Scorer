import express, { Request, Response } from 'express';


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from TypeScript + Express');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


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

