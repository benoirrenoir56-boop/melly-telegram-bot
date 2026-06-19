const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8498663842:AAFv0_3m3c1Gwzme6oGc7RXWbkgX8DZ0QZ0';
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID || '8441367753';
const PORT = process.env.PORT || 3000;

// Serveur HTTP pour garder le bot actif sur Render
const app = express();
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; background:#1a1a1a; color:white; padding:20px;">
                <h1>🤖 Melly Shop Telegram Bot</h1>
                <p>Statut : <b>✅ En ligne</b></p>
                <p>Le bot est actif sur <a href="https://t.me/Melly225_bot" style="color:#0088cc;">@Melly225_bot</a></p>
            </body>
        </html>
    `);
});
app.get('/health', (req, res) => res.status(200).send('OK'));
app.listen(PORT, () => console.log(`Serveur web démarré sur le port ${PORT}`));

// Auto-ping pour garder le serveur éveillé
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || '';
if (RENDER_URL) {
    setInterval(() => {
        const https = require('https');
        https.get(`${RENDER_URL}/health`).on('error', () => {});
    }, 10 * 60 * 1000);
}

// Initialiser le bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Données des produits
const products = {
    free_fire: {
        name: "Free Fire (Diamants)",
        items: [
            { amount: "100", price: "750" },
            { amount: "221", price: "1 500" },
            { amount: "321", price: "2 200" },
            { amount: "442", price: "2 200" },
            { amount: "530+53", price: "3 500" },
            { amount: "1080+108", price: "7 000" },
            { amount: "2200+220", price: "14 000" }
        ]
    },
    blood_strike: {
        name: "Blood Strike (Gold)",
        items: [
            { amount: "100", price: "800" },
            { amount: "210", price: "1 600" },
            { amount: "320", price: "3 100" },
            { amount: "540", price: "2 100" },
            { amount: "700", price: "4 600" },
            { amount: "1100", price: "6 000" },
            { amount: "2260", price: "12 500" },
            { amount: "Strike Pass Elite", price: "2 500" },
            { amount: "Strike Pass Premium", price: "5 500" }
        ]
    },
    pubg: {
        name: "PUBG Mobile (UC)",
        items: [
            { amount: "60 UC", price: "800" },
            { amount: "180 UC", price: "2 300" },
            { amount: "300 UC", price: "3 200" },
            { amount: "600 UC", price: "1 500" },
            { amount: "3850 UC", price: "30 000" },
            { amount: "Elite Pass", price: "7 500" },
            { amount: "Elite Pass Plus", price: "19 500" }
        ]
    },
    vpn: {
        name: "Formation VPN",
        tools: "Netmod, HTTP Injector, Dark Tunnel, ZI VPN, Droid VPN",
        items: [
            { amount: "Formation Complète (Tous les VPN)", price: "5 500" },
            { amount: "Formation Seule (1 VPN au choix)", price: "1 800" }
        ]
    },
    virtual_numbers: {
        name: "Numéros Virtuels WhatsApp",
        description: "À partir de 2€\n- 100% virtuel, aucune carte physique\n- Livraison instantanée\n- Idéal pour: Business, Confidentialité, Multi-comptes, Flexibilité",
        price: "À partir de 2€"
    }
};

const payments = [
    { name: "Wave", details: "+225 0565271512" },
    { name: "MTN Money", details: "+225 0564686298" },
    { name: "Orange Money", details: "+225 0719347745" }
];

const faq = [
    { q: "Délai de livraison ?", a: "La livraison est généralement effectuée en moins de 15 minutes après confirmation du paiement." },
    { q: "Est-ce sécurisé ?", a: "Oui, Melly Shop est une boutique fiable. Nous utilisons les méthodes officielles de recharge." },
    { q: "Comment payer ?", a: "Nous acceptons Wave, MTN Money et Orange Money." }
];

// Menu principal avec boutons
function getMainMenuKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                ['1️⃣ Free Fire', '2️⃣ Blood Strike'],
                ['3️⃣ PUBG Mobile', '4️⃣ Formation VPN'],
                ['5️⃣ Numéros Virtuels', '6️⃣ Paiement'],
                ['7️⃣ FAQ', '8️⃣ Conseiller'],
                ['📋 Menu']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Message de bienvenue
function getWelcomeMessage(name) {
    return `🌟 *Bienvenue chez Melly Shop* 🌟\n_Recharge rapide, fiable et sécurisée_\n\nBonjour ${name} ! Comment puis-je vous aider aujourd'hui ?\n\nVeuillez choisir une option :`;
}

// Commande /start
bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name || 'Client';
    bot.sendMessage(msg.chat.id, getWelcomeMessage(name), { parse_mode: 'Markdown', ...getMainMenuKeyboard() });
});

// Gestion des preuves de paiement (photos / documents image)
bot.on('photo', (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'Client';
    const username = msg.from.username ? `@${msg.from.username}` : 'sans pseudo';

    // Confirmation au client
    bot.sendMessage(chatId, `✅ *Preuve de paiement reçue !*\n\nMerci ${name}. Votre capture a bien été transmise. Nous vérifions votre paiement et traitons votre commande dans les plus brefs délais. ⏱️`, { parse_mode: 'Markdown' });

    // Transfert de la capture au propriétaire
    if (OWNER_CHAT_ID) {
        const photo = msg.photo[msg.photo.length - 1].file_id; // meilleure résolution
        const legende = `💸 *Nouvelle preuve de paiement*\n\nDe : ${name} (${username})\nID : ${chatId}${msg.caption ? `\n\nMessage : "${msg.caption}"` : ''}\n\n_Veuillez vérifier et valider la commande._`;
        bot.sendPhoto(OWNER_CHAT_ID, photo, { caption: legende, parse_mode: 'Markdown' });
    }
});

// Gestion des messages
bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) return; // Ignorer les commandes
    if (msg.photo) return; // Les photos sont gérées par l'événement 'photo'

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const userMessage = text.toLowerCase().trim();
    const name = msg.from.first_name || 'Client';

    // Menu
    if (userMessage === 'menu' || userMessage === '📋 menu' || userMessage === 'salut' || userMessage === 'bonjour' || userMessage === 'hi' || userMessage === 'hello' || userMessage === 'bonsoir') {
        bot.sendMessage(chatId, getWelcomeMessage(name), { parse_mode: 'Markdown', ...getMainMenuKeyboard() });
        return;
    }

    // Free Fire
    if (userMessage === '1' || userMessage.includes('free fire') || userMessage === '1️⃣ free fire') {
        let ffMsg = `💎 *Tarifs Free Fire (Diamants)* 💎\n\n`;
        products.free_fire.items.forEach((item, index) => {
            ffMsg += `${index + 1}. ${item.amount} Diamants — ${item.price} FrCFA\n`;
        });
        ffMsg += `\n📝 *Pour commander* : Envoyez "Commander FF [numéro du pack] [Votre ID Free Fire]"\nExemple : Commander FF 3 123456789`;
        bot.sendMessage(chatId, ffMsg, { parse_mode: 'Markdown' });
        return;
    }

    // Blood Strike
    if (userMessage === '2' || userMessage.includes('blood strike') || userMessage === '2️⃣ blood strike') {
        let bsMsg = `⚔️ *Tarifs Blood Strike (Gold)* ⚔️\n\n`;
        products.blood_strike.items.forEach((item, index) => {
            bsMsg += `${index + 1}. ${item.amount} — ${item.price} FrCFA\n`;
        });
        bsMsg += `\n📝 *Pour commander* : Envoyez "Commander BS [numéro du pack] [Votre ID]"\nExemple : Commander BS 2 987654321`;
        bot.sendMessage(chatId, bsMsg, { parse_mode: 'Markdown' });
        return;
    }

    // PUBG
    if (userMessage === '3' || userMessage.includes('pubg') || userMessage === '3️⃣ pubg mobile') {
        let pubgMsg = `🔫 *Tarifs PUBG Mobile (UC)* 🔫\n\n`;
        products.pubg.items.forEach((item, index) => {
            pubgMsg += `${index + 1}. ${item.amount} — ${item.price} FrCFA\n`;
        });
        pubgMsg += `\n📝 *Pour commander* : Envoyez "Commander PUBG [numéro du pack] [Votre ID]"\nExemple : Commander PUBG 1 456789123`;
        bot.sendMessage(chatId, pubgMsg, { parse_mode: 'Markdown' });
        return;
    }

    // Formation VPN
    if (userMessage === '4' || userMessage.includes('vpn') || userMessage === '4️⃣ formation vpn') {
        let vpnMsg = `🌐 *Formation VPN* 🌐\n\nOutils : ${products.vpn.tools}\n\n`;
        products.vpn.items.forEach((item, index) => {
            vpnMsg += `${index + 1}. ${item.amount} — ${item.price} FrCFA\n`;
        });
        vpnMsg += `\n📝 *Pour commander* : Envoyez "Commander VPN [numéro du pack]"\nExemple : Commander VPN 1`;
        bot.sendMessage(chatId, vpnMsg, { parse_mode: 'Markdown' });
        return;
    }

    // Numéros Virtuels
    if (userMessage === '5' || userMessage.includes('numéro') || userMessage.includes('virtuel') || userMessage === '5️⃣ numéros virtuels') {
        let vnMsg = `📱 *${products.virtual_numbers.name}* 📱\n\n${products.virtual_numbers.description}\n\n💰 Prix : ${products.virtual_numbers.price}\n\n📝 *Pour commander* : Envoyez "Commander Numero"`;
        bot.sendMessage(chatId, vnMsg, { parse_mode: 'Markdown' });
        return;
    }

    // Paiement
    if (userMessage === '6' || userMessage.includes('paiement') || userMessage === '6️⃣ paiement') {
        let payMsg = `💰 *Moyens de Paiement Acceptés* 💰\n\nVeuillez effectuer votre dépôt sur l'un des numéros suivants :\n\n`;
        payments.forEach(p => {
            payMsg += `• *${p.name}* : ${p.details}\n`;
        });
        payMsg += `\n_Une fois le paiement effectué, envoyez une capture d'écran ici._`;
        bot.sendMessage(chatId, payMsg, { parse_mode: 'Markdown' });
        return;
    }

    // FAQ
    if (userMessage === '7' || userMessage.includes('faq') || userMessage === '7️⃣ faq') {
        let faqMsg = `❓ *Questions Fréquentes* ❓\n\n`;
        faq.forEach(f => {
            faqMsg += `*Q: ${f.q}*\nR: ${f.a}\n\n`;
        });
        bot.sendMessage(chatId, faqMsg, { parse_mode: 'Markdown' });
        return;
    }

    // Conseiller
    if (userMessage === '8' || userMessage.includes('conseiller') || userMessage === '8️⃣ conseiller') {
        bot.sendMessage(chatId, `👨‍💻 Un conseiller va vous répondre dès que possible. Veuillez patienter.`);
        if (OWNER_CHAT_ID) {
            bot.sendMessage(OWNER_CHAT_ID, `🔔 *Alerte* : Le client ${name} (ID: ${chatId}) souhaite parler à un conseiller.`, { parse_mode: 'Markdown' });
        }
        return;
    }

    // Commander
    if (userMessage.startsWith('commander')) {
        bot.sendMessage(chatId, `✅ *Commande enregistrée !*\n\nVeuillez procéder au paiement via Wave, MTN ou Orange Money, puis envoyez la capture d'écran ici.\n\nLe propriétaire a été notifié et traitera votre commande rapidement. ⏱️`, { parse_mode: 'Markdown' });
        if (OWNER_CHAT_ID) {
            bot.sendMessage(OWNER_CHAT_ID, `🛒 *Nouvelle Commande* de ${name} (ID: ${chatId}) :\n\n"${text}"\n\n_Veuillez vérifier le paiement et traiter la commande._`, { parse_mode: 'Markdown' });
        }
        return;
    }
});

console.log('Bot Telegram Melly Shop démarré !');
