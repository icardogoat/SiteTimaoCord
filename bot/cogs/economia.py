import discord
from discord.ext import commands
from discord import app_commands
import datetime
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Helper function to check for user existence
def get_user_data(user_id, db):
    user = db.users.find_one({"discordId": user_id})
    if not user:
        return None
    return user

# Helper to format numbers
def format_currency(value):
    return f"R$ {value:,.2f}"

class Economia(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.wallets = self.db.wallets
        self.users = self.db.users
        self.user_stats = self.db.user_stats

    def cog_unload(self):
        self.client.close()
        
    @app_commands.command(name="saldo", description="💰 Verificar seu saldo atual e últimas transações.")
    async def saldo(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        
        user_doc = get_user_data(user_id, self.db)
        if not user_doc:
            site_url = os.getenv('SITE_URL', 'http://localhost:9003')
            embed = discord.Embed(
                title="❌ Conta Não Encontrada",
                description=f"Você precisa fazer login no nosso site pelo menos uma vez para usar os comandos do bot.\n\n**[Clique aqui para acessar o site]({site_url})** e faça o login com sua conta do Discord.",
                color=0xff8800
            )
            await interaction.followup.send(embed=embed)
            return

        user_wallet = self.wallets.find_one({"userId": user_id})
        balance = user_wallet.get("balance", 0.0) if user_wallet else 0.0
        
        embed = discord.Embed(
            title="💰 Saldo da Carteira",
            color=0x00ff00,
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        embed.add_field(name="💵 Saldo Atual", value=f"**{format_currency(balance)}**", inline=False)
        
        transactions = user_wallet.get("transactions", []) if user_wallet else []
        if transactions:
            recent_transactions = transactions[:3]
            transactions_text_list = []
            for trans in recent_transactions:
                emoji = "🟢" if trans.get("amount", 0) > 0 else "🔴"
                date = datetime.datetime.fromisoformat(trans.get("date", "").replace("Z", "+00:00"))
                timestamp_discord = int(date.timestamp())
                transactions_text_list.append(
                    f"{emoji} **{trans.get('type', 'N/A')}:** {trans.get('description', 'N/A')}\n"
                    f"↳ **Valor:** {format_currency(trans.get('amount', 0))} | **Quando:** <t:{timestamp_discord}:R>"
                )
            if transactions_text_list:
                embed.add_field(name="📋 Últimas Transações", value="\n\n".join(transactions_text_list), inline=False)
        
        embed.set_footer(text="FielBet - Sistema de Economia")
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="perfil", description="📊 Veja seu perfil ou o de outro usuário.")
    @app_commands.describe(usuario="O usuário que você quer ver o perfil. Deixe em branco para ver o seu.")
    async def perfil(self, interaction: discord.Interaction, usuario: discord.User = None):
        await interaction.response.defer(ephemeral=True)
        
        target_user = usuario or interaction.user
        user_id = str(target_user.id)

        user_doc = get_user_data(user_id, self.db)
        if not user_doc:
            site_url = os.getenv('SITE_URL', 'http://localhost:9003')
            is_self = target_user.id == interaction.user.id
            
            if is_self:
                description_text = f"Você precisa fazer login no nosso site pelo menos uma vez para usar os comandos do bot.\n\n**[Clique aqui para acessar o site]({site_url})** e faça o login com sua conta do Discord."
            else:
                description_text = f"O usuário {target_user.mention} não foi encontrado no sistema. Ele precisa fazer login no site pelo menos uma vez."
            
            embed = discord.Embed(
                title="❌ Conta Não Encontrada",
                description=description_text,
                color=0xff8800
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
            
        stats = self.user_stats.find_one({"userId": user_id}) or {}

        level = user_doc.get('level', 1)
        xp = user_doc.get('xp', 0)
        
        embed = discord.Embed(
            title=f"📊 Perfil de {target_user.display_name}",
            color=0x1E1E1E,
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        embed.set_thumbnail(url=target_user.display_avatar.url)
        
        embed.add_field(name="🌟 Nível", value=f"**{level}** ({xp:,} XP)", inline=True)
        
        total_bets = stats.get('totalBets', 0)
        bets_won = stats.get('betsWon', 0)
        bets_lost = stats.get('betsLost', 0)
        win_rate = (bets_won / total_bets * 100) if total_bets > 0 else 0
        
        embed.add_field(name="📈 Taxa de Vitória", value=f"{win_rate:.2f}%", inline=True)
        embed.add_field(name="🎫 Total de Apostas", value=f"{total_bets}", inline=True)

        embed.add_field(name="🏆 Apostas Ganhas", value=f"{bets_won}", inline=True)
        embed.add_field(name="💔 Apostas Perdidas", value=f"{bets_lost}", inline=True)
        
        total_wagered = stats.get('totalWagered', 0.0)
        total_winnings = stats.get('totalWinnings', 0.0)
        profit = total_winnings - total_wagered
        
        embed.add_field(name="💰 Total Apostado", value=format_currency(total_wagered), inline=False)
        embed.add_field(name="💸 Ganhos Totais", value=format_currency(total_winnings), inline=False)
        
        profit_emoji = "🟢" if profit >= 0 else "🔴"
        embed.add_field(name=f"{profit_emoji} Lucro/Prejuízo", value=format_currency(profit), inline=False)

        embed.set_footer(text="FielBet - Estatísticas do Usuário")
        await interaction.followup.send(embed=embed)


async def setup(bot):
    await bot.add_cog(Economia(bot))
