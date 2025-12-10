import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listModels() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY not found in .env');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        // There isn't a direct listModels method on the client instance in this SDK version easily accessible in node without admin SDK usually, 
        // but let's try to just run a generation on a few known models to see which one works.

        const modelsToTest = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-pro',
            'gemini-1.0-pro'
        ];

        console.log('Testing models...');

        for (const modelName of modelsToTest) {
            process.stdout.write(`Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hello');
                const response = await result.response;
                console.log('OK');
            } catch (error) {
                console.log('FAILED');
                console.error(error.message);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
