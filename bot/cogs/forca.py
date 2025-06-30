
import discord
from discord.ext import commands
from discord import app_commands, ui
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
import asyncio
import unicodedata
import re
import datetime
import random
from collections import defaultdict

load_dotenv()

# --- Helper Functions ---
def normalize_str(s: str) -> str:
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s.lower()

def create_masked_word(word: str, guessed_letters: set) -> str:
    display = ""
    for char in word:
        if not char.isalpha():
            display += char
        elif normalize_str(char) in guessed_letters:
            display += char
        else:
            display += '⬜'
    return ' '.join(list(display))

# --- Game State Class ---
class ForcaGame:
    def __init__(self, channel, words, prize_per_round=200):
        self.channel: discord.TextChannel = channel
        self.words_and_hints = words
        self.prize_per_round = prize_per_round
        
        self.current_round = 0
        self.max_rounds = len(words)
        
        self.current_word = ""
        self.current_hint = ""
        self.normalized_word = ""
        
        self.correct_guesses = set()
        self.wrong_guesses = set()
        self.player_lives = defaultdict(lambda: 5)
        
        self.is_active = False
        self.message: discord.Message | None = None
        self.view: 'ForcaGameView' | None = None
        self.hint_task: asyncio.Task | None = None

    def start_round(self):
        if self.current_round >= self.max_rounds:
            return False # No more rounds

        self.current_word = self.words_and_hints[self.current_round]['word']
        self.current_hint = self.words_and_hints[self.current_round]['hint']
        self.normalized_word = normalize_str(self.current_word)
        
        self.correct_guesses = set()
        self.wrong_guesses = set()
        self.player_lives = defaultdict(lambda: 5)
        self.is_active = True
        self.current_round += 1
        return True

    def make_guess(self, user_id: int, letter: str) -> str:
        if self.player_lives[user_id] <= 0:
            return "NO_LIVES"

        normalized_letter = normalize_str(letter)

        if normalized_letter in self.correct_guesses or normalized_letter in self.wrong_guesses:
            return "ALREADY_GUESSED"
        
        if normalized_letter in self.normalized_word:
            self.correct_guesses.add(normalized_letter)
            # Find all occurrences of the letter
            for i, char in enumerate(self.normalized_word):
                if char == normalized_letter:
                    self.correct_guesses.add(self.current_word[i].lower()) # Add original case too
            return "CORRECT"
        else:
            self.wrong_guesses.add(normalized_letter)
            self.player_lives[user_id] -= 1
            return "WRONG"

    def is_word_guessed(self) -> bool:
        for char in self.current_word:
            if char.isalpha() and normalize_str(char) not in self.correct_guesses:
                return False
        return True

    def get_game_embed(self, title_override=None, description_override=None, color_override=None):
        if title_override:
            title = title_override
        else:
            title = f"Jogo da Forca - Rodada {self.current_round}/{self.max_rounds}"
        
        if description_override:
            description = description_override
        else:
            description = f"**Dica:** {self.current_hint}\n\n`{create_masked_word(self.current_word, self.correct_guesses)}`"
            
        embed = discord.Embed(
            title=title,
            description=description,
            color=color_override or discord.Color.blue()
        )
        
        if not description_override:
            embed.add_field(name="Letras Erradas", value=' '.join(sorted(list(self.wrong_guesses))).upper() or "Nenhuma", inline=False)
            embed.set_footer(text="Clique nas letras para adivinhar. Você tem 5 vidas por rodada.")
        
        return embed

# --- UI View and Button ---
class LetterButton(ui.Button['ForcaGameView']):
    def __init__(self, letter: str):
        super().__init__(label=letter.upper(), style=discord.ButtonStyle.secondary, custom_id=f"forca_{letter.upper()}")

    async def callback(self, interaction: discord.Interaction):
        assert self.view is not None
        view: 'ForcaGameView' = self.view
        game = view.game
        user = interaction.user

        result = game.make_guess(user.id, self.label)
        
        if result == "NO_LIVES":
            await interaction.response.send_message("❤️ Você não tem mais vidas nesta rodada. Aguarde a próxima palavra!", ephemeral=True)
            return

        if result == "ALREADY_GUESSED":
            await interaction.response.send_message("🤔 Esta letra já foi tentada.", ephemeral=True)
            return
            
        self.disabled = True
        
        if result == "WRONG":
            await interaction.response.send_message(f"❌ Letra errada! Você tem {game.player_lives[user.id]} vidas restantes.", ephemeral=True)
        
        if result == "CORRECT":
            await interaction.response.send_message("✅ Letra correta!", ephemeral=True)

        # Update the main message with the new state
        await view.update_message()

        if game.is_word_guessed():
            await view.cog.handle_win(interaction, game)

class ForcaGameView(ui.View):
    def __init__(self, cog: 'Forca', game: 'ForcaGame'):
        super().__init__(timeout=60.0)
        self.cog = cog
        self.game = game
        self.game.view = self

        letters = "QWERTYUIOPASDFGHJKLZXCVBNM"
        for letter in letters:
            self.add_item(LetterButton(letter))
    
    async def on_timeout(self):
        # Ensure the game is still active for this view
        if self.cog.active_games.get(self.game.channel.id) is self.game:
             await self.cog.handle_timeout(self.game)

    async def update_message(self):
        if self.game.message:
            await self.game.message.edit(embed=self.game.get_game_embed(), view=self)

# --- Discord Cog Class ---
class Forca(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.bot_db = self.client.timaocord_bot
        self.users_collection = self.db.users
        self.words_collection = self.db.forca_words
        self.wallets_collection = self.db.wallets
        self.bot_config_collection = self.bot_db.config
        self.active_games = {} # channel_id -> ForcaGame instance

    def cog_unload(self):
        for game in self.active_games.values():
            if game.view:
                game.view.stop()
            if game.hint_task:
                game.hint_task.cancel()
        self.client.close()

    async def end_game_session(self, game: ForcaGame, reason="Obrigado por jogar!"):
        if game.channel.id in self.active_games:
            if game.view:
                game.view.stop()
            if game.hint_task:
                game.hint_task.cancel()
            
            embed = discord.Embed(title="🏁 Fim de Jogo!", description=reason, color=discord.Color.gold())
            if game.message:
                 await game.message.edit(embed=embed, view=None)
            else:
                await game.channel.send(embed=embed)
            
            del self.active_games[game.channel.id]

    async def start_new_round_or_end_game(self, game: ForcaGame):
        if not game.start_round():
            await self.end_game_session(game)
            return

        view = ForcaGameView(self, game)
        embed = game.get_game_embed()
        message = await game.channel.send(embed=embed, view=view)
        game.message = message
        
        game.hint_task = asyncio.create_task(self.reveal_letter_hint(game))

    async def handle_win(self, interaction: discord.Interaction, game: ForcaGame):
        if not game.is_active: return
        game.is_active = False # Prevent multiple win triggers
        
        if game.view: game.view.stop()
        if game.hint_task: game.hint_task.cancel()

        prize = game.prize_per_round
        user_id_str = str(interaction.user.id)

        new_transaction = {
            "id": str(ObjectId()), "type": "Prêmio",
            "description": f"Prêmio do jogo da Forca",
            "amount": prize,
            "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "Concluído"
        }
        self.wallets_collection.update_one(
            {"userId": user_id_str},
            {"$inc": {"balance": prize}, "$push": {"transactions": {"$each": [new_transaction], "$sort": {"date": -1}}}},
            upsert=True
        )

        self.users_collection.update_one(
            {"discordId": user_id_str},
            {"$addToSet": {"unlockedAchievements": "win_forca"}}
        )

        embed = game.get_game_embed(
            title_override=f"🏆 {interaction.user.display_name} acertou!",
            description_override=f"Parabéns! A palavra era **{game.current_word}**. Você ganhou **R$ {prize:.2f}**!",
            color_override=discord.Color.green()
        )
        await interaction.message.edit(embed=embed, view=None)
        
        await asyncio.sleep(5)
        await self.start_new_round_or_end_game(game)

    async def handle_timeout(self, game: ForcaGame):
        if not game.is_active: return
        game.is_active = False
        
        if game.view: game.view.stop()
        if game.hint_task: game.hint_task.cancel()

        embed = game.get_game_embed(
            title_override=f"Rodada {game.current_round} Encerrada!",
            description_override=f"O tempo acabou! A palavra era **{game.current_word}**.",
            color_override=discord.Color.red()
        )
        if game.message:
            await game.message.edit(embed=embed, view=None)

        await asyncio.sleep(5)
        await self.start_new_round_or_end_game(game)

    async def reveal_letter_hint(self, game: ForcaGame):
        try:
            await asyncio.sleep(30)
            if not game.is_active: return

            unrevealed_letters = [c for c in game.normalized_word if c.isalpha() and c not in game.correct_guesses]
            if unrevealed_letters:
                letter_to_reveal = random.choice(unrevealed_letters)
                game.correct_guesses.add(letter_to_reveal)
                
                for i, char in enumerate(game.normalized_word):
                    if char == letter_to_reveal:
                        game.correct_guesses.add(game.current_word[i].lower())
                        
                await game.channel.send(f"💡 **Dica de Letra:** A letra **'{letter_to_reveal.upper()}'** está na palavra!")
                if game.view:
                    await game.view.update_message()
        except asyncio.CancelledError:
            return

    async def run_game(self, channel: discord.TextChannel):
        if not channel:
            print("Forca: Invalid channel provided.")
            return

        if channel.id in self.active_games:
            await channel.send("❌ Um jogo da forca já está ativo neste canal.", delete_after=10)
            return

        words_cursor = self.words_collection.aggregate([{"$sample": {"size": 3}}])
        words = list(words_cursor)
        if len(words) < 3:
            await channel.send("❌ Não há palavras suficientes no banco de dados para iniciar (mínimo 3).", delete_after=10)
            return
        
        await channel.send("✅ Iniciando o jogo da Forca com 3 rodadas! Preparem-se...")

        game = ForcaGame(channel, words)
        self.active_games[channel.id] = game
        
        await asyncio.sleep(2)
        await self.start_new_round_or_end_game(game)
    
    async def run_scheduled_game(self):
        config_doc = self.bot_config_collection.find_one({"_id": ObjectId('669fdb5a907548817b848c48')})
        if not config_doc or not config_doc.get('forcaChannelId'):
            print("Forca schedule error: Forca Channel ID is not configured.")
            return
        
        channel_id_str = config_doc.get('forcaChannelId')
        try:
            channel_id = int(channel_id_str)
            channel = self.bot.get_channel(channel_id)
            if not channel or not isinstance(channel, discord.TextChannel):
                print(f"Forca schedule error: Channel with ID {channel_id} not found or is not a text channel.")
                return
            
            # Check if a game is already active in that specific channel
            if channel_id in self.active_games:
                print(f"Forca schedule error: Game already active in scheduled channel {channel_id}.")
                return

            await self.run_game(channel)
        except (ValueError, TypeError):
            print(f"Forca schedule error: Invalid channel ID '{channel_id_str}' in config.")
        
    @app_commands.command(name="iniciar_forca", description="[Admin] Inicia o jogo da Forca neste canal.")
    @app_commands.checks.has_permissions(administrator=True)
    async def iniciar_forca(self, interaction: discord.Interaction):
        await interaction.response.send_message("Iniciando o jogo...", ephemeral=True)
        await self.run_game(interaction.channel)

async def setup(bot):
    await bot.add_cog(Forca(bot))
