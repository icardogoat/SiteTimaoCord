
import discord
from discord.ext import commands
from discord import app_commands
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import datetime
import re

load_dotenv()

# --- Helper Functions & Checks ---

def is_admin():
    async def predicate(interaction: discord.Interaction) -> bool:
        bot = interaction.client
        config_collection = bot.db.timaocord_bot.config
        config_doc = config_collection.find_one({"_id": ObjectId('669fdb5a907548817b848c48')})
        
        if not config_doc or not config_doc.get('adminRoleId'):
            await interaction.response.send_message("❌ O cargo de administrador não está configurado.", ephemeral=True)
            return False
            
        admin_role_id = int(config_doc['adminRoleId'])
        admin_role = interaction.guild.get_role(admin_role_id)

        if not admin_role:
            await interaction.response.send_message(f"❌ O cargo de administrador com ID `{admin_role_id}` não foi encontrado.", ephemeral=True)
            return False

        if admin_role in interaction.user.roles:
            return True
        else:
            await interaction.response.send_message("❌ Você não tem permissão para usar este comando.", ephemeral=True)
            return False

    return app_commands.check(predicate)

def parse_duration(duration_str: str) -> datetime.timedelta | None:
    regex = re.compile(r'(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?')
    parts = regex.match(duration_str)
    if not parts:
        return None
    parts = parts.groups()
    time_params = {}
    if parts[0]: time_params['days'] = int(parts[0])
    if parts[1]: time_params['hours'] = int(parts[1])
    if parts[2]: time_params['minutes'] = int(parts[2])
    if parts[3]: time_params['seconds'] = int(parts[3])
    if not time_params:
        return None
    return datetime.timedelta(**time_params)

class Moderation(commands.Cog):
    def __init__(self, bot):
        self.bot: commands.Bot = bot
        if not hasattr(bot, 'db'):
            bot.db = MongoClient(os.getenv('MONGODB_URI'))
        
        self.db_timaocord = bot.db.timaocord
        self.users_collection = self.db_timaocord.users
        self.mod_actions_collection = self.db_timaocord.moderation_actions
        self.config_collection = bot.db.timaocord_bot.config

    async def get_mod_log_channel(self):
        config_doc = self.config_collection.find_one({"_id": ObjectId('669fdb5a907548817b848c48')})
        if not config_doc or not config_doc.get('moderationLogChannelId'):
            return None
        return self.bot.get_channel(int(config_doc['moderationLogChannelId']))

    async def log_action(self, embed: discord.Embed):
        channel = await self.get_mod_log_channel()
        if channel:
            await channel.send(embed=embed)

    # --- Commands ---

    @app_commands.command(name="advertencia", description="[Admin] Aplica uma advertência a um usuário.")
    @app_commands.describe(usuario="O usuário a ser advertido.", motivo="O motivo da advertência.")
    @is_admin()
    async def warn(self, interaction: discord.Interaction, usuario: discord.Member, motivo: str):
        await interaction.response.defer(ephemeral=True)
        
        action = {
            "userId": str(usuario.id),
            "userName": usuario.display_name,
            "userAvatar": str(usuario.display_avatar.url),
            "moderatorId": str(interaction.user.id),
            "moderatorName": interaction.user.display_name,
            "type": "WARN",
            "reason": motivo,
            "createdAt": datetime.datetime.now(datetime.timezone.utc)
        }
        result = self.mod_actions_collection.insert_one(action)
        
        # Log to mod channel
        log_embed = discord.Embed(
            title="⚠️ Advertência Aplicada",
            color=discord.Color.orange(),
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        log_embed.add_field(name="Usuário", value=f"{usuario.mention} (`{usuario.id}`)", inline=False)
        log_embed.add_field(name="Moderador", value=f"{interaction.user.mention}", inline=False)
        log_embed.add_field(name="Motivo", value=motivo, inline=False)
        log_embed.set_footer(text=f"ID da Ação: {result.inserted_id}")
        await self.log_action(log_embed)

        # DM the user
        try:
            dm_embed = discord.Embed(
                title="⚠️ Você Recebeu uma Advertência",
                description=f"Você recebeu uma advertência no servidor **{interaction.guild.name}**.",
                color=discord.Color.orange()
            )
            dm_embed.add_field(name="Motivo", value=motivo, inline=False)
            dm_embed.set_footer(text="Advertências repetidas podem levar a punições mais severas.")
            await usuario.send(embed=dm_embed)
        except discord.Forbidden:
            pass # Can't DM user

        await interaction.followup.send(f"✅ Advertência aplicada a {usuario.mention} com sucesso.", ephemeral=True)

    @app_commands.command(name="castigo", description="[Admin] Coloca um usuário de castigo (timeout).")
    @app_commands.describe(usuario="O usuário a ser punido.", duracao="A duração do castigo (ex: 10m, 1h, 7d).", motivo="O motivo do castigo.")
    @is_admin()
    async def timeout(self, interaction: discord.Interaction, usuario: discord.Member, duracao: str, motivo: str):
        await interaction.response.defer(ephemeral=True)

        delta = parse_duration(duracao)
        if delta is None or delta.total_seconds() > datetime.timedelta(days=28).total_seconds():
            await interaction.followup.send("❌ Duração inválida. Use um formato como `10m`, `1h`, `7d`. Máximo de 28 dias.", ephemeral=True)
            return
            
        try:
            await usuario.timeout(delta, reason=motivo)
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para castigar este usuário.", ephemeral=True)
            return
            
        expires_at = datetime.datetime.now(datetime.timezone.utc) + delta
        action = {
            "userId": str(usuario.id), "userName": usuario.display_name, "userAvatar": str(usuario.display_avatar.url),
            "moderatorId": str(interaction.user.id), "moderatorName": interaction.user.display_name,
            "type": "MUTE", "reason": motivo, "duration": duracao, "expiresAt": expires_at,
            "createdAt": datetime.datetime.now(datetime.timezone.utc)
        }
        result = self.mod_actions_collection.insert_one(action)
        
        log_embed = discord.Embed(title="⏳ Usuário de Castigo", color=discord.Color.blue(), timestamp=datetime.datetime.now(datetime.timezone.utc))
        log_embed.add_field(name="Usuário", value=f"{usuario.mention} (`{usuario.id}`)", inline=False)
        log_embed.add_field(name="Moderador", value=f"{interaction.user.mention}", inline=False)
        log_embed.add_field(name="Duração", value=duracao, inline=True)
        log_embed.add_field(name="Expira em", value=f"<t:{int(expires_at.timestamp())}:R>", inline=True)
        log_embed.add_field(name="Motivo", value=motivo, inline=False)
        log_embed.set_footer(text=f"ID da Ação: {result.inserted_id}")
        await self.log_action(log_embed)

        await interaction.followup.send(f"✅ {usuario.mention} foi colocado de castigo por {duracao}.", ephemeral=True)
        
    @app_commands.command(name="ban", description="[Admin] Bane um usuário do servidor e da plataforma.")
    @app_commands.describe(usuario="O usuário a ser banido.", motivo="O motivo do banimento.")
    @is_admin()
    async def ban(self, interaction: discord.Interaction, usuario: discord.Member, motivo: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            await usuario.ban(reason=f"Banido por {interaction.user.name}: {motivo}")
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para banir este usuário no Discord.", ephemeral=True)
            return

        self.users_collection.update_one({"discordId": str(usuario.id)}, {"$set": {"status": "Banned"}})

        action = {
            "userId": str(usuario.id), "userName": usuario.display_name, "userAvatar": str(usuario.display_avatar.url),
            "moderatorId": str(interaction.user.id), "moderatorName": interaction.user.display_name,
            "type": "BAN", "reason": motivo,
            "createdAt": datetime.datetime.now(datetime.timezone.utc)
        }
        result = self.mod_actions_collection.insert_one(action)
        
        log_embed = discord.Embed(title="🚫 Usuário Banido", color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
        log_embed.add_field(name="Usuário", value=f"{usuario.mention} (`{usuario.id}`)", inline=False)
        log_embed.add_field(name="Moderador", value=f"{interaction.user.mention}", inline=False)
        log_embed.add_field(name="Motivo", value=motivo, inline=False)
        log_embed.set_footer(text=f"ID da Ação: {result.inserted_id}")
        await self.log_action(log_embed)
        
        await interaction.followup.send(f"✅ Usuário {usuario.name} foi banido com sucesso.", ephemeral=True)

    @app_commands.command(name="unban", description="[Admin] Desbane um usuário.")
    @app_commands.describe(id_usuario="O ID do usuário a ser desbanido.", motivo="O motivo do desbanimento.")
    @is_admin()
    async def unban(self, interaction: discord.Interaction, id_usuario: str, motivo: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            user = await self.bot.fetch_user(int(id_usuario))
            await interaction.guild.unban(user, reason=motivo)
        except (ValueError, discord.NotFound):
            await interaction.followup.send("❌ Usuário não encontrado ou ID inválido.", ephemeral=True)
            return
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para desbanir usuários.", ephemeral=True)
            return

        self.users_collection.update_one({"discordId": id_usuario}, {"$set": {"status": "Active"}})

        action = {
            "userId": id_usuario, "userName": user.name, "userAvatar": str(user.display_avatar.url),
            "moderatorId": str(interaction.user.id), "moderatorName": interaction.user.display_name,
            "type": "UNBAN", "reason": motivo,
            "createdAt": datetime.datetime.now(datetime.timezone.utc)
        }
        result = self.mod_actions_collection.insert_one(action)

        log_embed = discord.Embed(title="🔓 Usuário Desbanido", color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc))
        log_embed.add_field(name="Usuário", value=f"{user.mention} (`{user.id}`)", inline=False)
        log_embed.add_field(name="Moderador", value=f"{interaction.user.mention}", inline=False)
        log_embed.add_field(name="Motivo", value=motivo, inline=False)
        log_embed.set_footer(text=f"ID da Ação: {result.inserted_id}")
        await self.log_action(log_embed)
        
        await interaction.followup.send(f"✅ Usuário {user.name} foi desbanido com sucesso.", ephemeral=True)
        
    @app_commands.command(name="lock", description="[Admin] Bloqueia o canal atual para envio de mensagens.")
    @is_admin()
    async def lock(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        channel = interaction.channel
        overwrite = channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = False
        
        try:
            await channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
            await interaction.followup.send(f"🔒 Canal {channel.mention} foi bloqueado.", ephemeral=True)
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para alterar as permissões deste canal.", ephemeral=True)

    @app_commands.command(name="unlock", description="[Admin] Desbloqueia o canal atual.")
    @is_admin()
    async def unlock(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        channel = interaction.channel
        overwrite = channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = None # Resets to default
        
        try:
            await channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
            await interaction.followup.send(f"🔓 Canal {channel.mention} foi desbloqueado.", ephemeral=True)
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para alterar as permissões deste canal.", ephemeral=True)


async def setup(bot):
    await bot.add_cog(Moderation(bot))
