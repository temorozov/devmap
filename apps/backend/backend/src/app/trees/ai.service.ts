import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

interface GeneratedSkill {
    title: string;
    description: string;
    icon: string;
    parentIndex: number | null; // null for root note, otherwise index in the array
    youtubeSearchQuery?: string;
}

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;

    constructor() {}

    async generateSkillTree(prompt: string): Promise<GeneratedSkill[]> {
        // Force reading .env right before generation
        dotenv.config({ path: path.resolve(process.cwd(), '.env') });
        
        const apiKey = process.env.GEMINI_API_KEY;
        const youtubeApiKey = process.env.YOUTUBE_API_KEY;
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
- "description": string (detailed text about the skill or general recommendations. Do NOT include any hallucinated or fake links in the description. If appropriate, recommend searching for specific topics instead.)
- "icon": string (a valid Google Material Icon name that best fits the skill, e.g., "movie", "book", "school", "fitness_center", "code")
- "parentIndex": number or null (If this is the root skill, this must be null. Otherwise, it must be the 0-based index of the parent skill in this array. A skill must only reference a parent index smaller than its own index.)
- "youtubeSearchQuery": string (optional, a highly specific and relevant search query to find a good YouTube video tutorial or explanation for this specific skill. Omit if a video is not relevant.)

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

            // Fetch YouTube links
            if (youtubeApiKey) {
                for (const skill of parsed) {
                    if (skill.youtubeSearchQuery) {
                        try {
                            const ytResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                                params: {
                                    part: 'snippet',
                                    q: skill.youtubeSearchQuery + ' tutorial',
                                    type: 'video',
                                    maxResults: 1,
                                    key: youtubeApiKey
                                }
                            });
                            
                            if (ytResponse.data.items && ytResponse.data.items.length > 0) {
                                const videoId = ytResponse.data.items[0].id.videoId;
                                const videoTitle = ytResponse.data.items[0].snippet.title;
                                const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
                                
                                skill.description += `\n\nRecommended Video: [${videoTitle}](${videoLink})`;
                            }
                        } catch (ytError) {
                            console.error('Error fetching YouTube video for query:', skill.youtubeSearchQuery, ytError.message);
                            // Do not throw an error, just continue without the video link
                        }
                    }
                }
            } else {
                console.warn('[AI Service] YOUTUBE_API_KEY is not defined. Skipping YouTube video search.');
            }

            return parsed;
        } catch (error) {
            console.error('Error generating skill tree with AI:', error);
            throw new InternalServerErrorException('Failed to generate skill tree. Please try again.');
        }
    }
}
