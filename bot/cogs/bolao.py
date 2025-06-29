
import discord
from discord.ext import commands
from discord import app_commands, ui
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import datetime

load_dotenv()

# Helper para verificar se o usuário existe no banco de dados do site
def get_user_data(user_id, db):
    user = db.users.find_one({"discordId": user_id})
    return user is not None

# Modal para o usuário inserir o palpite do placar
class ScoreModal(ui.Modal, title='Palpite do Bolão'):
    home_score = ui.TextInput(label='Placar Time Casa', style=discord.TextStyle.short, required=True, max_length=2, placeholder="0")
    away_score = ui.TextInput(label='Placar Time Visitante', style=discord.TextStyle.short, required=True, max_length=2, placeholder="0")

    def __init__(self, bolao, db):
        super().__init__()
        self.bolao = bolao
        self.db = db
        self.wallets_collection = self.db.wallets
        self.boloes_collection = self.db.boloes

    async def on_submit(self, interaction: discord.Interaction):
        try:
            home = int(self.home_score.value)
            away = int(self.away_score.value)
            if home < 0 or away < 0:
                raise ValueError("Placar não pode ser negativo.")
        except ValueError:
            await interaction.response.send_message("Por favor, insira um placar válido (apenas números inteiros positivos).", ephemeral=True)
            return

        user_id = str(interaction.user.id)
        
        # Confirmação final do saldo antes de cobrar
        user_wallet = self.wallets_collection.find_one({"userId": user_id})
        if not user_wallet or user_wallet.get('balance', 0) < self.bolao['entryFee']:
            await interaction.response.send_message("❌ Saldo insuficiente para entrar no bolão.", ephemeral=True)
            return
            
        try:
            # 1. Deduz a taxa da carteira do usuário
            new_transaction = {
                "id": str(ObjectId()),
                "type": "Aposta",
                "description": f"Entrada no Bolão: {self.bolao['homeTeam']} vs {self.bolao['awayTeam']}",
                "amount": -self.bolao['entryFee'],
                "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "status": "Concluído"
            }
            self.wallets_collection.update_one(
                {"userId": user_id},
                {
                    "$inc": {"balance": -self.bolao['entryFee']},
                    "$push": {"transactions": {"$each": [new_transaction], "$sort": {"date": -1}}}
                }
            )
            
            # 2. Adiciona o participante ao bolão e atualiza o prêmio
            new_participant = {
                "userId": user_id,
                "name": interaction.user.display_name,
                "avatar": str(interaction.user.display_avatar.url),
                "guess": {"home": home, "away": away},
                "guessedAt": datetime.datetime.now(datetime.timezone.utc)
            }
            
            self.boloes_collection.update_one(
                {"_id": self.bolao['_id']},
                {
                    "$inc": {"prizePool": self.bolao['entryFee']},
                    "$push": {"participants": new_participant}
                }
            )

            embed = discord.Embed(
                title="✅ Palpite Registrado!",
                description=f"Seu palpite de **{self.bolao['homeTeam']} {home} x {away} {self.bolao['awayTeam']}** foi registrado com sucesso!\n\nBoa sorte! 🍀",
                color=0x00FF00
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)

        except Exception as e:
            print(f"Erro ao submeter o bolão: {e}")
            await interaction.response.send_message("Ocorreu um erro ao processar seu palpite. Tente novamente.", ephemeral=True)


class BolaoCog(commands.Cog, name="bolao"):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.boloes = self.db.boloes
        self.wallets = self.db.wallets

    def cog_unload(self):
        self.client.close()

    @app_commands.command(name="bolao", description="🎫 Participe de um bolão usando o ID.")
    @app_commands.describe(id="O ID do bolão que você quer participar.")
    async def bolao(self, interaction: discord.Interaction, id: str):
        user_id = str(interaction.user.id)

        # 1. Verifica se o usuário já fez login no site
        if not get_user_data(user_id, self.db):
            site_url = os.getenv('SITE_URL', 'http://localhost:9003')
            embed = discord.Embed(
                title="❌ Conta Não Encontrada",
                description=f"Você precisa fazer login no nosso site pelo menos uma vez para usar os comandos do bot.\n\n**[Clique aqui para acessar o site]({site_url})** e faça o login com sua conta do Discord.",
                color=0xff8800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return

        # 2. Verifica se o ID do bolão é válido
        try:
            bolao_obj_id = ObjectId(id)
        except Exception:
            await interaction.response.send_message("❌ ID do bolão inválido. Verifique o ID e tente novamente.", ephemeral=True)
            return
            
        # 3. Procura pelo bolão no banco de dados
        bolao = self.boloes.find_one({"_id": bolao_obj_id})
        if not bolao:
            await interaction.response.send_message("❌ Bolão não encontrado com este ID.", ephemeral=True)
            return

        # 4. Verifica o status do bolão
        if bolao.get('status', 'Aberto') != 'Aberto':
            await interaction.response.send_message("❌ Este bolão não está mais aberto para palpites.", ephemeral=True)
            return

        # 5. Verifica se o usuário já participou
        if any(p['userId'] == user_id for p in bolao.get('participants', [])):
            await interaction.response.send_message("❌ Você já participou deste bolão.", ephemeral=True)
            return
            
        # 6. Verifica o saldo do usuário
        user_wallet = self.wallets.find_one({"userId": user_id})
        entry_fee = bolao.get('entryFee', 5)
        if not user_wallet or user_wallet.get('balance', 0) < entry_fee:
            await interaction.response.send_message(f"❌ Saldo insuficiente. Você precisa de R$ {entry_fee:.2f} para participar.", ephemeral=True)
            return

        # 7. Se tudo estiver certo, abre o modal para o palpite
        modal = ScoreModal(bolao, self.db)
        await interaction.response.send_modal(modal)


async def setup(bot):
    await bot.add_cog(BolaoCog(bot))
