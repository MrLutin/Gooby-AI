import fs from 'fs';
import path from 'path';
import * as dotenv from "dotenv";
import VAD from "node-vad";
import {Porcupine} from "@picovoice/porcupine-node";
import * as AudioHandler from "./modules/AudioHandler.js";
import {startTwitchBot} from "./modules/TwitchHandler.js";
import {PvRecorder} from "@picovoice/pvrecorder-node";


dotenv.config();

let vad;
let MICROPHONE_DEVICE = -1;
let porcupineHandle;
let recorder;
let silenceFramesCount = 0;
let recordingFrames = [];
let isRecording = false;
let isListening = true;

function loadWakeWord() {
    try {
        const directoryPath = path.resolve(path.resolve(), 'wake_word');
        let files = fs.readdirSync(directoryPath);
        let modelFile = files.find(file => file.startsWith('porcupine_params_') && file.endsWith('.pv'));
        let keywordFiles = files.filter(file => file.endsWith('.ppn'));

        if (!modelFile) throw new Error("No model file found");
        if (!keywordFiles.length) throw new Error('No .ppn files found');

        let keywordPaths = keywordFiles.map(file => path.resolve(directoryPath, file));
        const MY_MODEL_PATH = path.resolve(directoryPath, modelFile);
        porcupineHandle = new Porcupine(process.env.PORCUPINE_API_KEY, keywordPaths, new Array(keywordPaths.length).fill(0.5), MY_MODEL_PATH);
        console.log("Wake word loaded");
    } catch (error) {
        console.error(`Error loading wake word: ${error}`);
    }
}
function initMicrophone() {
    // Initialize Node-vad
    const VAD_MODE = process.env.VOICE_ACTIVATION_MODE_LEVEL || "NORMAL";
    switch (VAD_MODE) {
        case "NORMAL":
            vad = new VAD(VAD.Mode.NORMAL);
            break;
        case "LOW_BITRATE":
            vad = new VAD(VAD.Mode.LOW_BITRATE);
            break;
        case "AGGRESSIVE":
            vad = new VAD(VAD.Mode.AGGRESSIVE);
            break;
        case "VERY_AGGRESSIVE":
            vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);
        default:
            vad = new VAD(VAD.Mode.NORMAL);
            break;
    }

    recorder.start();
    console.log(`Using microphone device: ${recorder.getSelectedDevice()} | Wrong device? Cant be change at this moment`);
}
async function handleSilenceDetection(frames) {
    const framesBuffer = Buffer.from(frames);
    const res = await vad.processAudio(framesBuffer, recorder.sampleRate);

    switch (res) {
        case VAD.Event.VOICE:
            return false; // Voice detected, not silence
        case VAD.Event.SILENCE:
        case VAD.Event.NOISE:
        case VAD.Event.ERROR:
        default:
            return true; // All other cases treated as silence
    }
}
async function handleVoiceDetection() {
    while (isListening) {
        const frames = await recorder.read();
        const isSilence = await handleSilenceDetection(frames);

        if (isRecording) {
            recordingFrames.push(frames);
            if (isSilence) {
                silenceFramesCount++
                if (silenceFramesCount > 45) {
                    isRecording = false;
                    silenceFramesCount = 0;
                    await AudioHandler.saveVoiceRecording(porcupineHandle, recordingFrames, recorder);
                }
            } else {
                silenceFramesCount = 0;
            }
        } else {
            const index = porcupineHandle.process(frames);
            if (index !== -1) {
                console.log(`Wake word detected, start recording !`);
                await AudioHandler.playWakeAnswer()
                isRecording = true;
            }
        }
    }
}

async function initialize() {
    
    // load all twitch integration
    await startTwitchBot();
    
    // Play Welcome sound at launch
    await AudioHandler.playWelcomeSound()

    // Setup AI wake word with picovoice
    await loadWakeWord()

    // Handle picovoice handler for voice detection
    if (porcupineHandle){
        recorder = new PvRecorder(porcupineHandle.frameLength, MICROPHONE_DEVICE);
        initMicrophone();
        await handleVoiceDetection();
    }
}

// Launch the application
initialize().catch(error => console.error(`Failed to initialize: ${error}`));