import 'dotenv/config';
import { Client } from 'discord.js';
import { OpenAI } from 'openai';

const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})

client.on('ready', () => {
    console.log('The bot is online.')
})

const IGNORE_PREFIX = "!";
const CHANNELS = ['']; // discord channel id's
const prompt = 'ChatGPT is a friendly chatbot'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
})

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) 
        return;

    // typing animation as visual indicator
    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000)

    let conversation = [];
    conversation.push({
        role: 'assistant',
        content: prompt,
    })

    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;
        if (msg.content.startsWith(IGNORE_PREFIX)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');
    
        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            })

            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content,
        })
    })

    const response = await openai.chat.completions
        .create({
            model: 'gpt-4', // can change to experimental/older models
            messages: conversation,
        }).catch((error) => console.error('OpenAI Error:\n', error));

    clearInterval(sendTypingInterval);

    if(!response) {
        message.reply(`I'm having trouble with OpenAI, please try again in a moment`)
        return;
    }

    // discord max limit per message is 2000 chars
    // break up chatgpt replies into 2000 char chunks
    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);

        await message.reply(chunk);
    }

    message.reply(responseMessage);
})

client.login(process.env.DISCORD_TOKEN);
