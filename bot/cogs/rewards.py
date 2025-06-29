import discord
from discord.ext import commands
from discord import app_commands
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import datetime
import secrets
import string

load_dotenv()

# Helper to generate a unique code
def generate_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

class Rewards(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.users_collection = self.db.users
        self.promo_codes_collection = self.db.promo_codes

    def cog_unload(self):
        self.client.close()

    @app_commands.command(name="diaria", description="💰 Resgate seu código de recompensa diária.")
    async def diaria(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        
        user_doc = self.users_collection.find_one({"discordId": user_id})
        
        if not user_doc:
            site_url = os.getenv('SITE_URL', 'http://localhost:9003')
            embed = discord.Embed(
                title="❌ Conta Não Encontrada",
                description=f"Você precisa fazer login no nosso site pelo menos uma vez para usar os comandos do bot.\n\n**[Clique aqui para acessar o site]({site_url})** e faça o login com sua conta do Discord.",
                color=0xff8800
            )
            await interaction.followup.send(embed=embed)
            return

        now = datetime.datetime.now(datetime.timezone.utc)
        last_claim = user_doc.get("lastDailyCodeClaim")

        if last_claim and (now - last_claim) < datetime.timedelta(hours=22):
             cooldown_ends = last_claim + datetime.timedelta(hours=22)
             await interaction.followup.send(f"Você já resgatou seu código diário. Tente novamente <t:{int(cooldown_ends.timestamp())}:R>.", ephemeral=True)
             return

        # Generate a new code
        new_code = generate_code()
        
        # Ensure code is unique (highly unlikely to collide, but good practice)
        while self.promo_codes_collection.find_one({"code": new_code}):
            new_code = generate_code()

        code_doc = {
            "code": new_code,
            "type": "DAILY",
            "description": "Recompensa Diária do Discord",
            "value": 250,
            "status": "ACTIVE",
            "maxUses": 1, # Explicitly single-use
            "redeemedBy": [],
            "createdAt": now,
            "expiresAt": now + datetime.timedelta(minutes=30),
            "createdBy": "SYSTEM_DISCORD",
        }
        
        self.promo_codes_collection.insert_one(code_doc)
        self.users_collection.update_one({"discordId": user_id}, {"$set": {"lastDailyCodeClaim": now}}, upsert=True)
        
        embed = discord.Embed(
            title="✅ Seu Código Diário!",
            description=f"Seu código de recompensa diária está pronto! Resgate no site para ganhar **R$ 250,00**.\n\n**Observação:** Este código é de uso único e expira em 30 minutos.",
            color=0x00FF00
        )
        embed.add_field(name="Seu Código", value=f"```\n{new_code}\n```")
        embed.set_footer(text="Você pode dar este código para um amigo.")
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
    @app_commands.command(name="gerar_codigo", description="[Admin] Gera códigos promocionais.")
    @app_commands.checks.has_permissions(administrator=True)
    @app_commands.choices(tipo=[
        app_commands.Choice(name="Dinheiro", value="money"),
        app_commands.Choice(name="XP", value="xp")
    ])
    @app_commands.describe(limite="O número máximo de vezes que cada código pode ser usado. Deixe em branco para ilimitado.")
    async def gerar_codigo(self, interaction: discord.Interaction, tipo: app_commands.Choice[str], valor: float, quantidade: app_commands.Range[int, 1, 20], descricao: str, limite: app_commands.Range[int, 1, 1000] = None):
            
        await interaction.response.defer(ephemeral=True)
        
        generated_codes = []
        for _ in range(quantidade):
            new_code = generate_code()
            while self.promo_codes_collection.find_one({"code": new_code}):
                new_code = generate_code()
                
            code_doc = {
                "code": new_code,
                "type": tipo.value.upper(),
                "description": descricao,
                "value": valor,
                "status": "ACTIVE",
                "maxUses": limite,
                "redeemedBy": [],
                "createdAt": datetime.datetime.now(datetime.timezone.utc),
                "expiresAt": None,
                "createdBy": str(interaction.user.id),
            }
            self.promo_codes_collection.insert_one(code_doc)
            generated_codes.append(new_code)
            
        codes_str = "\n".join(generated_codes)
        limite_str = str(limite) if limite is not None else "Ilimitado"

        embed = discord.Embed(
            title=f"✅ {quantidade} Código(s) Gerado(s)!",
            description=f"**Tipo:** {tipo.name}\n**Valor:** {valor}\n**Limite de Uso:** {limite_str}\n**Descrição:** {descricao}",
            color=0x1E90FF
        )
        embed.add_field(name="Códigos", value=f"```\n{codes_str}\n```")
        
        await interaction.followup.send(embed=embed, ephemeral=True)
        
    @gerar_codigo.error
    async def on_gerar_codigo_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Você não tem permissão para usar este comando.", ephemeral=True)
        else:
            await interaction.response.send_message(f"Ocorreu um erro: {error}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Rewards(bot))
