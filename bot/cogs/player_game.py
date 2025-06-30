

import discord
from discord.ext import commands, tasks
from discord import app_commands
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import asyncio
import unicodedata

load_dotenv()

class PlayerGame(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.games_collection = self.db.player_guessing_games
        self.wallets_collection = self.db.wallets
        self.users_collection = self.db.users
        self.active_game_id = None
        self.game_task = None
        self.player_game_loop.start()

    def cog_unload(self):
        self.player_game_loop.cancel()
        if self.game_task:
            self.game_task.cancel()
        self.client.close()
        
    def normalize_str(self, s: str) -> str:
        s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
        return s.lower().strip()

    async def start_game_if_active(self, active_game):
        self.active_game_id = active_game['_id']
        
        channel_id_str = active_game.get('channelId')
        if not channel_id_str:
            print(f"Player game {active_game['_id']} has no channel ID configured. Cannot start.")
            await self.games_collection.update_one(
                {"_id": active_game['_id']},
                {"$set": {"status": "draft"}}
            )
            return

        channel = self.bot.get_channel(int(channel_id_str))
        if not channel:
            print(f"Player game channel with ID {channel_id_str} not found.")
            return
            
        embed = discord.Embed(
            title="🤔 Quem é o Jogador?",
            description="Um novo jogo de adivinhação começou! Use as dicas para descobrir o jogador misterioso. O primeiro a acertar leva o prêmio!",
            color=discord.Color.gold()
        )
        embed.add_field(name="💰 Prêmio", value=f"**R$ {active_game['prizeAmount']:.2f}**")
        embed.set_footer(text="Digite o nome do jogador no chat para adivinhar.")
        await channel.send(embed=embed)

        # Start the hint/letter revealing task
        if self.game_task:
            self.game_task.cancel()
        self.game_task = self.bot.loop.create_task(self.reveal_loop(channel, active_game))

    async def reveal_loop(self, channel: discord.TextChannel, game_data: dict):
        try:
            # Reveal hints
            for i, hint in enumerate(game_data['hints']):
                await asyncio.sleep(25)
                embed = discord.Embed(
                    title=f"💡 Dica #{i+1}",
                    description=hint,
                    color=discord.Color.blue()
                )
                await channel.send(embed=embed)
            
            # If no one guessed, reveal letters
            await asyncio.sleep(15)
            await channel.send("Ninguém acertou ainda! Vou começar a revelar as letras do nome...")
            
            player_name = game_data['playerName']
            revealed_name = ['_'] * len(player_name)
            for i, char in enumerate(player_name):
                if not char.isalpha():
                    revealed_name[i] = char

            for i, char in enumerate(player_name):
                if revealed_name[i] == '_':
                    await asyncio.sleep(20)
                    revealed_name[i] = char
                    await channel.send(f"Dica de letra: `{' '.join(revealed_name)}`")

            # If still no one guessed after all letters revealed, end game
            await asyncio.sleep(10)
            await self.end_game(channel, None, game_data, "Ninguém acertou o jogador a tempo.")
            
        except asyncio.CancelledError:
            pass # Game was won and task was cancelled

    async def end_game(self, channel: discord.TextChannel, winner: discord.User | None, game_data: dict, reason: str):
        player_name = game_data['playerName']
        prize = game_data['prizeAmount']
        
        if winner:
            embed = discord.Embed(
                title=f"🏆 {winner.display_name} acertou!",
                description=f"O jogador era **{player_name}**! {winner.mention} ganhou **R$ {prize:.2f}**!",
                color=discord.Color.green()
            )
            embed.set_thumbnail(url=winner.display_avatar.url)
            
            # Award prize
            user_id = str(winner.id)
            user_doc = self.users_collection.find_one({"discordId": user_id})
            if user_doc:
                new_transaction = {
                    "id": str(ObjectId()), "type": "Prêmio",
                    "description": f"Prêmio do jogo 'Quem é o Jogador?'",
                    "amount": prize,
                    "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "status": "Concluído"
                }
                self.wallets_collection.update_one(
                    {"userId": user_id},
                    {"$inc": {"balance": prize}, "$push": {"transactions": {"$each": [new_transaction], "$sort": {"date": -1}}}},
                    upsert=True
                )
        else: # No winner
            embed = discord.Embed(
                title="🏁 Jogo Finalizado!",
                description=f"{reason}\nO jogador era **{player_name}**.",
                color=discord.Color.red()
            )
        
        await channel.send(embed=embed)

        # Update game status in DB
        update_doc = {
            "$set": {
                "status": "finished",
                "winnerId": str(winner.id) if winner else None,
                "winnerName": winner.display_name if winner else None,
                "winnerAvatar": str(winner.display_avatar.url) if winner else None,
            }
        }
        self.games_collection.update_one({"_id": self.active_game_id}, update_doc)

        self.active_game_id = None
        if self.game_task:
            self.game_task.cancel()
            self.game_task = None
    
    @tasks.loop(seconds=10.0)
    async def player_game_loop(self):
        # This loop only checks if a game should START. The active game logic is in reveal_loop.
        if self.active_game_id is None:
            active_game = self.games_collection.find_one({"status": "active"})
            if active_game:
                await self.start_game_if_active(active_game)

    @player_game_loop.before_loop
    async def before_player_game_loop(self):
        await self.bot.wait_until_ready()
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if not self.active_game_id or message.author.bot:
            return

        active_game = self.games_collection.find_one({"_id": self.active_game_id})
        if not active_game or active_game['status'] != 'active':
            return
        
        # Check if the message is in the correct channel
        if str(message.channel.id) != active_game.get('channelId'):
            return

        normalized_guess = self.normalize_str(message.content)
        normalized_answer = self.normalize_str(active_game['playerName'])

        if normalized_guess == normalized_answer:
            await self.end_game(message.channel, message.author, active_game, "Um vencedor foi encontrado!")

    @app_commands.command(name="iniciar_jogador", description="[Admin] Inicia o jogo 'Quem é o Jogador?'.")
    @app_commands.describe(id="O ID do jogo que você quer iniciar (encontrado no painel admin).")
    @app_commands.checks.has_permissions(administrator=True)
    async def iniciar_jogador(self, interaction: discord.Interaction, id: str):
        if self.active_game_id:
            await interaction.response.send_message("❌ Um jogo já está em andamento. Finalize-o antes de iniciar outro.", ephemeral=True)
            return
            
        try:
            game_id = ObjectId(id)
        except Exception:
            await interaction.response.send_message("❌ ID do jogo inválido.", ephemeral=True)
            return

        game = self.games_collection.find_one({"_id": game_id})
        if not game:
            await interaction.response.send_message("❌ Jogo não encontrado com este ID.", ephemeral=True)
            return

        if not game.get('channelId'):
            await interaction.response.send_message("❌ Este jogo não tem um canal configurado. Edite-o no painel admin.", ephemeral=True)
            return

        self.games_collection.update_one({"_id": game_id}, {"$set": {"status": "active"}})
        await interaction.response.send_message(f"✅ Jogo '{game['playerName']}' iniciado! O bot assumirá a partir daqui.", ephemeral=True)


async def setup(bot):
    await bot.add_cog(PlayerGame(bot))
