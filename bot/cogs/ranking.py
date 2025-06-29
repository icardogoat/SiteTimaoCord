import discord
from discord.ext import commands
from discord import app_commands
import datetime
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class Ranking(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.user_stats = self.db.user_stats
        self.wallets = self.db.wallets
        self.users = self.db.users

    def cog_unload(self):
        self.client.close()

    async def get_user_name(self, user_id):
        user_doc = self.users.find_one({"discordId": user_id})
        return user_doc.get("name", f"Usuário {user_id[-4:]}") if user_doc else f"Usuário Desconhecido"

    @app_commands.command(name="ranking", description="🏆 Exibe os rankings da FielBet.")
    @app_commands.describe(categoria="A categoria do ranking que você quer ver.")
    @app_commands.choices(categoria=[
        app_commands.Choice(name="Maiores Ganhadores", value="ganhadores"),
        app_commands.Choice(name="Mais Ricos", value="ricos"),
        app_commands.Choice(name="Mais Ativos", value="ativos"),
        app_commands.Choice(name="Top Níveis", value="niveis"),
    ])
    async def ranking(self, interaction: discord.Interaction, categoria: app_commands.Choice[str]):
        await interaction.response.defer()

        embed = discord.Embed(
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            color=0x1E1E1E
        )
        
        description = ""
        
        if categoria.value == "ganhadores":
            embed.title = "🏆 Ranking - Maiores Ganhadores"
            rank_data = self.user_stats.find({"totalWinnings": {"$gt": 0}}).sort("totalWinnings", -1).limit(10)
            for i, user in enumerate(list(rank_data)):
                user_name = await self.get_user_name(user['userId'])
                description += f"**{i+1}.** {user_name} - **R$ {user['totalWinnings']:,.2f}**\n"
        
        elif categoria.value == "ricos":
            embed.title = "💰 Ranking - Mais Ricos"
            rank_data = self.wallets.find().sort("balance", -1).limit(10)
            for i, user in enumerate(list(rank_data)):
                user_name = await self.get_user_name(user['userId'])
                description += f"**{i+1}.** {user_name} - **R$ {user['balance']:,.2f}**\n"

        elif categoria.value == "ativos":
            embed.title = "🏅 Ranking - Mais Ativos (por nº de apostas)"
            rank_data = self.user_stats.find().sort("totalBets", -1).limit(10)
            for i, user in enumerate(list(rank_data)):
                user_name = await self.get_user_name(user['userId'])
                description += f"**{i+1}.** {user_name} - **{user['totalBets']} apostas**\n"
        
        elif categoria.value == "niveis":
            embed.title = "🌟 Ranking - Top Níveis"
            rank_data = self.users.find().sort([("level", -1), ("xp", -1)]).limit(10)
            for i, user in enumerate(list(rank_data)):
                level = user.get('level', 1)
                xp = user.get('xp', 0)
                name = user.get('name', 'Usuário Desconhecido')
                description += f"**{i+1}.** {name} - **Nível {level}** ({xp:,} XP)\n"
        
        if not description:
            description = "Nenhum dado encontrado para este ranking ainda."
            
        embed.description = description
        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Ranking(bot))

    