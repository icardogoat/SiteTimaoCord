
import discord
from discord.ext import commands, tasks
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import requests
import datetime
import logging
from bson.objectid import ObjectId

load_dotenv()

# --- CONFIGURAÇÃO DA ATUALIZAÇÃO ---
# Com 4 chaves (400 chamadas/dia), o intervalo mínimo seguro é 15 minutos.
# Cálculo: (60 min / 15 min) * 24h = 96 execuções/dia.
# 96 execuções * 4 chamadas/execução = 384 chamadas/dia (dentro do limite de 400).
UPDATE_INTERVAL_MINUTES = 15

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Fixed ID for API settings document
API_SETTINGS_ID = ObjectId('66a4f2b9a7c3d2e3c4f5b6a7')

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
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = client.db('timaocord')
        self.settings_db = self.client.timaocord_settings
        self.matches_collection = self.db.matches
        self.api_settings_collection = self.settings_db.api_settings
        
        # API Key Management
        self.api_keys = []
        self.key_index = 0
        self._load_api_keys()

        self.update_fixtures.start()

    def _load_api_keys(self):
        """Loads API keys from the settings DB, with a fallback to .env"""
        try:
            settings = self.api_settings_collection.find_one({"_id": API_SETTINGS_ID})
            if settings and 'updateApiKeys' in settings and len(settings['updateApiKeys']) > 0:
                self.api_keys = [k['key'] for k in settings['updateApiKeys']]
                logging.info(f"Loaded {len(self.api_keys)} API keys from the database.")
            else:
                raise ValueError("No keys found in DB")
        except Exception as e:
            logging.warning(f"Could not load API keys from database ({e}). Falling back to .env file.")
            env_key = os.getenv('API_FOOTBALL_KEY')
            if env_key:
                self.api_keys = [env_key]
                logging.info("Loaded 1 API key from .env file.")
            else:
                self.api_keys = []
                logging.error("CRITICAL: No API keys found in database or .env file. Fixture updates will fail.")

    def _get_api_key(self):
        """Rotates through the available API keys."""
        if not self.api_keys:
            raise ValueError("No API keys available to make a request.")
        
        key = self.api_keys[self.key_index]
        self.key_index = (self.key_index + 1) % len(self.api_keys)
        return key

    def cog_unload(self):
        self.update_fixtures.cancel()

    def fetch_from_api(self, url, params):
        try:
            api_key = self._get_api_key()
            headers = {
                "x-rapidapi-key": api_key,
                "x-rapidapi-host": "api-football-v1.p.rapidapi.com"
            }
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json().get('response', [])
        except requests.exceptions.RequestException as e:
            logging.error(f"API request to {url} failed: {e}")
            return []
        except ValueError as e:
            logging.error(e)
            return []

    async def process_fixtures_for_date(self, date_str: str):
        """Fetches fixtures and odds for a specific date, processes, and saves them."""
        # 1. Fetch all fixtures for the date
        fixtures_url = "https://api-football-v1.p.rapidapi.com/v3/fixtures"
        fixtures_response = self.fetch_from_api(fixtures_url, {'date': date_str})
        if not fixtures_response:
            logging.info(f"No fixtures found for {date_str}.")
            return 0, 0

        # 2. Fetch all odds for the date
        odds_url = "https://api-football-v1.p.rapidapi.com/v3/odds"
        odds_response = self.fetch_from_api(odds_url, {'date': date_str})

        # 3. Create a mapping of fixture_id to its odds
        odds_map = {}
        if odds_response:
            for odd_data in odds_response:
                fixture_id = odd_data.get('fixture', {}).get('id')
                if fixture_id:
                    # Find the Bet365 bookmaker (ID 8) as it has the most markets
                    bookmaker = next((b for b in odd_data.get('bookmakers', []) if b['id'] == 8), None)
                    if bookmaker:
                        odds_map[fixture_id] = bookmaker.get('bets', [])
        
        logging.info(f"Processing {len(fixtures_response)} fixtures and {len(odds_map)} odds sets for {date_str}.")

        updated_count = 0
        new_count = 0
        non_processable_status = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']

        for fixture_data in fixtures_response:
            fixture = fixture_data.get('fixture', {})
            fixture_id = fixture.get('id')

            if not fixture_id or fixture.get('status', {}).get('short') in non_processable_status:
                continue

            # 4. Get odds from our map
            markets_raw = odds_map.get(fixture_id)
            if not markets_raw:
                continue

            league = fixture_data.get('league', {})
            teams = fixture_data.get('teams', {})
            goals = fixture_data.get('goals', {})

            markets = [translate_market_data(bet) for bet in markets_raw]
            if not markets:
                continue

            match_document = {
                '_id': fixture_id, # Use fixture_id as the document _id
                'homeTeam': teams.get('home', {}).get('name'),
                'homeLogo': teams.get('home', {}).get('logo'),
                'awayTeam': teams.get('away', {}).get('name'),
                'awayLogo': teams.get('away', {}).get('logo'),
                'league': league.get('name'),
                'timestamp': fixture.get('timestamp'),
                'status': fixture.get('status', {}).get('short'),
                'goals': goals,
                'isFinished': False,
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
        
        return new_count, updated_count

    @tasks.loop(minutes=UPDATE_INTERVAL_MINUTES)
    async def update_fixtures(self):
        if not self.api_keys:
            logging.warning("No API keys are configured. Skipping fixture update.")
            return

        logging.info(f"Starting scheduled fixture update (interval: {UPDATE_INTERVAL_MINUTES} minutes)...")
        
        # Process today's fixtures
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        try:
            new_today, updated_today = await self.process_fixtures_for_date(today_str)
            logging.info(f"Update for today ({today_str}) complete. New: {new_today}, Updated: {updated_today}.")
        except Exception as e:
            logging.error(f"Error processing fixtures for {today_str}: {e}")

        # Process tomorrow's fixtures
        tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        try:
            new_tomorrow, updated_tomorrow = await self.process_fixtures_for_date(tomorrow_str)
            logging.info(f"Update for tomorrow ({tomorrow_str}) complete. New: {new_tomorrow}, Updated: {updated_tomorrow}.")
        except Exception as e:
            logging.error(f"Error processing fixtures for {tomorrow_str}: {e}")

    @update_fixtures.before_loop
    async def before_update_fixtures(self):
        await self.bot.wait_until_ready()
        logging.info("Bot is ready. Fixture update loop will start.")

async def setup(bot):
    await bot.add_cog(Tasks(bot))

    
