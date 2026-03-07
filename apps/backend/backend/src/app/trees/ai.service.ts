import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

interface GeneratedSkill {
    title: string;
    description: string;
    icon: string;
    parentIndex: number | null; // null for root note, otherwise index in the array
}

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;

    constructor() {}

    async generateSkillTree(prompt: string): Promise<GeneratedSkill[]> {
        // Force reading .env right before generation
        dotenv.config({ path: path.resolve(process.cwd(), '.env') });
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[AI Service] GEMINI_API_KEY is not defined in environment variables.');
            throw new InternalServerErrorException('Gemini API key is not configured.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `You are an AI assistant that generates a skill/learning tree based on the user's prompt. 
You must output ONLY valid JSON without any markdown blocks.
The JSON must be an array of objects representing skills.
Each skill object must have exactly these fields:
- "title": string (short, concise name of the skill or learning step)
- "description": string (detailed text about the skill, including links to resources if the user requested them, or general recommendations)
- "icon": string (a valid Google Material Icon name that best fits the skill, e.g., "movie", "book", "school", "fitness_center", "code")
- "parentIndex": number or null (If this is the root skill, this must be null. Otherwise, it must be the 0-based index of the parent skill in this array. A skill must only reference a parent index smaller than its own index.)

Only output the raw JSON array. Start with [ and end with ]. NO markdown blocks like \`\`\`json.`;

        try {
            const result = await model.generateContent([
                systemPrompt,
                "User prompt: " + prompt
            ]);
            let responseText = result.response.text().trim();
            
            // Cleanup in case the model returns markdown anyway
            if (responseText.startsWith('\`\`\`json')) {
                responseText = responseText.replace(/^\`\`\`json/, '');
            }
            if (responseText.startsWith('\`\`\`')) {
                responseText = responseText.replace(/^\`\`\`/, '');
            }
            if (responseText.endsWith('\`\`\`')) {
                responseText = responseText.replace(/\`\`\`$/, '');
            }
            responseText = responseText.trim();

            const parsed = JSON.parse(responseText);
            if (!Array.isArray(parsed)) {
                throw new Error("Output was not an array");
            }
            return parsed;
        } catch (error) {
            console.error('Error generating skill tree with AI:', error);
            throw new InternalServerErrorException('Failed to generate skill tree. Please try again.');
        }
    }
}
