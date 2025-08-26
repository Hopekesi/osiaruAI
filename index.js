import express from "express";
import axios from "axios";
import dotenv from "dotenv";

import {
    addQuery,
    PermiumUser,
    deductTokens,
    connectDB
} from "./Files/func.js";
dotenv.config();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");

    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    next();
});

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validate environment variables
if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required");
    process.exit(1);
}

app.use(express.json());

async function generateContent(prompt) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error(
            "Error calling Gemini API:",
            error.response?.data || error.message
        );
        throw new Error("Failed to generate content from Gemini API");
    }
}

app.get("/:id", async (req, res) => {
    const id = req.params.id;
    //Find user by id
    //let user = find(ID)
    let user = await PermiumUser.findById(id);
    if (!user) {
        throw new Error("Not a user");
    }

    //validation

    const { prompt } = req.query;

    if (!prompt) {
        return res.status(400).json({
            success: false,
            error: "Prompt query parameter is required"
        });
    }
    //get cost
    let cost = prompt.length / 15;
    if (cost < 2) cost = 1;
    /*
    if (user.tokens < cost) {
        return res.status(400).json({
            success: false,
            error: "Insufficient tokens"
        });
    }
*/
    const question = `Here's the deal:
  1. You are osiaruAi, an AI owned by ProjectPQ.
  2. ProjectPQ is the number one past questions website in Uniport.
  3. You were created by The Developers of ProjectPQ.
  4. Do not explain who you are unless the prompt asks you to.
  5. Return answer in one HTML div. Use HTML for readability.
  6. If you are asked to generate codes, embed it properly because your response is always added to a div with 'innerHTML ='.
  7. No CSS, just JavaScript and HTML when necessary.
  8. Use MathJax syntax for equations. like \\( K_s = 45\\)
  9. Keep it short and simple.
  10. And you a bit rude,funny and sarcastic.... like 7/10.
  11. You love helping students study, that's what you were made for.
  Now respond to this prompt: ${prompt}`;

    try {
        const aiResponse = await generateContent(question);

        // Extract the response text from the Gemini API response
        if (
            !aiResponse.candidates ||
            !aiResponse.candidates[0] ||
            !aiResponse.candidates[0].content ||
            !aiResponse.candidates[0].content.parts ||
            !aiResponse.candidates[0].content.parts[0]
        ) {
            throw new Error("Invalid response format from Gemini API");
        }

        let aiResponseText = aiResponse.candidates[0].content.parts[0].text;

        //deductTokens and dave
        cost = Math.ceil(cost);
        cost = -1 * cost;
        let sssUser = await deductTokens(id, cost, "Asked osiaruAi");

        //store userQueries
        await addQuery(sssUser.gmail, prompt, aiResponseText);

        res.status(200).json({
            success: true,
            user: sssUser,
            response: aiResponseText
        });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to generate content"
        });
    }
});

app.use("/", (req, res) => {
    res.send({
        body: req,
        message: "osiaruAi"
    });
});

app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on http://localhost:${PORT}`);
});

//await connectDB();
//export const handler = serverless(app);
