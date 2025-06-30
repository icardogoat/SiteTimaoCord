
import discord
from discord.ext import commands
from discord import app_commands, ui
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import datetime
import asyncio
from collections import defaultdict
import random

load_dotenv()

class QuizQuestionView(ui.View):
    def __init__(self, question_data, question_winner_limit: int):
        super().__init__(timeout=30.0)
        self.question_data = question_data
        self.question_winner_limit = question_winner_limit
        self.winners = []
        self.message = None
        self.attempted_users = set()

        for i, option in enumerate(self.question_data['options']):
            button = ui.Button(label=option, style=discord.ButtonStyle.secondary, custom_id=f"quiz_option_{i}")
            button.callback = self.button_callback
            self.add_item(button)

    async def on_timeout(self):
        # The main loop will handle UI updates on timeout.
        self.stop()
        
    async def button_callback(self, interaction: discord.Interaction):
        if self.is_finished():
            await interaction.response.send_message("Esta pergunta já foi encerrada.", ephemeral=True)
            return

        if interaction.user.id in self.attempted_users:
            await interaction.response.send_message("Você já tentou responder esta pergunta.", ephemeral=True)
            return

        self.attempted_users.add(interaction.user.id)
        selected_option_index = int(interaction.data['custom_id'].split('_')[-1])
        correct_answer_index = self.question_data.get('answer', -1)

        if selected_option_index == correct_answer_index:
            await interaction.response.send_message("✅ Resposta correta!", ephemeral=True)
            self.winners.append(interaction.user)

            if self.question_winner_limit > 0 and len(self.winners) >= self.question_winner_limit:
                self.stop()
        else:
            await interaction.response.send_message("❌ Resposta incorreta! Você não pode tentar novamente.", ephemeral=True)


class Quiz(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.quizzes_collection = self.db.quizzes
        self.wallets_collection = self.db.wallets
        self.users_collection = self.db.users
        # Track active quizzes to prevent multiple instances
        self.active_quizzes = set()

    def cog_unload(self):
        self.client.close()
    
    async def quiz_autocomplete(self, interaction: discord.Interaction, current: str):
        quizzes = self.quizzes_collection.find(
            {"name": {"$regex": current, "$options": "i"}}
        ).limit(25)
        return [
            app_commands.Choice(name=quiz['name'], value=str(quiz['_id']))
            for quiz in quizzes
        ]

    async def award_prize(self, user: discord.User, prize_amount: float, quiz_name: str):
        user_id = str(user.id)
        user_account = self.users_collection.find_one({"discordId": user_id})
        
        if not user_account:
            try:
                site_url = os.getenv('SITE_URL', 'http://localhost:9003')
                await user.send(f"Parabéns por ganhar no quiz! Para receber seu prêmio, você precisa fazer login no nosso site pelo menos uma vez: {site_url}")
            except discord.Forbidden:
                pass # Can't send DMs
            return

        new_transaction = {
            "id": str(ObjectId()), "type": "Prêmio",
            "description": f"Prêmio do Quiz: {quiz_name}",
            "amount": prize_amount,
            "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "Concluído"
        }

        self.wallets_collection.update_one(
            {"userId": user_id},
            {
                "$inc": {"balance": prize_amount},
                "$push": {"transactions": {"$each": [new_transaction], "$sort": {"date": -1}}}
            },
            upsert=True
        )
    
    async def start_quiz_flow(self, quiz_id: str, interaction: discord.Interaction = None):
        """ The main logic for running a quiz. Can be called by a command or a task. """
        
        if quiz_id in self.active_quizzes:
            if interaction:
                await interaction.followup.send("❌ Este quiz já está em andamento.", ephemeral=True)
            else:
                print(f"Quiz {quiz_id} is already active. Skipping scheduled start.")
            return
            
        try:
            quiz_obj_id = ObjectId(quiz_id)
        except Exception:
            if interaction:
                await interaction.followup.send("❌ ID do quiz inválido.", ephemeral=True)
            return

        quiz_doc = self.quizzes_collection.find_one({"_id": quiz_obj_id})
        
        if not quiz_doc:
            if interaction:
                await interaction.followup.send("❌ Quiz não encontrado com este ID.", ephemeral=True)
            return

        questions = quiz_doc.get('questions', [])
        if not questions:
            if interaction:
                await interaction.followup.send("❌ Este quiz não tem perguntas configuradas.", ephemeral=True)
            return
        
        self.active_quizzes.add(quiz_id)
            
        channel_id = quiz_doc.get('channelId')
        if not channel_id:
            if interaction:
                await interaction.followup.send("❌ O canal de eventos não está configurado para este quiz no painel de admin.", ephemeral=True)
            self.active_quizzes.remove(quiz_id)
            return
            
        try:
            event_channel = self.bot.get_channel(int(channel_id))
            if not event_channel:
                if interaction:
                    await interaction.followup.send(f"❌ Canal de evento com ID `{channel_id}` não encontrado.", ephemeral=True)
                self.active_quizzes.remove(quiz_id)
                return
        except (ValueError, TypeError):
            if interaction:
                await interaction.followup.send(f"❌ ID do canal de evento `{channel_id}` é inválido.", ephemeral=True)
            self.active_quizzes.remove(quiz_id)
            return

        if interaction:
            await interaction.followup.send(f"✅ Quiz '{quiz_doc['name']}' sendo iniciado no canal {event_channel.mention}!", ephemeral=True)

        questions_per_game = quiz_doc.get('questionsPerGame', len(questions))
        question_winner_limit = quiz_doc.get('winnerLimit', 0)
        mention_role_id = quiz_doc.get('mentionRoleId')

        random.shuffle(questions)
        questions_to_ask = questions[:questions_per_game]

        mention_text = f"<@&{mention_role_id}>" if mention_role_id else ""

        start_embed = discord.Embed(
            title=f"🧠 Quiz '{quiz_doc.get('name', 'Quiz do Timão')}' vai começar!",
            description=f"Prepare-se! A primeira pergunta será enviada em 10 segundos...",
            color=0x1E90FF
        )
        await event_channel.send(content=mention_text, embed=start_embed)
        await asyncio.sleep(10)

        scores = defaultdict(int)
        
        for index, question_data in enumerate(questions_to_ask):
            question_embed = discord.Embed(
                title=f"Pergunta {index + 1}/{len(questions_to_ask)}",
                description=f"**{question_data['question']}**",
                color=0x1E1E1E
            )
            
            if question_winner_limit == 1:
                question_embed.set_footer(text="O primeiro a acertar ganha! Você tem 30 segundos.")
            elif question_winner_limit > 1:
                question_embed.set_footer(text=f"Os primeiros {question_winner_limit} a acertarem ganham! Você tem 30 segundos.")
            else:
                question_embed.set_footer(text="Acerte e ganhe! Você tem 30 segundos.")

            view = QuizQuestionView(question_data, question_winner_limit)
            quiz_message = await event_channel.send(embed=question_embed, view=view)
            view.message = quiz_message

            await view.wait()
            
            # --- After question is done (timeout or limit reached) ---
            correct_answer_index = question_data.get('answer', -1)
            for item in view.children:
                if isinstance(item, ui.Button):
                    item.disabled = True
                    if item.custom_id == f"quiz_option_{correct_answer_index}":
                        item.style = discord.ButtonStyle.success
                    else:
                        item.style = discord.ButtonStyle.danger
            
            new_embed = quiz_message.embeds[0]
            
            if view.winners:
                prize = quiz_doc.get('rewardPerQuestion', 0)
                if prize > 0:
                    for winner in view.winners:
                        await self.award_prize(winner, prize, quiz_doc.get('name', 'Quiz'))
                
                for winner in view.winners:
                    scores[winner.id] += 1
                
                new_embed.color = 0x00FF00
                winner_mentions = ", ".join([w.mention for w in view.winners])
                new_embed.description = f"**{winner_mentions} acertaram a resposta!**"
                await quiz_message.edit(embed=new_embed, view=view)
                
                if prize > 0:
                    await event_channel.send(f"🏆 Os vencedores ganharam **R$ {prize:.2f}** cada!")
            else:
                new_embed.color = 0xFF0000
                correct_answer_text = question_data['options'][correct_answer_index]
                new_embed.description = f"Tempo esgotado! A resposta correta era: **{correct_answer_text}**"
                await quiz_message.edit(embed=new_embed, view=view)
                await event_channel.send("Ninguém acertou a tempo. Próxima pergunta em breve...")
            
            if index < len(questions_to_ask) - 1:
                await asyncio.sleep(8)
        
        await event_channel.send(embed=discord.Embed(title="🏁 Quiz Finalizado! 🏁", color=0x1E1E1E))
        await asyncio.sleep(3)

        if not scores:
            await event_channel.send("Ninguém pontuou neste quiz. Mais sorte na próxima!")
        else:
            sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
            
            leaderboard_description = ""
            for i, (user_id, score) in enumerate(sorted_scores[:10]):
                try:
                    user = self.bot.get_user(user_id) or await self.bot.fetch_user(user_id)
                    leaderboard_description += f"**{i+1}º:** {user.mention} - {score} acerto(s)\n"
                except discord.NotFound:
                    leaderboard_description += f"**{i+1}º:** Usuário Desconhecido - {score} acerto(s)\n"

            leaderboard_embed = discord.Embed(
                title="🏆 Ranking Final do Quiz 🏆",
                description=leaderboard_description,
                color=0xFFD700
            )
            await event_channel.send(embed=leaderboard_embed)

        self.active_quizzes.remove(quiz_id)

    @app_commands.command(name="iniciar_quiz", description="[Admin] Inicia uma rodada de um quiz personalizado.")
    @app_commands.autocomplete(quiz_id=quiz_autocomplete)
    @app_commands.describe(quiz_id="O nome do quiz que você deseja iniciar.")
    @app_commands.checks.has_permissions(administrator=True)
    async def iniciar_quiz(self, interaction: discord.Interaction, quiz_id: str):
        await interaction.response.defer(ephemeral=True)
        await self.start_quiz_flow(quiz_id, interaction)

    @iniciar_quiz.error
    async def on_quiz_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Você não tem permissão para usar este comando.", ephemeral=True)
        else:
            await interaction.response.send_message(f"Ocorreu um erro: {error}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Quiz(bot))
