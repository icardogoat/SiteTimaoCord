import discord
from discord.ext import commands
from discord import app_commands
import datetime
import os
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import random
import time

load_dotenv()

# Fixed IDs for config documents
LEVEL_CONFIG_ID = ObjectId('66a500a8a7c3d2e3c4f5b6a8')
BOT_CONFIG_ID = ObjectId('669fdb5a907548817b848c48')

class Leveling(commands.Cog):
    def __init__(self, bot):
        self.bot: commands.Bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.bot_db = self.client.timaocord_bot
        self.users = self.db.users
        self.wallets = self.db.wallets
        self.level_config_collection = self.db.level_config
        self.bot_config_collection = self.bot_db.config
        
        # Simple in-memory caches to replace cachetools
        self.message_cooldowns = {}  # Stores user_id: timestamp
        self.level_config_cache = {} # Stores 'config': (timestamp, data)
        self.bot_config_cache = {}   # Stores 'config': (timestamp, data)
        self.MESSAGE_COOLDOWN_SECONDS = 60
        self.CONFIG_CACHE_SECONDS = 900 # 15 minutes

    def cog_unload(self):
        self.client.close()

    async def get_level_config(self):
        """Fetches level configuration from cache or database."""
        cached = self.level_config_cache.get('config')
        if cached and (time.time() - cached[0]) < self.CONFIG_CACHE_SECONDS:
            return cached[1]
        
        config_doc = self.level_config_collection.find_one({"_id": LEVEL_CONFIG_ID})
        if config_doc and 'levels' in config_doc:
            config = sorted(config_doc['levels'], key=lambda x: x['level'])
            self.level_config_cache['config'] = (time.time(), config)
            return config
        return []
    
    async def get_bot_config(self):
        """Fetches bot configuration from cache or database."""
        cached = self.bot_config_cache.get('config')
        if cached and (time.time() - cached[0]) < self.CONFIG_CACHE_SECONDS:
            return cached[1]
        
        config_doc = self.bot_config_collection.find_one({"_id": BOT_CONFIG_ID})
        if config_doc:
            self.bot_config_cache['config'] = (time.time(), config_doc)
            return config_doc
        return {}

    async def grant_xp(self, user: discord.Member, amount: int, channel: discord.TextChannel):
        """Grants XP to a user, checks for level ups, and handles rewards."""
        if not user or user.bot:
            return

        user_id = str(user.id)
        
        user_doc = self.users.find_one_and_update(
            {"discordId": user_id},
            {"$inc": {"xp": amount}},
            upsert=True,
            return_document=True
        )

        current_level = user_doc.get('level', 1)
        new_xp = user_doc.get('xp', 0) + amount

        level_config = await self.get_level_config()
        if not level_config:
            return

        new_level_data = None
        for level_info in reversed(level_config):
            if new_xp >= level_info['xp']:
                new_level_data = level_info
                break
        
        if new_level_data and new_level_data['level'] > current_level:
            # User leveled up!
            self.users.update_one({"discordId": user_id}, {"$set": {"level": new_level_data['level']}})
            
            level_up_embed = discord.Embed(
                title="🎉 Level Up!",
                description=f"Parabéns, {user.mention}! Você alcançou o **Nível {new_level_data['level']}: {new_level_data['name']}**!",
                color=0xFFD700
            )
            level_up_embed.set_thumbnail(url=user.display_avatar.url)

            # Handle rewards
            reward_description = ""
            reward_type = new_level_data.get('rewardType')
            if reward_type == 'money':
                reward_amount = new_level_data.get('rewardAmount', 0)
                if reward_amount > 0:
                    self.wallets.update_one(
                        {"userId": user_id},
                        {"$inc": {"balance": reward_amount}},
                        upsert=True
                    )
                    reward_description = f"💰 Você ganhou uma recompensa de **R$ {reward_amount:,.2f}**!"
            
            elif reward_type == 'role':
                role_id = new_level_data.get('rewardRoleId')
                if role_id and isinstance(channel, discord.TextChannel) and channel.guild:
                    role = channel.guild.get_role(int(role_id))
                    if role:
                        try:
                            await user.add_roles(role)
                            reward_description = f"✨ Você recebeu o cargo **{role.name}**!"
                        except discord.Forbidden:
                            reward_description = f"⚠️ Não foi possível adicionar o cargo '{role.name}'. Verifique as permissões do bot."
                        except Exception as e:
                            print(f"Error adding role {role_id} to user {user_id}: {e}")
                            reward_description = f"⚠️ Ocorreu um erro ao tentar adicionar o cargo."
                    else:
                        reward_description = f"⚠️ O cargo com ID `{role_id}` não foi encontrado no servidor."

            if reward_description:
                level_up_embed.add_field(name="Recompensa", value=reward_description, inline=False)
            
            # Determine target channel
            bot_config = await self.get_bot_config()
            target_channel = channel # Fallback to the original channel
            
            level_up_channel_id = bot_config.get('levelUpChannelId')
            if level_up_channel_id:
                try:
                    config_channel = self.bot.get_channel(int(level_up_channel_id))
                    if config_channel and isinstance(config_channel, discord.TextChannel):
                        target_channel = config_channel
                    else:
                        print(f"Level up channel ID {level_up_channel_id} not found or is not a text channel.")
                except ValueError:
                     print(f"Invalid level up channel ID in config: {level_up_channel_id}")

            try:
                # Send the level up message, deleting it after 1 minute to reduce spam
                await target_channel.send(embed=level_up_embed, delete_after=60)
            except (discord.Forbidden, discord.HTTPException):
                print(f"Bot could not send level up message in channel {target_channel.id}")

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Grants XP for messages sent by users."""
        if not message.guild or message.author.bot:
            return

        user_id = str(message.author.id)
        
        # Check cooldown
        now = time.time()
        if user_id in self.message_cooldowns and (now - self.message_cooldowns[user_id]) < self.MESSAGE_COOLDOWN_SECONDS:
            return
            
        # Add to cooldown
        self.message_cooldowns[user_id] = now

        xp_to_grant = random.randint(15, 25)
        await self.grant_xp(message.author, xp_to_grant, message.channel)

    @commands.Cog.listener()
    async def on_app_command_completion(self, interaction: discord.Interaction, command: app_commands.Command):
        """Grants XP for using slash commands."""
        if not interaction.guild or interaction.user.bot:
            return
            
        xp_to_grant = 20
        # Ensure channel is a TextChannel for sending messages
        if isinstance(interaction.channel, discord.TextChannel):
            await self.grant_xp(interaction.user, xp_to_grant, interaction.channel)

async def setup(bot):
    await bot.add_cog(Leveling(bot))
