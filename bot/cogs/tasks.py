
import discord
from discord.ext import commands, tasks
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import requests
import datetime
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Translation Dictionaries (similar to translations.ts) ---
market_name_translations = {
    'Match Winner': 'Vencedor da Partida',
    'Home/Away': 'Aposta sem Empate',
    'Second Half Winner': 'Vencedor do 2º Tempo',
    'Goals Over/Under': 'Gols Acima/Abaixo',
    'Goals Over/Under First Half': 'Gols Acima/Abaixo (1º Tempo)',
    'Goals Over/Under - Second Half': 'Gols Acima/Abaixo (2º Tempo)',
    'HT/FT Double': 'Intervalo/Final de Jogo',
    'Both Teams Score': 'Ambos Marcam',
    'Handicap Result': 'Resultado com Handicap',
    'Exact Score': 'Placar Exato',
    'Correct Score - First Half': 'Placar Exato (1º Tempo)',
    'Double Chance': 'Dupla Chance',
    'First Half Winner': 'Vencedor do 1º Tempo',
    'Total - Home': 'Total de Gols da Casa',
    'Total - Away': 'Total de Gols do Visitante',
    'Double Chance - First Half': 'Dupla Chance (1º Tempo)',
    'Double Chance - Second Half': 'Dupla Chance (2º Tempo)',
    'Odd/Even': 'Ímpar/Par',
    'Corners 1x2': 'Escanteios 1x2',
    'Corners Over Under': 'Escanteios Acima/Abaixo',
    'Home Corners Over/Under': 'Escanteios da Casa Acima/Abaixo',
    'Away Corners Over/Under': 'Escanteios do Visitante Acima/Abaixo',
    'Total Corners (1st Half)': 'Total de Escanteios (1º Tempo)',
    'Cards Over/Under': 'Cartões Acima/Abaixo',
}

odds_label_translations = {
    'Home': 'Casa',
    'Draw': 'Empate',
    'Away': 'Fora',
    'Yes': 'Sim',
    'No': 'Não',
    'Odd': 'Ímpar',
    'Even': 'Par',
}

def translate_complex_label(label, market_name):
    label_as_string = str(label)
    if 'Double Chance' in market_name:
        return label_as_string.replace('Home', 'Casa').replace('Away', 'Fora').replace('Draw', 'Empate').replace('/', ' ou ')
    if market_name == 'HT/FT Double':
        return label_as_string.replace('Home', 'Casa').replace('Away', 'Fora').replace('Draw', 'Empate')
    return label_as_string.replace('Over', 'Acima').replace('Under', 'Abaixo').replace('Home', 'Casa').replace('Away', 'Fora')

def translate_market_data(market):
    translated_market_name = market_name_translations.get(market['name'], market['name'])
    
    translated_odds = []
    for odd in market.get('values', []):
        # The API uses 'value' for label and 'odd' for value
        label = odd.get('value')
        value = odd.get('odd')
        
        simple_translation = odds_label_translations.get(label)
        if simple_translation:
            translated_label = simple_translation
        else:
            translated_label = translate_complex_label(label, market['name'])
        
        translated_odds.append({'label': translated_label, 'value': value})

    return {
        'name': translated_market_name,
        'odds': translated_odds
    }

class Tasks(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.api_key = os.getenv('API_FOOTBALL_KEY')
        self.headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": "api-football-v1.p.rapidapi.com"
        }
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.matches_collection = self.db.matches
        self.update_fixtures.start()

    def cog_unload(self):
        self.update_fixtures.cancel()

    def fetch_from_api(self, url, params):
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get('response', [])
        except requests.exceptions.RequestException as e:
            logging.error(f"API request failed for {url}: {e}")
            return []

    @tasks.loop(minutes=15)
    async def update_fixtures(self):
        if not self.api_key:
            logging.warning("API_FOOTBALL_KEY not found. Skipping fixture update.")
            return

        logging.info("Starting fixture update task...")
        
        today = datetime.date.today().strftime("%Y-%m-%d")
        tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

        all_fixtures = []
        for date_str in [today, tomorrow]:
            fixtures_url = "https://api-football-v1.p.rapidapi.com/v3/fixtures"
            all_fixtures.extend(self.fetch_from_api(fixtures_url, {'date': date_str}))

        logging.info(f"Found {len(all_fixtures)} fixtures for today and tomorrow.")

        updated_count = 0
        new_count = 0

        for fixture_data in all_fixtures:
            fixture = fixture_data.get('fixture', {})
            league = fixture_data.get('league', {})
            teams = fixture_data.get('teams', {})
            goals = fixture_data.get('goals', {})

            fixture_id = fixture.get('id')
            if not fixture_id:
                continue
            
            non_processable_status = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']
            if fixture.get('status', {}).get('short') in non_processable_status:
                continue

            odds_url = "https://api-football-v1.p.rapidapi.com/v3/odds"
            odds_response = self.fetch_from_api(odds_url, {'fixture': fixture_id})
            
            if not odds_response:
                continue

            bookmaker = next((b for b in odds_response[0].get('bookmakers', []) if b['id'] == 8), None)
            if not bookmaker:
                continue
            
            markets = [translate_market_data(bet) for bet in bookmaker.get('bets', [])]
            if not markets:
                continue

            match_document = {
                'homeTeam': teams.get('home', {}).get('name'),
                'homeLogo': teams.get('home', {}).get('logo'),
                'awayTeam': teams.get('away', {}).get('name'),
                'awayLogo': teams.get('away', {}).get('logo'),
                'league': league.get('name'),
                'timestamp': fixture.get('timestamp'),
                'status': fixture.get('status', {}).get('short'),
                'goals': goals,
                'isFinished': False, # Default value for new/upcoming matches
                'markets': markets
            }
            
            result = self.matches_collection.update_one(
                {'_id': fixture_id},
                {'$set': match_document},
                upsert=True
            )

            if result.upserted_id:
                new_count += 1
            elif result.modified_count > 0:
                updated_count += 1
        
        logging.info(f"Fixture update complete. New: {new_count}, Updated: {updated_count}.")

    @update_fixtures.before_loop
    async def before_update_fixtures(self):
        await self.bot.wait_until_ready()
        logging.info("Bot is ready. Fixture update loop will start.")

async def setup(bot):
    await bot.add_cog(Tasks(bot))
