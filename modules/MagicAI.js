import {Ollama} from "ollama";
import {ElevenLabsClient} from "elevenlabs";
import {playErrorMessage, playBufferingStream} from "./AudioHandler.js";
import dotenv from "dotenv";

dotenv.config();
const ElevenAPI = new ElevenLabsClient();
const ollama = new Ollama({ host: process.env.OLLAMA_HOST })

const actionQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (actionQueue.length > 0) {
        const { action, resolve } = actionQueue.shift();
        await action(); // Execute the action
        resolve(); // Resolve the Promise for this specific action
    }
    isProcessingQueue = false;
}

async function addActionToQueue(action){
    // Wrap the action addition in a Promise
    const actionAdded = new Promise((resolve) => {
        actionQueue.push({ action, resolve });
    });

    // Trigger the queue processing
    processQueue();

    // Wait for the action to be added to the queue
    await actionAdded;
}

async function ElevenLabsTTS(message){
    const audioStream = await ElevenAPI.textToSpeech.convert(process.env.ELEVENLABS_VOICEID,{
        text: message,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_64',
        voice_settings: {
            stability: parseFloat("0.5"),
            similarity_boost: parseFloat("0.75"),
            use_speaker_boost: true,
        }
    })

    try {
        await playBufferingStream(audioStream);
    } catch (error) {
        await playErrorMessage()
        console.error(error);
    }
}

async function generatePrompt(message) {
    let OllamaAi = await ollama.generate({
        model: process.env.OLLAMA_MODEL,
        prompt: message,
    })
    
    if (OllamaAi && OllamaAi.response) {
        return await ElevenLabsTTS(OllamaAi.response);
    }else{
       return await playErrorMessage();
    }
}

export {
    addActionToQueue,
    generatePrompt,
    ElevenLabsTTS,
}
