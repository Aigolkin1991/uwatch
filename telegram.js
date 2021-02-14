const TOKEN = require('./config').telegram.token;
const TelegramBot = require('node-telegram-bot-api');
const { respondToApiCall } = require('./api');

const bot = new TelegramBot(TOKEN, {polling: true});

const _getRequestParams = (msg) => {
    const chatId = (msg.chat || msg.from || {}).id || 0;
    if (!chatId) {
        throw new Error('No chat id recieved');
    }

    const [command, args] = (msg.entities && msg.entities[0].type === 'bot_command' && msg.text || msg.data || '').split('!!');
    if (!command) {
        throw new Error('No command recieved');
    }

    const commandArg = (args || '').split('@@');

    const userName = msg.from.username || '';
    if (!userName) {
        throw new Error('No username recieved');
    }

    return {chatId, command, commandArg, userName};
}

bot.on('message', (msg) => {
    const requestParams = _getRequestParams(msg)
    const {chatId} = requestParams;
    const response = respondToApiCall(requestParams);
    if(!response){
        bot.sendMessage(chatId, "No command");    
    } else {
        bot.sendMessage(chatId, response.text, {
            reply_markup: JSON.stringify({ inline_keyboard: response.inline_keyboard || [] })
        });
    }
});
bot.on('polling_error', (err) => {
    console.error(err)
})
bot.on('callback_query', async (msg) => {
    const requestParams = _getRequestParams(msg)
    const {chatId} = requestParams;
    const response = await respondToApiCall(requestParams);
    if (response) {
        if(Array.isArray(response)){
            for (let val of response) {
                await bot.sendMessage(chatId, val.text, {
                    reply_markup: JSON.stringify({ inline_keyboard: val.inline_keyboard || [] })
                });
            }
        } else {
            bot.sendMessage(chatId, response.text, {
                reply_markup: JSON.stringify({ inline_keyboard: response.inline_keyboard || [] })
            });
        }
    }
})

module.exports = bot;