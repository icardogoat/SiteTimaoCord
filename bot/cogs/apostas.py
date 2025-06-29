import discord
from discord.ext import commands
from discord import app_commands
import datetime
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class Apostas(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.bets = self.db.bets

    def cog_unload(self):
        self.client.close()

    @app_commands.command(name="minhas-apostas", description="🎟️ Veja suas apostas em aberto.")
    async def minhas_apostas(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        
        user_bets = self.bets.find({"userId": user_id, "status": "Em Aberto"}).sort("createdAt", -1).limit(5)
        
        open_bets = list(user_bets)

        if not open_bets:
            embed = discord.Embed(
                title="🎟️ Minhas Apostas em Aberto",
                description="Você não tem nenhuma aposta em aberto no momento.",
                color=0x1E90FF
            )
            await interaction.followup.send(embed=embed)
            return

        embed = discord.Embed(
            title="🎟️ Suas Últimas Apostas em Aberto",
            color=0x1E90FF,
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)

        for bet in open_bets:
            bet_title = f"Aposta de R$ {bet['stake']:.2f}"
            bet_description = ""
            for selection in bet['bets']:
                bet_description += f"**{selection['selection']}** em {selection['teamA']} vs {selection['teamB']} @ {selection['oddValue']}\n"
            
            bet_description += f"\n**Retorno Potencial:** R$ {bet['potentialWinnings']:.2f}"
            embed.add_field(name=bet_title, value=bet_description, inline=False)
            
        if self.bets.count_documents({"userId": user_id, "status": "Em Aberto"}) > 5:
            embed.set_footer(text="Mostrando as 5 apostas mais recentes. Para ver todas, acesse o site.")

        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Apostas(bot))
