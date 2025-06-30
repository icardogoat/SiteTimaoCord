import discord
from discord.ext import commands
from discord import app_commands
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import datetime
from collections import defaultdict

load_dotenv()

class Invites(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.invites_collection = self.db.invites
        self.users_collection = self.db.users
        self.member_activity_collection = self.db.member_activity
        # Cache for guild invites: {guild_id: {invite_code: uses}}
        self.invite_cache = defaultdict(dict)

    def cog_unload(self):
        self.client.close()

    async def sync_invites(self, guild: discord.Guild):
        """Syncs the invite cache for a specific guild."""
        try:
            invites = await guild.invites()
            self.invite_cache[guild.id] = {invite.code: invite.uses for invite in invites}
        except discord.Forbidden:
            print(f"Bot doesn't have permissions to view invites in guild {guild.id}")
        except Exception as e:
            print(f"Error syncing invites for guild {guild.id}: {e}")

    @commands.Cog.listener()
    async def on_ready(self):
        print("Invite tracker is ready. Caching invites for all guilds...")
        for guild in self.bot.guilds:
            await self.sync_invites(guild)
        print("Invite cache populated.")

    @commands.Cog.listener()
    async def on_guild_join(self, guild: discord.Guild):
        """Caches invites when the bot joins a new guild."""
        await self.sync_invites(guild)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if member.bot:
            return

        # Record join event
        self.member_activity_collection.insert_one({
            "guildId": str(member.guild.id),
            "userId": str(member.id),
            "type": "join",
            "timestamp": datetime.datetime.now(datetime.timezone.utc)
        })

        try:
            # 1. Get the current invites for the guild
            current_invites = await member.guild.invites()
            
            # 2. Get the cached invites
            cached_invites = self.invite_cache.get(member.guild.id, {})
            
            # 3. Find the invite that was used
            used_invite = None
            for invite in current_invites:
                # If the invite is new or its use count has increased
                if invite.code not in cached_invites or invite.uses > cached_invites.get(invite.code, 0):
                    used_invite = invite
                    break

            # 4. If we found the used invite, record it
            if used_invite and used_invite.inviter:
                # Check if inviter is a registered user on the website
                inviter_id = str(used_invite.inviter.id)
                if not self.users_collection.find_one({"discordId": inviter_id}):
                    print(f"Inviter {inviter_id} is not registered on the site. Skipping invite record.")
                    # Update cache regardless
                    await self.sync_invites(member.guild)
                    return

                # Record the successful invite
                self.invites_collection.insert_one({
                    "guildId": str(member.guild.id),
                    "inviterId": inviter_id,
                    "inviteeId": str(member.id),
                    "timestamp": datetime.datetime.now(datetime.timezone.utc)
                })
                print(f"{member.name} joined using an invite from {used_invite.inviter.name}")
            else:
                print(f"Could not determine the inviter for {member.name}. They might have used a vanity URL or an expired link.")
                
            # 5. Update the cache with the new invite uses
            await self.sync_invites(member.guild)

        except discord.Forbidden:
            print(f"Cannot track invites in {member.guild.name} due to missing permissions.")
        except Exception as e:
            print(f"An error occurred in on_member_join: {e}")

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        if member.bot:
            return
        
        self.member_activity_collection.insert_one({
            "guildId": str(member.guild.id),
            "userId": str(member.id),
            "type": "leave",
            "timestamp": datetime.datetime.now(datetime.timezone.utc)
        })

    @commands.Cog.listener()
    async def on_invite_create(self, invite: discord.Invite):
        """Updates cache when a new invite is created."""
        if invite.guild:
            self.invite_cache[invite.guild.id][invite.code] = invite.uses
            
    @commands.Cog.listener()
    async def on_invite_delete(self, invite: discord.Invite):
        """Updates cache when an invite is deleted."""
        if invite.guild and invite.code in self.invite_cache.get(invite.guild.id, {}):
            del self.invite_cache[invite.guild.id][invite.code]

    @app_commands.command(name="convites", description="🤝 Veja quantos membros você já convidou para o servidor.")
    async def meus_convites(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        
        invite_count = self.invites_collection.count_documents({"inviterId": user_id})

        embed = discord.Embed(
            title="🤝 Meus Convites",
            description=f"Você convidou um total de **{invite_count}** membro(s) para o servidor!",
            color=0x1E90FF
        )
        embed.set_author(name=interaction.user.display_name, icon_url=interaction.user.display_avatar.url)
        embed.set_footer(text="Continue convidando para ganhar recompensas!")
        await interaction.followup.send(embed=embed)


async def setup(bot):
    await bot.add_cog(Invites(bot))
