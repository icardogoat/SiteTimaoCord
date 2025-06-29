import discord
from discord.ext import commands
from discord import app_commands
import datetime
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
load_dotenv()

class Economia(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        # Conectar ao MongoDB usando a URI do ambiente
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        # CORREÇÃO: O nome do banco de dados no MongoDB Atlas é 'timaocord' (minúsculo)
        self.db = self.client['timaocord']
        self.wallets = self.db.wallets

    def cog_unload(self):
        self.client.close()

    @app_commands.command(name="saldo", description="💰 Verificar seu saldo atual")
    async def saldo(self, interaction: discord.Interaction):
        """Mostra o saldo atual do usuário e as últimas transações."""
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        
        try:
            user_wallet = self.wallets.find_one({"userId": user_id})
            
            if user_wallet:
                balance = user_wallet.get("balance", 0.0)
                
                embed = discord.Embed(
                    title="💰 Saldo da Carteira",
                    color=0x00ff00,
                    timestamp=datetime.datetime.now(datetime.timezone.utc)
                )
                
                if interaction.user.avatar:
                    embed.set_author(name=interaction.user.name, icon_url=interaction.user.avatar.url)
                else:
                    embed.set_author(name=interaction.user.name)

                embed.add_field(
                    name="💵 Saldo Atual",
                    value=f"**R$ {balance:,.2f}**",
                    inline=False
                )
                
                transactions = user_wallet.get("transactions", [])
                if transactions:
                    # CORREÇÃO: O site já salva as transações da mais nova para a mais antiga.
                    # Portanto, pegamos as 3 primeiras do array.
                    recent_transactions = transactions[:3]
                    transactions_text_list = []
                    
                    for trans in recent_transactions:
                        emoji = "🟢" if trans.get("amount", 0) > 0 else "🔴"
                        
                        trans_date_str = trans.get("date")
                        if isinstance(trans_date_str, str):
                            date = datetime.datetime.fromisoformat(trans_date_str.replace("Z", "+00:00"))
                        elif isinstance(trans_date_str, datetime.datetime):
                            date = trans_date_str
                        else:
                             date = datetime.datetime.now(datetime.timezone.utc)
                        
                        # Usando a formatação de timestamp do Discord (<t:timestamp:R>)
                        timestamp_discord = int(date.timestamp())

                        amount = trans.get('amount', 0)
                        desc = trans.get('description', 'N/A')
                        ttype = trans.get('type', 'N/A')
                        
                        transactions_text_list.append(
                            f"{emoji} **{ttype}: {desc}**\n"
                            f"↳ **Valor:** R$ {amount:,.2f} | **Quando:** <t:{timestamp_discord}:R>"
                        )
                    
                    if transactions_text_list:
                      embed.add_field(
                          name="📋 Últimas Transações",
                          value="\n\n".join(transactions_text_list),
                          inline=False
                      )
                
                embed.set_footer(text="FielBet - Sistema de Economia")
                
            else:
                # CORREÇÃO: Usar variável de ambiente para o link do site.
                site_url = os.getenv('SITE_URL', 'http://localhost:9003')
                embed = discord.Embed(
                    title="❌ Carteira Não Encontrada",
                    description=f"Parece que você é novo por aqui! Para começar a apostar e usar os comandos do bot, primeiro você precisa criar sua carteira.",
                    color=0xff8800,
                    timestamp=datetime.datetime.now(datetime.timezone.utc)
                )
                
                embed.add_field(
                    name="🌐 Como Criar sua Carteira",
                    value=f"É simples! **[Clique aqui para acessar o site]({site_url})** e faça login com sua conta do Discord. Sua carteira será criada automaticamente com um bônus de boas-vindas!",
                    inline=False
                )
                
                embed.set_footer(text="FielBet - Sistema de Economia")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            print(f"Erro no comando /saldo para {user_id}: {e}")
            await interaction.followup.send("Ocorreu um erro ao consultar seu saldo. Tente novamente mais tarde.", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Economia(bot))
