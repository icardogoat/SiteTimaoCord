import discord
from discord.ext import commands
from discord import app_commands, ui
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import datetime
import random

load_dotenv()

# --- Perguntas do Quiz ---
# Cada pergunta é um dicionário com:
# 'question': O texto da pergunta
# 'options': Uma lista de até 4 respostas
# 'answer': O índice (0-3) da resposta correta na lista 'options'
quiz_questions = [
    {
        "question": "Quem é o maior artilheiro da história do Corinthians?",
        "options": ["Sócrates", "Marcelinho Carioca", "Cláudio Christovam de Pinho", "Ronaldo Giovaneli"],
        "answer": 2
    },
    {
        "question": "Em que ano o Corinthians foi fundado?",
        "options": ["1910", "1900", "1920", "1930"],
        "answer": 0
    },
    {
        "question": "Qual jogador marcou o gol do título do Mundial de Clubes da FIFA de 2012 contra o Chelsea?",
        "options": ["Danilo", "Paulinho", "Emerson Sheik", "Paolo Guerrero"],
        "answer": 3
    },
    {
        "question": "Contra qual time o Corinthians conquistou sua primeira Copa Libertadores em 2012?",
        "options": ["Santos", "Boca Juniors", "Vasco da Gama", "Universidad de Chile"],
        "answer": 1
    },
    {
        "question": "Qual o apelido da torcida organizada mais famosa do Corinthians?",
        "options": ["Mancha Verde", "Torcida Jovem", "Gaviões da Fiel", "Força Jovem"],
        "answer": 2
    },
    {
        "question": "Quantos títulos do Campeonato Brasileiro (Série A) o Corinthians possui até hoje?",
        "options": ["5", "6", "7", "8"],
        "answer": 2 
    },
    {
        "question": "Quem era o técnico do Corinthians na conquista da Libertadores e do Mundial de 2012?",
        "options": ["Mano Menezes", "Tite", "Vanderlei Luxemburgo", "Fábio Carille"],
        "answer": 1
    },
    {
        "question": "Qual estádio é conhecido como a 'casa' do Corinthians?",
        "options": ["Morumbi", "Pacaembu", "Allianz Parque", "Neo Química Arena"],
        "answer": 3
    },
    {
        "question": "Que jogador era conhecido como 'Pé de Anjo'?",
        "options": ["Rivellino", "Neto", "Marcelinho Carioca", "Ricardinho"],
        "answer": 2
    },
    {
        "question": "Qual movimento liderado por jogadores do Corinthians marcou a década de 80?",
        "options": ["Diretas Já", "Clube dos 13", "Democracia Corinthiana", "Fiel Torcedor"],
        "answer": 2
    }
]

class QuizView(ui.View):
    def __init__(self, question_data, db, prize_amount=500):
        super().__init__(timeout=180.0) # 3 minute timeout
        self.question_data = question_data
        self.db = db
        self.prize_amount = prize_amount
        self.wallets = self.db.wallets
        self.winner = None
        self.answered_users = set()
        self.message = None 

        # Add buttons for each option
        for i, option in enumerate(self.question_data['options']):
            button = ui.Button(label=option, style=discord.ButtonStyle.secondary, custom_id=f"quiz_option_{i}")
            button.callback = self.button_callback
            self.add_item(button)

    async def button_callback(self, interaction: discord.Interaction):
        if self.winner: # Quiz já foi ganho
            await interaction.response.send_message("Este quiz já foi respondido. Aguarde o próximo!", ephemeral=True)
            return

        if interaction.user.id in self.answered_users:
            await interaction.response.send_message("Você já tentou responder a esta pergunta.", ephemeral=True)
            return

        self.answered_users.add(interaction.user.id)
        selected_option_index = int(interaction.data['custom_id'].split('_')[-1])

        if selected_option_index == self.question_data['answer']:
            self.winner = interaction.user
            
            # Disable all buttons
            for item in self.children:
                if isinstance(item, ui.Button):
                    item.disabled = True
                    if item.custom_id == interaction.data['custom_id']:
                        item.style = discord.ButtonStyle.success # Mark correct answer
                    else:
                        item.style = discord.ButtonStyle.secondary

            # Update the original message
            new_embed = interaction.message.embeds[0]
            new_embed.color = 0x00FF00
            new_embed.set_field_at(0, name="🏆 Vencedor", value=f"{self.winner.mention} acertou a resposta e ganhou R$ {self.prize_amount:.2f}!", inline=False)
            await interaction.response.edit_message(embed=new_embed, view=self)

            # Give prize
            await self.award_prize()
            self.stop()
        else:
            await interaction.response.send_message("❌ Resposta incorreta! Tente na próxima.", ephemeral=True)


    async def on_timeout(self):
        # Disable all buttons and update message on timeout
        for item in self.children:
            if isinstance(item, ui.Button):
                item.disabled = True
        
        # Check if a message exists to edit and if there was no winner
        if self.message and not self.winner:
            new_embed = self.message.embeds[0]
            new_embed.color = 0xFF0000
            new_embed.set_field_at(0, name="⏰ Tempo Esgotado", value="Ninguém acertou a tempo. Mais sorte na próxima!", inline=False)
            await self.message.edit(embed=new_embed, view=self)
        self.stop()

    async def award_prize(self):
        if not self.winner:
            return

        user_id = str(self.winner.id)
        
        # Check if user has an account
        user_account = self.db.users.find_one({"discordId": user_id})
        if not user_account:
            print(f"Quiz Winner {user_id} not found in users collection. Cannot award prize.")
            return

        new_transaction = {
            "id": str(ObjectId()),
            "type": "Prêmio",
            "description": "Prêmio do Quiz do Timão",
            "amount": self.prize_amount,
            "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "Concluído"
        }

        self.wallets.update_one(
            {"userId": user_id},
            {
                "$inc": {"balance": self.prize_amount},
                "$push": {"transactions": {"$each": [new_transaction], "$sort": {"date": -1}}}
            },
            upsert=True
        )
        print(f"Awarded R$ {self.prize_amount} to {self.winner.name} ({user_id}) for winning the quiz.")

class Quiz(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.bot_db = self.client.timaocord_bot
        self.main_db = self.client.timaocord
        self.config_collection = self.bot_db.config

    def cog_unload(self):
        self.client.close()

    @app_commands.command(name="iniciar_quiz", description="[Admin] Inicia uma rodada do Quiz do Timão.")
    @app_commands.checks.has_permissions(administrator=True)
    async def iniciar_quiz(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        # Fetch bot config from DB
        bot_config = self.config_collection.find_one({"_id": ObjectId('669fdb5a907548817b848c48')})
        event_channel_id = bot_config.get('eventChannelId')

        if not event_channel_id:
            await interaction.followup.send("❌ O canal de eventos não está configurado no painel de admin.", ephemeral=True)
            return
            
        try:
            event_channel = self.bot.get_channel(int(event_channel_id))
            if not event_channel:
                 await interaction.followup.send(f"❌ Canal de evento com ID `{event_channel_id}` não encontrado.", ephemeral=True)
                 return
        except (ValueError, TypeError):
            await interaction.followup.send(f"❌ ID do canal de evento `{event_channel_id}` é inválido.", ephemeral=True)
            return

        question_data = random.choice(quiz_questions)

        embed = discord.Embed(
            title="🧠 Quiz do Timão!",
            description=f"**{question_data['question']}**",
            color=0x1E1E1E
        )
        embed.set_footer(text="O primeiro a acertar ganha R$ 500,00! Você tem 3 minutos.")
        embed.add_field(name="Responda Abaixo", value="Clique no botão com a resposta correta.", inline=False)
        
        view = QuizView(question_data=question_data, db=self.main_db)
        
        try:
            quiz_message = await event_channel.send(embed=embed, view=view)
            view.message = quiz_message # Store message reference for editing on timeout
            await interaction.followup.send(f"✅ Quiz iniciado com sucesso no canal {event_channel.mention}!", ephemeral=True)
        except discord.errors.Forbidden:
            await interaction.followup.send(f"❌ O bot não tem permissão para enviar mensagens no canal {event_channel.mention}.", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Ocorreu um erro ao enviar o quiz: {e}", ephemeral=True)

    @iniciar_quiz.error
    async def on_quiz_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Você não tem permissão para usar este comando.", ephemeral=True)
        else:
            await interaction.response.send_message(f"Ocorreu um erro: {error}", ephemeral=True)


async def setup(bot):
    await bot.add_cog(Quiz(bot))