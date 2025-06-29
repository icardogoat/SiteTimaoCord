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

class QuizView(ui.View):
    def __init__(self, quiz_doc, question_data, db, bot):
        self.quiz_doc = quiz_doc
        self.question_data = question_data
        self.db = db
        self.bot = bot
        self.wallets = self.db.wallets
        self.winner = None
        self.answered_users = set()
        self.message = None

        # O timeout agora vem do documento do quiz, com um fallback
        super().__init__(timeout=180.0) 

        for i, option in enumerate(self.question_data['options']):
            button = ui.Button(label=option, style=discord.ButtonStyle.secondary, custom_id=f"quiz_option_{i}")
            button.callback = self.button_callback
            self.add_item(button)

    async def button_callback(self, interaction: discord.Interaction):
        if self.winner:
            await interaction.response.send_message("Este quiz já foi respondido. Aguarde o próximo!", ephemeral=True)
            return

        if interaction.user.id in self.answered_users:
            await interaction.response.send_message("Você já tentou responder a esta pergunta.", ephemeral=True)
            return

        self.answered_users.add(interaction.user.id)
        selected_option_index = int(interaction.data['custom_id'].split('_')[-1])
        
        # A resposta correta agora vem do `question_data`
        correct_answer_index = self.question_data.get('answer', -1)

        if selected_option_index == correct_answer_index:
            self.winner = interaction.user
            
            for item in self.children:
                if isinstance(item, ui.Button):
                    item.disabled = True
                    if item.custom_id == interaction.data['custom_id']:
                        item.style = discord.ButtonStyle.success
                    else:
                        item.style = discord.ButtonStyle.secondary

            new_embed = interaction.message.embeds[0]
            new_embed.color = 0x00FF00
            
            prize_amount = self.quiz_doc.get('rewardAmount', 500)
            
            new_embed.set_field_at(0, name="🏆 Vencedor", value=f"{self.winner.mention} acertou a resposta e ganhou R$ {prize_amount:.2f}!", inline=False)
            await interaction.response.edit_message(embed=new_embed, view=self)

            await self.award_prize()
            self.stop()
        else:
            await interaction.response.send_message("❌ Resposta incorreta! Tente na próxima.", ephemeral=True)

    async def on_timeout(self):
        if self.message and not self.winner:
            for item in self.children:
                if isinstance(item, ui.Button):
                    item.disabled = True
            
            new_embed = self.message.embeds[0]
            new_embed.color = 0xFF0000
            correct_answer_index = self.question_data.get('answer', -1)
            correct_answer_text = self.question_data['options'][correct_answer_index]
            new_embed.set_field_at(0, name="⏰ Tempo Esgotado", value=f"Ninguém acertou a tempo. A resposta correta era: **{correct_answer_text}**.", inline=False)
            
            try:
                await self.message.edit(embed=new_embed, view=self)
            except discord.errors.NotFound:
                pass # A mensagem pode ter sido deletada
        self.stop()

    async def award_prize(self):
        if not self.winner:
            return

        user_id = str(self.winner.id)
        
        user_account = self.db.users.find_one({"discordId": user_id})
        if not user_account:
            # Enviar DM se o usuário não tiver conta
            try:
                site_url = os.getenv('SITE_URL', 'http://localhost:9003')
                await self.winner.send(f"Parabéns por ganhar o quiz! Para receber seu prêmio, você precisa fazer login no nosso site pelo menos uma vez: {site_url}")
            except discord.Forbidden:
                pass # Não pode enviar DM
            return

        prize_amount = self.quiz_doc.get('rewardAmount', 500)

        new_transaction = {
            "id": str(ObjectId()),
            "type": "Prêmio",
            "description": f"Prêmio do Quiz: {self.quiz_doc.get('name', 'Quiz do Timão')}",
            "amount": prize_amount,
            "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "Concluído"
        }

        self.wallets.update_one(
            {"userId": user_id},
            {
                "$inc": {"balance": prize_amount},
                "$push": {"transactions": {"$each": [new_transaction], "$sort": {"date": -1}}}
            },
            upsert=True
        )
        print(f"Awarded R$ {prize_amount} to {self.winner.name} ({user_id}) for winning the quiz.")


class Quiz(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.quizzes_collection = self.db.quizzes

    def cog_unload(self):
        self.client.close()
    
    # Autocomplete para o comando /iniciar_quiz
    async def quiz_autocomplete(self, interaction: discord.Interaction, current: str):
        quizzes = self.quizzes_collection.find(
            {"name": {"$regex": current, "$options": "i"}}
        ).limit(25)
        return [
            app_commands.Choice(name=quiz['name'], value=str(quiz['_id']))
            for quiz in quizzes
        ]

    @app_commands.command(name="iniciar_quiz", description="[Admin] Inicia uma rodada de um quiz personalizado.")
    @app_commands.autocomplete(quiz_id=quiz_autocomplete)
    @app_commands.describe(quiz_id="O nome do quiz que você deseja iniciar.")
    @app_commands.checks.has_permissions(administrator=True)
    async def iniciar_quiz(self, interaction: discord.Interaction, quiz_id: str):
        await interaction.response.defer(ephemeral=True)
        
        try:
            quiz_obj_id = ObjectId(quiz_id)
        except Exception:
            await interaction.followup.send("❌ ID do quiz inválido.", ephemeral=True)
            return

        quiz_doc = self.quizzes_collection.find_one({"_id": quiz_obj_id})
        
        if not quiz_doc:
            await interaction.followup.send("❌ Quiz não encontrado com este ID.", ephemeral=True)
            return

        if not quiz_doc.get('questions'):
            await interaction.followup.send("❌ Este quiz não tem perguntas configuradas.", ephemeral=True)
            return
            
        channel_id = quiz_doc.get('channelId')
        if not channel_id:
            await interaction.followup.send("❌ O canal de eventos não está configurado para este quiz no painel de admin.", ephemeral=True)
            return
            
        try:
            event_channel = self.bot.get_channel(int(channel_id))
            if not event_channel:
                 await interaction.followup.send(f"❌ Canal de evento com ID `{channel_id}` não encontrado.", ephemeral=True)
                 return
        except (ValueError, TypeError):
            await interaction.followup.send(f"❌ ID do canal de evento `{channel_id}` é inválido.", ephemeral=True)
            return

        # Por enquanto, vamos pegar a primeira pergunta do quiz
        # Futuramente, a lógica pode ser expandida para um quiz de múltiplas perguntas.
        question_data = quiz_doc['questions'][0]

        embed = discord.Embed(
            title=f"🧠 {quiz_doc.get('name', 'Quiz do Timão!')}",
            description=f"**{question_data['question']}**",
            color=0x1E1E1E
        )
        
        prize = quiz_doc.get('rewardAmount', 500)
        
        embed.set_footer(text=f"O primeiro a acertar ganha R$ {prize:.2f}! Você tem 3 minutos.")
        embed.add_field(name="Responda Abaixo", value="Clique no botão com a resposta correta.", inline=False)
        
        # Passa o documento do quiz e a pergunta para a View
        view = QuizView(quiz_doc=quiz_doc, question_data=question_data, db=self.db, bot=self.bot)
        
        try:
            quiz_message = await event_channel.send(embed=embed, view=view)
            view.message = quiz_message
            await interaction.followup.send(f"✅ Quiz '{quiz_doc['name']}' iniciado com sucesso no canal {event_channel.mention}!", ephemeral=True)
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
