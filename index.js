require('dotenv').config({ path: './.env' });

const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const ticketOwners = new Map();


// ================= ROLES =================

const posicionesRoles = {
  "Izquierda": "1498418722673655848",
  "Hold Derecha": "1498418768848752801",
  "Piazza": "1498418827455627366",
  "Push": "1498418867565891784",
  "Hold Medio": "1498418899346002020"
};

const roles = {
  '⬅️': "1498418722673655848",
  '➡️': "1498418768848752801",
  '🏛️': "1498418827455627366",
  '⚡': "1498418867565891784",
  '🎯': "1498418899346002020"
};


// ================= READY =================

client.once('clientReady', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});


// ================= COMANDOS =================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // PANEL TICKETS
  if (message.content === '!panel') {

  const embed = new EmbedBuilder()
    .setTitle('**FORZA COMMUNITY**')
    .setImage('https://media.discordapp.net/attachments/1483568796013953175/1492216666690687057/image0.jpg')
    .setColor(0x000000);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('crear_ticket')
      .setLabel('🎫 Crear Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await message.channel.send({
    embeds: [embed],
    components: [row]
  });

}

  // RENAME STAFF
  if (message.content.startsWith('!rename')) {

    const staffRole = message.guild.roles.cache.find(
      r => r.name === 'Encargado Tickets'
    );

    if (!staffRole || !message.member.roles.cache.has(staffRole.id)) {
      return message.reply('❌ Solo el staff puede usar esto.');
    }

    if (!message.channel.name.startsWith('🎫-')) {
      return message.reply('Solo en tickets.');
    }

    const args = message.content.split(' ').slice(1);
    const newName = args.join('-');

    if (!newName) {
      return message.reply('Ejemplo: !rename soporte');
    }

    await message.channel.setName(`🎫-${newName}`);
    message.channel.send(`✏️ Nombre cambiado a: 🎫-${newName}`);
  }

  // ================= PANEL POSICIONES =================
  if (message.content === '!posis') {

    if (message.channel.id !== config.posis.channelId) {

  const aviso = await message.reply('❌ Canal incorrecto.');

  setTimeout(() => {
    aviso.delete().catch(() => {});
    message.delete().catch(() => {});
  }, 10000);

  return;
}
    const msg = await message.channel.send(
`📌 **Selecciona tu posición**

⬅️ Izquierda  
➡️ Hold Derecha  
🏛️ Piazza  
⚡ Push  
🎯 Hold Medio`
    );

    await msg.react('⬅️');
    await msg.react('➡️');
    await msg.react('🏛️');
    await msg.react('⚡');
    await msg.react('🎯');

    // guardar ID automático
    config.posis.messageId = msg.id;
    saveConfig();
  }

  // ================= VER POSICIONES =================
  if (message.content === '!posiciones') {

  if (message.channel.id !== config.posiciones.channelId) {

  const aviso = await message.reply('❌ Este comando no va aquí.');

  setTimeout(() => {
    aviso.delete().catch(() => {});
    message.delete().catch(() => {});
  }, 10000);

  return;
}

    let texto = '📊 **Posiciones actuales**\n\n';

    for (const [nombre, roleId] of Object.entries(posicionesRoles)) {
      const role = message.guild.roles.cache.get(roleId);
      const miembros = role ? role.members.map(m => `<@${m.id}>`) : [];

      texto += `**${nombre}:** ${
        miembros.length ? miembros.join(', ') : 'Nadie'
      }\n\n`;
    }

    const msg = await message.reply(texto);

    setTimeout(() => {
      msg.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 60000);
  }
});


// ================= REACCIONES =================

// AÑADIR ROL
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  if (reaction.message.id !== config.posis.messageId) return;

  const roleId = roles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.add(roleId).catch(console.error);
});

// QUITAR ROL
client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  if (reaction.message.id !== config.posis.messageId) return;

  const roleId = roles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.remove(roleId).catch(console.error);
});


// ================= TICKETS =================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const logChannel = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);

  if (interaction.customId === 'crear_ticket') {

    const name = `🎫-${interaction.user.username}`;

    const channel = await interaction.guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: config.id_categoria,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    ticketOwners.set(channel.id, interaction.user.id);

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('cerrar_ticket')
        .setLabel('❌ Cerrar Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Abierto')
      .setDescription(
  config.ticket.mensaje.replace('{user}', `${interaction.user}`)
)
      .setColor(0x000000);

    await channel.send({
      content: `👋 ${interaction.user}`,
      embeds: [embed],
      components: [closeBtn]
    });

    interaction.reply({ content: `Ticket creado: ${channel}`, ephemeral: true });
  }

  if (interaction.customId === 'cerrar_ticket') {
  await interaction.reply('Cerrando ticket...');

  const logChannel = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);

  const messages = await interaction.channel.messages.fetch({ limit: 100 });

  const ownerId = ticketOwners.get(interaction.channel.id);
  const ownerUser = await client.users.fetch(ownerId).catch(() => null);

  const transcriptContent = [
    `===== TRANSCRIPCIÓN =====`,
    `👤 Creador: ${ownerUser ? ownerUser.tag : 'Desconocido'}`,
    `🔒 Cerrado por: ${interaction.user.tag}`,
    `📅 Fecha: ${new Date().toLocaleString()}`,
    `=========================\n`,
    ...messages.reverse().map(m => `${m.author.tag}: ${m.content}`)
  ].join('\n');

  if (!logChannel) {
    console.log("❌ LOG_CHANNEL_ID no encontrado");
  } else {
    await logChannel.send({
      content: `🔴 Ticket cerrado`,
      files: [{
        attachment: Buffer.from(transcriptContent, 'utf-8'),
        name: `transcript-${interaction.channel.name}.txt`
      }]
    });
  }

  ticketOwners.delete(interaction.channel.id);

  setTimeout(() => {
    interaction.channel.delete().catch(console.error);
  }, 3000);
}
});

client.login(process.env.TOKEN);