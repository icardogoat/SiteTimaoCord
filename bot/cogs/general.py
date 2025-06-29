
import discord
from discord.ext import commands
from discord import app_commands

class General(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ajuda", description="❓ Mostra todos os comandos disponíveis.")
    async def ajuda(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        embed = discord.Embed(
            title="Ajuda - Comandos do FielBet Bot",
            description="Aqui está a lista de todos os comandos que você pode usar:",
            color=0x1E90FF
        )
        if self.bot.user:
            embed.set_thumbnail(url=self.bot.user.display_avatar.url)

        # Group commands by Cog
        cogs = {cog_name: [] for cog_name in self.bot.cogs}
        for command in self.bot.tree.get_commands():
            if command.cog_name:
                cogs[command.cog_name].append(command)

        for cog_name, cog_commands in cogs.items():
            # Don't show internal tasks or event listeners that have no user-facing commands
            if cog_commands and cog_name not in ["Tasks", "Leveling"]:
                command_list = sorted([f"`/{cmd.name}`: {cmd.description}" for cmd in cog_commands if isinstance(cmd, app_commands.Command)])
                if command_list:
                    cog_display_name = cog_name.replace("Cog", "") # Make name cleaner
                    embed.add_field(name=f"**{cog_display_name}**", value="\n".join(command_list), inline=False)
        
        embed.set_footer(text="FielBet - Sempre com o Timão!")
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="ping", description="🏓 Verifica a latência do bot.")
    async def ping(self, interaction: discord.Interaction):
        latency = self.bot.latency * 1000  # Latency in milliseconds
        embed = discord.Embed(
            title="🏓 Pong!",
            description=f"A latência do bot é de **{latency:.2f}ms**.",
            color=0x00FF00 if latency < 150 else 0xFFFF00 if latency < 300 else 0xFF0000
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot):
    await bot.add_cog(General(bot))
