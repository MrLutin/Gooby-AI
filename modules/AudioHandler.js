import fs from "fs";
import path from "path";
import childProcess from "child_process";
import pkg from "wavefile";
const {WaveFile} = pkg

function playRandomMP3(directory) {
    const mp3Files = fs.readdirSync(directory);
    const randomMP3 = mp3Files[Math.floor(Math.random() * mp3Files.length)];
    return streamMP3FromFile(path.join(directory, randomMP3));
}
function playWakeAnswer() {
    return playRandomMP3(path.join(path.resolve(), 'wake_answer'));
}

function playWaitAnswer() {
    return playRandomMP3(path.join(path.resolve(), 'wait_answer'));
}

function playWelcomeSound(){
    return streamMP3FromFile(path.join( 'audio', 'welcome.mp3'));
}

function playErrorMessage(){
    return streamMP3FromFile(path.join( 'audio', 'error.mp3'));
}
function playBufferingStream(audioStream) {
    return new Promise((resolve, reject) => {
        const audioPlayer = childProcess.spawn('node', ['modules/AudioPlayer.cjs']);
        audioStream.pipe(audioPlayer.stdin);

        let errorOutput = '';
        audioPlayer.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        audioPlayer.on('close', (code) => {
            if (code !== 0) {
                console.error(`Audio player exited with code ${code}`);
                console.error('Error details:', errorOutput);
                reject(new Error(`Audio player exited with code ${code}. Details: ${errorOutput}`));
            } else {
                resolve();
            }
        });
    });
}

function streamMP3FromFile(filePath) {
    const audioStream = fs.createReadStream(filePath);
    return playBufferingStream(audioStream)
}

async function saveVoiceRecording(porcupineHandle, currentFrames, pvrecorder) {
    try {
        //always delete last recorded voice detection!
        if (fs.existsSync("recording.wav")) {
            await fs.unlinkSync("recording.wav");
        }
        
        // Write the new voice data
        let waveFile = new WaveFile();
        const audioData = new Int16Array(currentFrames.length * porcupineHandle.frameLength);
        for (let i = 0; i < currentFrames.length; i++) {
            audioData.set(currentFrames[i], i * porcupineHandle.frameLength);
        }
        waveFile.fromScratch(1, pvrecorder.sampleRate, '16', audioData);
        fs.writeFileSync("recording.wav", waveFile.toBuffer());
        console.log('New voice record saved to recording.wav file!');
    } catch (error) {
        console.error(`Error saving recording: ${error}`);
    }
}


export {
    streamMP3FromFile,
    saveVoiceRecording,
    playBufferingStream,
    playWelcomeSound,
    playErrorMessage,
    playWakeAnswer,
    playRandomMP3
}