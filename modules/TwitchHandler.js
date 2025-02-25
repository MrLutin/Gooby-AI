import {RefreshingAuthProvider} from "@twurple/auth";
import {Bot} from "@twurple/easy-bot";
import dotenv from "dotenv";
import * as MagicAI from "./MagicAI.js";
dotenv.config();

const appId = process.env.TWITCH_APP_CLIENT;
const appSecret = process.env.TWITCH_APP_SECRET;
const accessToken = process.env.TWITCH_BOT_ACCESSTOKEN;
const refreshToken = process.env.TWITCH_BOT_REFRESHTOKEN;


const authProvider = new RefreshingAuthProvider(
    { clientId: appId, clientSecret: appSecret }
);

await authProvider.addUserForToken({
    accessToken, refreshToken
}, ['chat']);

const bot = new Bot({
    authProvider,
    channels: [ 'mrlutinfous' ],
});


async function randomDelay(minMs = 1, maxMs = 100) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function handleTwitchEvent(eventHandler, data) {
    return randomDelay().then( () => MagicAI.addActionToQueue(() => eventHandler(data)) )
}


// handle all events for sub and cheer
bot.onSub(async ({ broadcasterName, userName }) => {
    let messageTTS = `Nous avons ajouté ${userName} a la liste des gentils humains! il pourra recevoir sont cadeaux!`
    await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
});

bot.onResub(async ({ broadcasterName, userName, months }) => {
    let messageTTS = `Nous venons de remetter ${userName} sur la liste des gentils humains! il pourra recevoir sont cadeaux! Merci pour les ${months} mois de support`
    await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
});

bot.onSubGift(async ({ broadcasterName, gifterName, userName }) => {
    let messageTTS = `Un enorme merci a ${gifterName} pour avoir partagé l'amour de noël avec @${userName}!`
    await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
});

bot.onBan( async ({ broadcasterName, userName }) => {
    let messageTTS = `${userName} est maintenant sur la liste noir pour noel et recevera un morceaux de charbon!`
    await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
})

bot.onSubsOnlyToggle(async ({ broadcasterName, enabled }) => {
    if (enabled) {
        let messageTTS = `Nous avons passer en mode VIP pour une duré limité car nous avons besoins de financements pour les futurs cadeaux!`
        await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
    }else{
        let messageTTS = `Nous avons ouvert l'espace de discussion a tous!`
        await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
    }
})

bot.onFollowersOnlyToggle(async ({ broadcasterName, enabled }) => {
    if (enabled) {
        let messageTTS = `Nous fermons les portes du pole nord car nous avons besoins de plus de followers!`
        await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
    }else {
        let messageTTS = `Les portes du pole nord sont maintenant ouvert au public! Bienvenu a tous!`
        await handleTwitchEvent(MagicAI.ElevenLabsTTS, messageTTS)
    }
})

// Handle all chat message
bot.onMessage(async ({ broadcasterName, userName, text}) => {
    console.log(`[${broadcasterName}] ${userName} said: "${text}"`)
})


// Required to start TwitchBot when the application is launched
export async function startTwitchBot(){}