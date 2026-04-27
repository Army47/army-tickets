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

const roles = {
  '⬅️': "1498418722673655848",
  '➡️': "1498418768848752801",
  '🏛️': "1498418827455627366",
  '⚡': "1498418867565891784",
  '🎯': "1498418899346002020"
};

const posicionesRoles = {
  "Izquierda": roles['⬅️'],
  "Hold Derecha": roles['➡️'],
  "Piazza": roles['🏛️'],
  "Push": roles['⚡'],
  "Hold Medio": roles['🎯']
};

// ================= READY =================

client.once('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});

// ================= COMANDOS =================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // PANEL
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

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // POSIS
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

    for (const emoji of Object.keys(roles)) {
      await msg.react(emoji);
    }

    config.posis.messageId = msg.id;
    saveConfig();
  }

  // VER POSICIONES
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
      texto += `**${nombre}:** ${miembros.length ? miembros.join(', ') : 'Nadie'}\n\n`;
    }

    const msg = await message.reply(texto);

    setTimeout(() => {
      msg.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 60000);
  }
});

// ================= AUTOROLES =================

// ➕ Añadir rol (permite múltiples)
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();

  if (reaction.message.id !== config.posis.messageId) return;

  const roleId = roles[reaction.emoji.name];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id);

  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId).catch(console.error);
  }
});

// ➖ Quitar rol
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

  const logChannel = interaction.guild.channels.cache.get(config.logChannelId);

  // CREAR
  if (interaction.customId === 'crear_ticket') {

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `🎫-${interaction.user.username}`
    );

    if (existing) {
      return interaction.reply({
        content: `❌ Ya tienes un ticket abierto: ${existing}`,
        ephemeral: true
      });
    }

    const channel = await interaction.guild.channels.create({
      name: `🎫-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.id_categoria,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    ticketOwners.set(channel.id, interaction.user.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('cerrar_ticket')
        .setLabel('❌ Cerrar Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Abierto')
      .setDescription(config.ticket.mensaje)
      .setColor(0x000000);

    await channel.send({
      content: `👋 ${interaction.user}`,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({ content: `Ticket creado: ${channel}`, ephemeral: true });
  }

  // CERRAR
  if (interaction.customId === 'cerrar_ticket') {

    await interaction.reply('Cerrando ticket...');

    const messages = await interaction.channel.messages.fetch({ limit: 100 });

    const ownerId = ticketOwners.get(interaction.channel.id);
    const ownerUser = await client.users.fetch(ownerId).catch(() => null);

    const transcript = [
      `👤 ${ownerUser?.tag}`,
      `🔒 ${interaction.user.tag}`,
      ...messages.reverse().map(m => `${m.author.tag}: ${m.content}`)
    ].join('\n');

    if (logChannel) {
      await logChannel.send({
        files: [{
          attachment: Buffer.from(transcript),
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