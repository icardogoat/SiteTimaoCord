
import discord
from discord.ext import commands
from discord import app_commands
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import datetime

load_dotenv()

# --- Helper Functions & Checks ---

# We define a simple check here to be used with commands.
# It checks if the user has the admin role defined in the bot's config.
def is_admin():
    async def predicate(interaction: discord.Interaction) -> bool:
        # This assumes the bot object is accessible via interaction.client
        bot = interaction.client
        # The database connection is also stored on the bot object in this design
        config_collection = bot.db.timaocord_bot.config
        
        # Fixed ID for the single bot config document
        config_doc = config_collection.find_one({"_id": ObjectId('669fdb5a907548817b848c48')})
        
        if not config_doc or not config_doc.get('adminRoleId'):
            await interaction.response.send_message("❌ O cargo de administrador não está configurado. Não é possível usar este comando.", ephemeral=True)
            return False
            
        admin_role_id = int(config_doc['adminRoleId'])
        admin_role = interaction.guild.get_role(admin_role_id)

        if not admin_role:
            await interaction.response.send_message(f"❌ O cargo de administrador com ID `{admin_role_id}` não foi encontrado no servidor.", ephemeral=True)
            return False

        if admin_role in interaction.user.roles:
            return True
        else:
            await interaction.response.send_message("❌ Você não tem permissão para usar este comando.", ephemeral=True)
            return False

    return app_commands.check(predicate)


class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot: commands.Bot = bot
        # Store the db client on the bot object so checks can access it
        if not hasattr(bot, 'db'):
            bot.db = MongoClient(os.getenv('MONGODB_URI'))
        
        self.client = bot.db
        self.db_timaocord = self.client.timaocord
        self.users_collection = self.db_timaocord.users
        self.bets_collection = self.db_timaocord.bets
        self.matches_collection = self.db_timaocord.matches
        self.config_collection = self.client.timaocord_bot.config

    def cog_unload(self):
        # The client is shared, so we don't close it here.
        # It should be closed when the bot shuts down.
        pass

    # --- Utility Functions ---
    async def get_config(self):
        return self.config_collection.find_one({"_id": ObjectId('669fdb5a907548817b848c48')})

    async def log_action(self, title: str, description: str, color: discord.Color, interaction: discord.Interaction):
        config = await self.get_config()
        log_channel_id = config.get('logChannelId')
        if not log_channel_id:
            return

        log_channel = self.bot.get_channel(int(log_channel_id))
        if log_channel:
            embed = discord.Embed(title=title, description=description, color=color, timestamp=datetime.datetime.now(datetime.timezone.utc))
            embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
            await log_channel.send(embed=embed)

    # --- Command Group ---
    admin_group = app_commands.Group(name="admin", description="Comandos exclusivos para administradores.", default_permissions=discord.Permissions(administrator=True))


    # --- Admin Commands ---

    @admin_group.command(name="ajuda", description="📋 Mostra todos os comandos de administrador.")
    @is_admin()
    async def ajuda_admin(self, interaction: discord.Interaction):
        embed = discord.Embed(title="⚙️ Comandos de Administração", description="Lista de comandos disponíveis para a equipe.", color=0x7289da)
        
        command_list = [
            "`/admin ajuda`: Mostra esta mensagem.",
            "`/admin status`: Exibe estatísticas rápidas da plataforma.",
            "`/admin proximo_jogo`: Mostra o próximo jogo do Corinthians.",
            "`/admin anuncio [canal] [titulo] [mensagem]`: Envia um anúncio em um canal específico.",
            "`/admin ban [usuário] [motivo]`: Bane um usuário do Discord e da plataforma.",
            "`/admin unban [id_usuario] [motivo]`: Desbane um usuário do Discord.",
        ]
        
        embed.add_field(name="Comandos", value="\n".join(command_list), inline=False)
        embed.set_footer(text="Use com sabedoria.")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @admin_group.command(name="status", description="📊 Exibe estatísticas rápidas da plataforma.")
    @is_admin()
    async def status_plataforma(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        total_users = self.users_collection.count_documents({})
        total_bets = self.bets_collection.count_documents({})
        
        wagered_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$stake"}}}]
        wagered_result = list(self.bets_collection.aggregate(wagered_pipeline))
        total_wagered = wagered_result[0]['total'] if wagered_result else 0
        
        winnings_pipeline = [{"$match": {"status": "Ganha"}}, {"$group": {"_id": None, "total": {"$sum": "$potentialWinnings"}}}]
        winnings_result = list(self.bets_collection.aggregate(winnings_pipeline))
        total_winnings = winnings_result[0]['total'] if winnings_result else 0
        
        gross_profit = total_wagered - total_winnings

        embed = discord.Embed(title="📊 Status da Plataforma FielBet", color=0x1abc9c)
        embed.add_field(name="👥 Total de Usuários", value=f"**{total_users}**", inline=True)
        embed.add_field(name="🎫 Total de Apostas", value=f"**{total_bets}**", inline=True)
        embed.add_field(name="💰 Total Apostado", value=f"**R$ {total_wagered:,.2f}**", inline=False)
        embed.add_field(name="💸 Total em Prêmios", value=f"R$ {total_winnings:,.2f}", inline=True)
        embed.add_field(name="📈 Lucro Bruto", value=f"R$ {gross_profit:,.2f}", inline=True)
        
        await interaction.followup.send(embed=embed)
        
    @admin_group.command(name="proximo_jogo", description="⚽ Mostra o próximo jogo do Corinthians.")
    @is_admin()
    async def proximo_jogo_timao(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        now_ts = int(datetime.datetime.now().timestamp())
        
        next_match = self.matches_collection.find_one({
            "$or": [{"homeTeam": "Corinthians"}, {"awayTeam": "Corinthians"}],
            "timestamp": {"$gte": now_ts},
            "status": "NS"
        }, sort=[("timestamp", 1)])

        if not next_match:
            await interaction.followup.send("Nenhum próximo jogo do Corinthians encontrado no banco de dados.", ephemeral=True)
            return
            
        embed = discord.Embed(
            title="⚽ Próximo Jogo do Timão ⚽",
            description=f"**{next_match['homeTeam']}** vs **{next_match['awayTeam']}**",
            color=0x1e1e1e
        )
        embed.add_field(name="🏆 Campeonato", value=next_match['league'], inline=True)
        embed.add_field(name="📅 Data", value=f"<t:{next_match['timestamp']}:F>", inline=True)
        
        await interaction.followup.send(embed=embed)

    @admin_group.command(name="anuncio", description="📢 Envia um anúncio em um canal específico.")
    @app_commands.describe(canal="O canal para enviar o anúncio.", titulo="O título do anúncio.", mensagem="A mensagem do anúncio.")
    @is_admin()
    async def anuncio(self, interaction: discord.Interaction, canal: discord.TextChannel, titulo: str, mensagem: str):
        embed = discord.Embed(title=titulo, description=mensagem, color=0xffd700)
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        embed.set_footer(text="Comunicado Oficial FielBet")

        try:
            await canal.send(embed=embed)
            await interaction.response.send_message(f"✅ Anúncio enviado com sucesso no canal {canal.mention}!", ephemeral=True)
        except discord.Forbidden:
            await interaction.response.send_message(f"❌ Não tenho permissão para enviar mensagens no canal {canal.mention}.", ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Ocorreu um erro: {e}", ephemeral=True)

    @admin_group.command(name="ban", description="🚫 Bane um usuário da plataforma e do Discord.")
    @app_commands.describe(usuario="O usuário a ser banido.", motivo="O motivo do banimento.")
    @is_admin()
    async def ban(self, interaction: discord.Interaction, usuario: discord.Member, motivo: str):
        await interaction.response.defer(ephemeral=True)
        
        # 1. Ban from Discord
        try:
            await usuario.ban(reason=f"Banido por {interaction.user.name}: {motivo}")
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para banir este usuário no Discord.", ephemeral=True)
            return
        except Exception as e:
            await interaction.followup.send(f"❌ Erro ao banir do Discord: {e}", ephemeral=True)
            return
            
        # 2. Suspend on platform
        self.users_collection.update_one({"discordId": str(usuario.id)}, {"$set": {"status": "Suspenso"}})
        
        # 3. Log action
        log_desc = f"**Usuário:** {usuario.mention} (`{usuario.id}`)\n**Admin:** {interaction.user.mention}\n**Motivo:** {motivo}"
        await self.log_action("🚫 Usuário Banido", log_desc, discord.Color.red(), interaction)
        
        await interaction.followup.send(f"✅ Usuário {usuario.name} foi banido com sucesso.", ephemeral=True)

    @admin_group.command(name="unban", description="🔓 Desbane um usuário do Discord.")
    @app_commands.describe(id_usuario="O ID do usuário a ser desbanido.", motivo="O motivo do desbanimento.")
    @is_admin()
    async def unban(self, interaction: discord.Interaction, id_usuario: str, motivo: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            user_id = int(id_usuario)
            user = await self.bot.fetch_user(user_id)
        except ValueError:
            await interaction.followup.send("❌ ID do usuário inválido.", ephemeral=True)
            return
        except discord.NotFound:
            await interaction.followup.send("❌ Usuário não encontrado.", ephemeral=True)
            return

        try:
            await interaction.guild.unban(user, reason=f"Desbanido por {interaction.user.name}: {motivo}")
        except discord.Forbidden:
            await interaction.followup.send("❌ Não tenho permissão para desbanir usuários.", ephemeral=True)
            return
        except discord.NotFound:
             await interaction.followup.send("❌ Este usuário não parece estar banido.", ephemeral=True)
             return
             
        # 2. Unsuspend on platform
        self.users_collection.update_one({"discordId": id_usuario}, {"$set": {"status": "Ativo"}})

        # 3. Log action
        log_desc = f"**Usuário:** {user.name} (`{user.id}`)\n**Admin:** {interaction.user.mention}\n**Motivo:** {motivo}"
        await self.log_action("🔓 Usuário Desbanido", log_desc, discord.Color.green(), interaction)

        await interaction.followup.send(f"✅ Usuário {user.name} foi desbanido com sucesso.", ephemeral=True)


async def setup(bot):
    await bot.add_cog(Admin(bot))
