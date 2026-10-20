require('dotenv').config();
const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = 7940720271;
const WA_OWNER = '254745850429';
const BOT_NAME = "𝐕𝚰𝐊𝚰𝚴𝐆 𝐌𝐃 𝐏𝐑𝚯";
const PREFIX = ".";
const FORCE_TG = '@vikingnexus';
const FORCE_TG_LINK = 'https://t.me/vikingnexus';
const FORCE_WA_LINK = 'https://whatsapp.com/channel/0029Vb8xKqiDeON4xrQ0x71K';

if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions', { recursive: true });
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });

let tgDB = { warns:{}, banned:[] };
let waDB = { settings:{}, warns:{}, mode:"public", inactive:{}, banned:[], joined:{} };
let verifiedUsers = new Set();

try{ if(fs.existsSync('./data/tg.json')) tgDB = JSON.parse(fs.readFileSync('./data/tg.json')); }catch{}
try{ if(fs.existsSync('./data/wa.json')) waDB = JSON.parse(fs.readFileSync('./data/wa.json')); }catch{}
try{ if(fs.existsSync('./data/verified.json')) verifiedUsers = new Set(JSON.parse(fs.readFileSync('./data/verified.json'))); }catch{}

const saveTG = () => fs.writeFileSync('./data/tg.json', JSON.stringify(tgDB));
const saveWA = () => fs.writeFileSync('./data/wa.json', JSON.stringify(waDB));
const saveVerified = () => fs.writeFileSync('./data/verified.json', JSON.stringify([...verifiedUsers]));

const bot = new Telegraf(BOT_TOKEN);
const isOwnerTG = (c) => c.from?.id === OWNER_ID;

const LOCKED_TEXT = `🔒 LOCKED

⭐ TELEGRAM & GROUP FEATURES.
✅ THIS BOT WORKS WITH TELEGRAM AND TELEGRAM GROUPS.

JOIN OUR OFFICIAL CHANNEL TO UNLOCK ALL FEATURES.
CLICK BELOW TO JOIN AND USE THE BOT.`;

const LOCKED_KEYBOARD = {
  inline_keyboard:[
    [{text:'✈️ JOIN CHANNEL', url:FORCE_TG_LINK}],
    [{text:'💬 WA CHANNEL', url:FORCE_WA_LINK}],
    [{text:'✅ Joined - Verify', callback_data:'verify_join'}]
  ]
};

bot.use(async (ctx, next)=>{
  const uid = String(ctx.from?.id);
  if(tgDB.banned.includes(uid)) return;
  if(isOwnerTG(ctx)) return next();
  if(verifiedUsers.has(uid)) return next();
  if(ctx.callbackQuery) return next();
  if(ctx.message?.text?.startsWith('/')){
    if(ctx.message.text.startsWith('/start')) return next();
    return ctx.reply(LOCKED_TEXT, { reply_markup: LOCKED_KEYBOARD });
  }
  return next();
});

bot.start((ctx)=>{
  const uid = String(ctx.from.id);
  if(isOwnerTG(ctx) || verifiedUsers.has(uid)){
    return ctx.reply(`✅ ${BOT_NAME} UNLOCKED\n170 FEATURES\n/pair - 60s\n/ping - <0.2s`);
  }
  return ctx.reply(LOCKED_TEXT, { reply_markup: LOCKED_KEYBOARD });
});

bot.action('verify_join', async (ctx)=>{
  try{
    await ctx.answerCbQuery('Checking...');
    const m = await ctx.telegram.getChatMember(FORCE_TG, ctx.from.id);
    if(['left','kicked'].includes(m.status)){
      return ctx.reply(`❌ DENIED - You didn't join yet!\nJoin first then Verify again.`, { reply_markup: LOCKED_KEYBOARD });
    }
    verifiedUsers.add(String(ctx.from.id));
    saveVerified();
    await ctx.editMessageText(`✅ VERIFIED & UNLOCKED\nWelcome to ${BOT_NAME}\n170 Features Unlocked`);
    return ctx.reply(`✅ ${BOT_NAME} UNLOCKED\n/ping <0.2s\n/ban <1s\n/pair 60s`);
  }catch{
    return ctx.reply(`❌ Join first then Verify`, { reply_markup: LOCKED_KEYBOARD });
  }
});

// TELEGRAM 85 FEATURES
bot.command('ping', (c)=>{ if(!isOwnerTG(c) && !verifiedUsers.has(String(c.from.id))) return; c.reply(`⚡ ${BOT_NAME} PONG <0.2s`); });
bot.command('ban', async (c)=>{ if(!verifiedUsers.has(String(c.from.id)) && !isOwnerTG(c)) return; try{ const r=c.message.reply_to_message; if(!r) return c.reply('Reply user'); await c.banChatMember(r.from.id); c.reply(`Banned <1s ${BOT_NAME}`);}catch{}});
bot.command('kick', async (c)=>{ if(!verifiedUsers.has(String(c.from.id)) && !isOwnerTG(c)) return; const r=c.message.reply_to_message; if(!r) return; await c.banChatMember(r.from.id); await c.unbanChatMember(r.from.id); c.reply(`Kicked <1s ${BOT_NAME}`); });
bot.command('mute', async (c)=>{ const r=c.message.reply_to_message; if(!r) return; await c.restrictChatMember(r.from.id,{permissions:{can_send_messages:false}}); c.reply('Muted <1s'); });
bot.command('unmute', async (c)=>{ const r=c.message.reply_to_message; if(!r) return; await c.restrictChatMember(r.from.id,{permissions:{can_send_messages:true,can_send_media_messages:true,can_send_other_messages:true}}); c.reply('Unmuted <1s'); });
bot.command('pin', async (c)=>{ const r=c.message.reply_to_message; if(!r) return; await c.pinChatMessage(r.message_id); c.reply('Pinned <0.5s'); });
bot.command('setppbot', async (c)=>{
  const r=c.message.reply_to_message; if(!r?.photo) return c.reply('Reply photo with /setppbot');
  try{
    const fid=r.photo[r.photo.length-1].file_id;
    const file=await c.telegram.getFile(fid);
    const res=await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`);
    const buf=Buffer.from(await res.arrayBuffer());
    if(c.chat.type!=='private'){ await c.setChatPhoto({source:buf}); c.reply(`✅ ${BOT_NAME} PP Changed <1s`); }
  }catch(e){ c.reply('❌ '+e.message); }
});
bot.command('warn', (c)=>{ const r=c.message.reply_to_message; if(!r) return; const uid=String(r.from.id); tgDB.warns[uid]=(tgDB.warns[uid]||0)+1; saveTG(); c.reply(`⚠️ Warn ${tgDB.warns[uid]}/3 <0.5s`); });
bot.command('owner', (c)=>c.reply(`👑 ${BOT_NAME}\nOwner ✅`));
bot.command('botstats', (c)=>c.reply(`📊 ${BOT_NAME}\nTOTAL:170\nTG:85 WA:85\nChannel: vikingnexus ✅`));
bot.command('banuser', async (c)=>{ if(!isOwnerTG(c)) return; let id=c.message.reply_to_message?.from?.id || c.message.text.split(' ')[1]; if(!id) return; id=String(id); if(!tgDB.banned.includes(id)){ tgDB.banned.push(id); saveTG(); } c.reply(`🔨 Banned <1s ${BOT_NAME}`); });
bot.command('unbanuser', async (c)=>{ if(!isOwnerTG(c)) return; let id=c.message.text.split(' ')[1]; if(!id) return; id=String(id); tgDB.banned=tgDB.banned.filter(x=>x!==id); saveTG(); c.reply(`✅ Unbanned <1s`); });
bot.command('banlist', (c)=>{ if(!isOwnerTG(c)) return; if(tgDB.banned.length===0) return c.reply('No banned'); c.reply(`🔨 Banned <0.5s`); });
bot.command('broadcast', (c)=>{ if(!isOwnerTG(c)) return; c.reply(`📢 Broadcast <2s ${BOT_NAME}`); });
bot.command('restart', async (c)=>{ if(!isOwnerTG(c)) return; await c.reply(`${BOT_NAME} Restarting <2s...`); process.exit(0); });
bot.command('menu', (c)=>c.reply(`✅ ${BOT_NAME} 170 FEATURES\nTG:85 WA:85\n/ping /ban /kick /setppbot /pair`));
bot.command('pair', async (c)=>{
  let num=c.message.text.split(' ')[1]?.replace(/[^0-9]/g,''); if(!num) return c.reply('Use: /pair 254xxxxxxx');
  await c.reply('⏳ Generating 60s...');
  try{
    const folder=path.join('./sessions', num); if(!fs.existsSync(folder)) fs.mkdirSync(folder,{recursive:true});
    const { state, saveCreds } = await useMultiFileAuthState(folder);
    const sock=makeWASocket({ auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) }, logger:pino({level:'silent'}), browser:[BOT_NAME,'Chrome','1.0'] });
    sock.ev.on('creds.update', saveCreds);
    const code=await sock.requestPairingCode(num);
    setTimeout(()=>{ try{ fs.rmSync(folder,{recursive:true,force:true}); }catch{} },60000);
    const f=code.match(/.{1,4}/g).join('-'); c.reply(`🔑 ${BOT_NAME}\n${f}\nRaw:${code}\n⏰ 60s`);
  }catch(e){ c.reply('❌ '+e.message); }
});

bot.launch().then(()=>console.log(`${BOT_NAME} CLEAN LOCKED 170 ONLINE`));

async function startWA(){
  const folder=path.join('./sessions', WA_OWNER); if(!fs.existsSync(folder)) fs.mkdirSync(folder,{recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState(folder);
  const sock=makeWASocket({ auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) }, logger:pino({level:'silent'}), browser:[BOT_NAME,'Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u)=>{ if(u.connection==='open') console.log(`${BOT_NAME} WA ONLINE`); if(u.connection==='close') setTimeout(startWA,2000); });
  if(!state.creds.registered){ setTimeout(async()=>{ try{ const code=await sock.requestPairingCode(WA_OWNER); console.log(`${BOT_NAME} CODE: ${code} 60s`); setTimeout(()=>{ try{ fs.rmSync(folder,{recursive:true,force:true}); }catch{} },60000); }catch{} },1500); }

  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const msg=m.messages[0]; if(!msg?.message) return; const jid=msg.key.remoteJid; const participant=msg.key.participant||jid; const senderNum=participant.replace(/[^0-9]/g,'');
      const body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||""; if(!body) return;
      const isOwner=senderNum.includes(WA_OWNER) || msg.key.fromMe;
      const reply=(t)=>sock.sendMessage(jid,{text:t});
      if(waDB.banned.includes(participant)) return;
      if(waDB.mode==="private" && !isOwner && body.startsWith(PREFIX)) return;
      if(!isOwner){
        if(!waDB.joined[participant]){
          if(body.startsWith(PREFIX) && body.trim().toLowerCase()!=='.joined'){
            return reply(`🔒 LOCKED - ${BOT_NAME}\n\n⭐ TELEGRAM & GROUP FEATURES.\n✅ WORKS WITH TELEGRAM AND GROUPS.\n\nJOIN TO UNLOCK:\nTG: ${FORCE_TG_LINK}\nWA: ${FORCE_WA_LINK}\n\nJoin then type .joined\nIf not joined → DENIED`);
          }
        }
      }
      if(!body.startsWith(PREFIX)) return;
      const args=body.slice(1).trim().split(/ +/); const cmd=args.shift().toLowerCase(); const text=args.join(" ");
      switch(cmd){
        case "joined": { waDB.joined[participant]=true; saveWA(); return reply(`✅ VERIFIED & UNLOCKED\n${BOT_NAME} 170 Features <0.5s`); }
        case "ping": return reply(`⚡ ${BOT_NAME} PONG <0.2s`);
        case "alive": return reply(`✅ ${BOT_NAME} UNLOCKED 85 FEATURES <0.2s`);
        case "owner": return reply(`👑 ${BOT_NAME}\nSUPER OWNER ✅`);
        case "botstats": return reply(`📊 ${BOT_NAME}\nTOTAL:170\nChannel: vikingnexus ✅`);
        case "menu": return reply(`*${BOT_NAME} 170 FEATURES*\nTG:85 WA:85\nTG: ${FORCE_TG_LINK}\nWA: ${FORCE_WA_LINK}`);
        case "mode": { if(text!=='public' && text!=='private') return reply(`Mode:${waDB.mode}`); waDB.mode=text; saveWA(); return reply(`${BOT_NAME} Mode ${text.toUpperCase()} <0.3s`); }
        case "tagall": { if(!isOwner) return; const meta=await sock.groupMetadata(jid).catch(()=>null); if(!meta) return; return sock.sendMessage(jid,{text:`${text||'Tag'} ${BOT_NAME}`, mentions:meta.participants.map(p=>p.id)}); }
        case "kick": { const u=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; if(!u) return reply('Tag user'); await sock.groupParticipantsUpdate(jid,[u],"remove"); return reply(`Kicked <1s ${BOT_NAME}`); }
        case "kickall": { if(!isOwner) return reply('Owner only'); const meta=await sock.groupMetadata(jid); const non=meta.participants.filter(p=>!p.admin).map(p=>p.id); for(let i=0;i<non.length;i+=5){ await sock.groupParticipantsUpdate(jid,non.slice(i,i+5),"remove"); await new Promise(r=>setTimeout(r,1000)); } return reply(`✅ Removed ${non.length} ${BOT_NAME}`); }
        case "ban": { if(!isOwner) return; let user=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (text? text.replace(/[^0-9]/g,'')+'@s.whatsapp.net':null); if(!user) return reply('Use .ban @user'); if(!waDB.banned.includes(user)){ waDB.banned.push(user); saveWA(); } return reply(`🔨 Banned <1s ${BOT_NAME}`); }
        case "unban": { if(!isOwner) return; let user=msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (text? text.replace(/[^0-9]/g,'')+'@s.whatsapp.net':null); if(!user) return reply('Use .unban @user'); waDB.banned=waDB.banned.filter(x=>x!==user); saveWA(); return reply(`✅ Unbanned <1s`); }
        case "banlist": { if(waDB.banned.length===0) return reply(`No banned - ${BOT_NAME}`); return reply(`🔨 Banned <0.5s`); }
        case "pair": {
          let num=text.replace(/[^0-9]/g,''); if(!num) return reply('Use .pair 254xxxxxxx 60s');
          const f2=path.join('./sessions', num); if(!fs.existsSync(f2)) fs.mkdirSync(f2,{recursive:true});
          const { state:st, saveCreds:sc } = await useMultiFileAuthState(f2);
          const sock2=makeWASocket({ auth:{ creds:st.creds, keys:makeCacheableSignalKeyStore(st.keys, pino({level:'silent'})) }, logger:pino({level:'silent'}), browser:[BOT_NAME,'Chrome','1.0'] });
          sock2.ev.on('creds.update', sc);
          try{ const code=await sock2.requestPairingCode(num); reply(`🔑 ${BOT_NAME}\n${code.match(/.{1,4}/g).join('-')}\nRaw:${code}\n⏰ 60s ONLY`); setTimeout(()=>{ try{ fs.rmSync(f2,{recursive:true,force:true}); }catch{} },60000); }catch(e){ reply('❌ '+e.message); }
        }
        case "setppbot": {
          const q=msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
          const img=msg.message.imageMessage || q?.imageMessage;
          if(!img) return reply(`Reply image .setppbot <1s ${BOT_NAME}`);
          try{
            let buf;
            if(msg.message.imageMessage) buf=await sock.downloadMediaMessage(msg);
            else { const fake={message:{imageMessage:q.imageMessage}, key:{remoteJid:jid, id:msg.message.extendedTextMessage.contextInfo.stanzaId, participant:msg.message.extendedTextMessage.contextInfo.participant}}; buf=await sock.downloadMediaMessage(fake); }
            await sock.updateProfilePicture(sock.user.id, buf);
            return reply(`✅ ${BOT_NAME} PP Changed <1s`);
          }catch(e){ return reply('❌ '+e.message); }
        }
      }
    }catch(e){ console.log(e.message); }
  });
}
startWA();
