"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Hello from TypeScript + Express');
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
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
    res.status(201).json({
        message: 'Offer received successfully',
        offer: { name, value_props, ideal_use_cases }
    });
});
//# sourceMappingURL=index.js.map