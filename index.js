const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// වෙබ් පිටුව පෙන්වීම (සර්වර් එක ක්‍රෑෂ් නොවී හැමතිස්සෙම ලයිව් තියාගන්නවා)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// වෙබ් පිටුවෙන් නම්බර් එක ආවාම විතරක් ක්‍රියාත්මක වන ෆන්ක්ෂන් එකක්
app.get('/code', async (req, res) => {
    let phoneNumber = req.query.number;
    if (!phoneNumber) return res.json({ error: 'කරුණාකර නිවැරදි නම්බර් එකක් ඇතුළත් කරන්න!' });
    
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        // නම්බර් එක ආවාම විතරක් WhatsApp එකට කනෙක්ට් වෙන්න හදනවා
        const { state, saveCreds } = await useMultiFileAuthState('session');
        const bot = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        bot.ev.on('creds.update', saveCreds);

        bot.ev.on('connection.update', (update) => {
            const { connection } = update;
            if (connection === 'open') {
                console.log("✅ 𝐓𝐇𝐔𝐇𝐈 𝐌𝐃 සාර්ථකව සම්බන්ධ වුණා!");
            }
        });

        // බොට් මැසේජ් සිස්ටම් එක (.alive)
        bot.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const msg = chatUpdate.messages[0];
                if (!msg.message || msg.key.fromMe) return;
                const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
                const from = msg.key.remoteJid;

                if (textMessage.toLowerCase() === '.alive') {
                    let aliveMessage = `*👋 𝐇𝐞𝐥𝐥ο 𝐈'𝐚𝐦 𝐓𝐇𝐔𝐇𝐈 𝐌𝐃*\n\n⚡ *Status:* Online\n🤖 *Type:* WhatsApp User Bot\n✨ *Owner:* Thuhina\n\n> මම දැන් වෙබ් සයිට් එක හරහා සාර්ථකව ලොග් වෙලා වැඩ යාළුවා!`;
                    await bot.sendMessage(from, { image: { url: "https://i.ibb.co/7xWx6q4N/image.png" }, caption: aliveMessage }, { quoted: msg });
                }
            } catch (e) { console.log(e); }
        });

        // තත්පර 3කින් කෝඩ් එක රික්වෙස්ට් කරනවා
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

// සර්වර් එක ස්ටාර්ට් කිරීම
app.listen(PORT, () => {
    console.log(`🚀 𝐓𝐇𝐔𝐇𝐈 𝐌𝐃 Pairing Server එක සාර්ථකව පණ ගැන්වුණා! PORT: ${PORT}`);
});
