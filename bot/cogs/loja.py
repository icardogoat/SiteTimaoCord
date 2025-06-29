import discord
from discord.ext import commands
from discord import app_commands
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import datetime
from bson.objectid import ObjectId

load_dotenv()

class Loja(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.inventory = self.db.user_inventory
        self.store_items = self.db.store_items

    def cog_unload(self):
        self.client.close()

    @app_commands.command(name="resgatar", description="🎁 Resgate um código de item comprado na loja.")
    @app_commands.describe(codigo="O código que você recebeu ao comprar na loja.")
    async def resgatar(self, interaction: discord.Interaction, codigo: str):
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        
        inventory_item = self.inventory.find_one({"redemptionCode": codigo.upper()})

        if not inventory_item:
            await interaction.followup.send("❌ Código de resgate inválido ou não encontrado.", ephemeral=True)
            return

        if inventory_item.get('userId') != user_id:
            await interaction.followup.send("❌ Este código de resgate pertence a outro usuário.", ephemeral=True)
            return

        if inventory_item.get('isRedeemed', False):
            await interaction.followup.send("❌ Este código de resgate já foi utilizado.", ephemeral=True)
            return

        store_item = self.store_items.find_one({"_id": inventory_item['itemId']})
        if not store_item:
            await interaction.followup.send("❌ Erro interno: Item da loja não encontrado. Contate um administrador.", ephemeral=True)
            return
            
        item_type = store_item.get('type')
        if item_type == 'ROLE':
            role_id = store_item.get('roleId')
            if not role_id:
                await interaction.followup.send("❌ Erro de configuração: ID do cargo não definido para este item. Contate um administrador.", ephemeral=True)
                return
            
            try:
                guild = interaction.guild
                if not guild:
                    await interaction.followup.send("Este comando só pode ser usado em um servidor.", ephemeral=True)
                    return
                
                role = guild.get_role(int(role_id))
                member = await guild.fetch_member(interaction.user.id)
                
                if not role:
                    await interaction.followup.send(f"❌ Erro de configuração: O cargo com ID `{role_id}` não foi encontrado neste servidor.", ephemeral=True)
                    return
                
                await member.add_roles(role)
                
                self.inventory.update_one(
                    {"_id": inventory_item['_id']}, 
                    {"$set": {"isRedeemed": True, "redeemedAt": datetime.datetime.now(datetime.timezone.utc)}}
                )
                
                embed = discord.Embed(
                    title="✅ Item Resgatado com Sucesso!",
                    description=f"Você resgatou **{store_item['name']}** e recebeu o cargo **{role.name}**!",
                    color=0x00FF00
                )
                await interaction.followup.send(embed=embed, ephemeral=True)

            except discord.errors.Forbidden:
                await interaction.followup.send("❌ Erro de Permissão: O bot não tem permissão para gerenciar cargos. Contate um administrador.", ephemeral=True)
            except Exception as e:
                await interaction.followup.send(f"❌ Ocorreu um erro inesperado: {e}", ephemeral=True)

        else:
            await interaction.followup.send(f"⚠️ Este tipo de item ('{item_type}') não pode ser resgatado via bot. Verifique o site.", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Loja(bot))
