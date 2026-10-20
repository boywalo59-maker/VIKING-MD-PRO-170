require('dotenv').config();
console.log('🔒 VIKING MD PRO - 170 FEATURES LOADING...');
console.log('TG: https://t.me/vikingnexus');
console.log('WA: https://whatsapp.com/channel/0029Vb8xKqiDeON4xrQ0x71K');
console.log('-----------------------------------');

require('./bot.js');

process.on('uncaughtException', e => console.log(e.message));
process.on('unhandledRejection', e => console.log(e.message));
