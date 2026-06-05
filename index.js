const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// වෙබ් පිටුව පෙන්වීම (සර්වර් එක හැමතිස්සෙම ලයිව් තියනවා)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// බොට්ව පණ ගැන්වීමේ ප්‍රධාන ෆන්ක්ෂන් එක
async function startBotCore() {
    // සර්වර් එක ඇතුළේ 'session' ෆෝල්ඩරයක් දැනටමත් තියෙනවාද බලනවා
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const bot = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    bot.ev.on('creds.update', saveCreds);

    bot.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'close') {
            console.log("සම්බන්ධතාවය නැවතුණා, නැවත උත්සාහ කරයි...");
            startBotCore(); // ක්‍රෑෂ් වුණොත් ඔටෝ රීස්ටාර්ට් වෙනවා
        } else if (connection === 'open') {
            console.log("✅ 🎯 𝐓𝐇𝐔𝐇𝐈 𝐌𝐃 සාර්ථකව සර්වර් එකට සම්බන්ධ වුණා!");
        }
    });

    // .alive command එක
    bot.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const from = msg.key.remoteJid;

            if (textMessage.toLowerCase() === '.alive') {
                let aliveMessage = `*👋 𝐇𝐞𝐥𝐥𝐨 𝐈 ' 𝐚𝐦 𝐓𝐇𝐔𝐇𝐈 𝐌𝐃*\n\n⚡ *Status:* Online\n🤖 *Type:* WhatsApp User Bot\n✨ *Owner:* Thuhina\n\n> මම දැන් වෙබ් අඩවිය හරහා කෙලින්ම සර්වර් එකට ලින්ක් වෙලා වැඩ යාළුවා!`;
                await bot.sendMessage(from, { image: { url: "https://i.ibb.co/7xWx6q4N/image.png" }, caption: aliveMessage }, { quoted: msg });
            }
        } catch (e) { console.log(e); }
    });

    return bot;
}

// දැනටමත් ලොග් වෙලා නම් සර්වර් එක ඔන් වෙද්දීම බොට්ව ලයිව් කරනවා
if (fs.existsSync('./session/creds.json')) {
    startBotCore();
}

// වෙබ් සයිට් එකෙන් නම්බර් එක එවද්දී ක්‍රියාත්මක වන කොටස
app.get('/code', async (req, res) => {
    let phoneNumber = req.query.number;
    if (!phoneNumber) return res.json({ error: 'කරුණාකර නිවැරදි නම්බර් එකක් දෙන්න!' });
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        // දැනටමත් සර්වර් එක ඇතුළේ රන් වෙන බොට්ව පණ ගන්වනවා (නැත්නම් අලුතින් හදනවා)
        const bot = await startBotCore();

        setTimeout(async () => {
            try {
                let code = await bot.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                return res.json({ code: code });
            } catch (err) {
                return res.json({ error: 'කෝඩ් එක ලබාගැනීමට නොහැකි වුණා. ආයෙත් උත්සාහ කරන්න.' });
            }
        }, 3000);

    } catch (e) {
        return res.json({ error: 'සර්වර් දෝෂයකි!' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 𝐓𝐇𝐔𝐇𝐈 𝐌𝐃 සර්වර් එක සූදානම්! PORT: ${PORT}`);
});
