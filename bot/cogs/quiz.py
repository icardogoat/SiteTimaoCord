
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
    def __init__(self, question_data):
        super().__init__(timeout=30.0) # 30 second timeout per question
        self.question_data = question_data
        self.winner = None
        self.message = None

        for i, option in enumerate(self.question_data['options']):
            button = ui.Button(label=option, style=discord.ButtonStyle.secondary, custom_id=f"quiz_option_{i}")
            button.callback = self.button_callback
            self.add_item(button)

    async def button_callback(self, interaction: discord.Interaction):
        if self.winner:
            await interaction.response.send_message("Alguém já acertou esta pergunta. Aguarde a próxima!", ephemeral=True)
            return

        selected_option_index = int(interaction.data['custom_id'].split('_')[-1])
        correct_answer_index = self.question_data.get('answer', -1)

        if selected_option_index == correct_answer_index:
            self.winner = interaction.user
            
            for item in self.children:
                if isinstance(item, ui.Button):
                    item.disabled = True
                    if item.custom_id == interaction.data['custom_id']:
                        item.style = discord.ButtonStyle.success
                    else:
                        item.style = discord.ButtonStyle.danger

            new_embed = interaction.message.embeds[0]
            new_embed.color = 0x00FF00
            new_embed.description = f"**{self.winner.mention} acertou a resposta!**"
            
            await interaction.response.edit_message(embed=new_embed, view=self)
            self.stop()
        else:
            await interaction.response.send_message("❌ Resposta incorreta!", ephemeral=True)

class Quiz(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.quizzes_collection = self.db.quizzes
        self.wallets_collection = self.db.wallets
        self.users_collection = self.db.users

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

        questions = quiz_doc.get('questions', [])
        if not questions:
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

        # Get quiz settings
        questions_per_game = quiz_doc.get('questionsPerGame', len(questions))
        winner_limit = quiz_doc.get('winnerLimit', 0)
        mention_role_id = quiz_doc.get('mentionRoleId')

        # Shuffle and slice questions
        random.shuffle(questions)
        questions_to_ask = questions[:questions_per_game]

        mention_text = ""
        if mention_role_id:
            mention_text = f"<@&{mention_role_id}>"

        await interaction.followup.send(f"✅ Quiz '{quiz_doc['name']}' sendo iniciado no canal {event_channel.mention}!", ephemeral=True)
        
        start_embed = discord.Embed(
            title=f"🧠 Quiz '{quiz_doc.get('name', 'Quiz do Timão')}' vai começar!",
            description=f"Prepare-se! A primeira pergunta será enviada em 10 segundos...",
            color=0x1E90FF
        )
        await event_channel.send(content=mention_text, embed=start_embed)
        await asyncio.sleep(10)

        scores = defaultdict(int)
        unique_winners_with_prize = set()
        
        for index, question_data in enumerate(questions_to_ask):
            question_embed = discord.Embed(
                title=f"Pergunta {index + 1}/{len(questions_to_ask)}",
                description=f"**{question_data['question']}**",
                color=0x1E1E1E
            )
            question_embed.set_footer(text="O primeiro a acertar ganha! Você tem 30 segundos.")

            view = QuizQuestionView(question_data)
            
            quiz_message = await event_channel.send(embed=question_embed, view=view)
            view.message = quiz_message

            await view.wait()
            
            if view.winner:
                winner = view.winner
                scores[winner.id] += 1

                is_new_winner = winner.id not in unique_winners_with_prize
                can_win_prize = (winner_limit == 0) or (len(unique_winners_with_prize) < winner_limit) or not is_new_winner

                if can_win_prize:
                    prize = quiz_doc.get('rewardPerQuestion', 0)
                    if prize > 0:
                        unique_winners_with_prize.add(winner.id)
                        await self.award_prize(winner, prize, quiz_doc.get('name', 'Quiz'))
                        await event_channel.send(f"🏆 {winner.mention} acertou e ganhou **R$ {prize:.2f}**!")
                    else:
                        await event_channel.send(f"🎉 {winner.mention} acertou!")
                else:
                    await event_channel.send(f"🎉 {winner.mention} acertou! O limite de vencedores com prêmio já foi atingido, mas seu acerto foi computado para o ranking final.")
            else: 
                timeout_embed = quiz_message.embeds[0]
                timeout_embed.color = 0xFF0000
                correct_answer_text = question_data['options'][question_data['answer']]
                timeout_embed.description = f"Tempo esgotado! A resposta correta era: **{correct_answer_text}**"
                for item in view.children:
                    if isinstance(item, ui.Button): item.disabled = True
                await quiz_message.edit(embed=timeout_embed, view=view)
                await event_channel.send("Ninguém acertou a tempo. Próxima pergunta em breve...")
            
            if index < len(questions_to_ask) - 1:
                await asyncio.sleep(8)
        
        await event_channel.send(embed=discord.Embed(title="🏁 Quiz Finalizado! 🏁", color=0x1E1E1E))
        await asyncio.sleep(3)

        if not scores:
            await event_channel.send("Ninguém pontuou neste quiz. Mais sorte na próxima!")
            return

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

    @iniciar_quiz.error
    async def on_quiz_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Você não tem permissão para usar este comando.", ephemeral=True)
        else:
            await interaction.response.send_message(f"Ocorreu um erro: {error}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Quiz(bot))
