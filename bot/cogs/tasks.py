

from discord.ext import commands, tasks
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import datetime
from zoneinfo import ZoneInfo
import random
from bson import ObjectId

load_dotenv()

BOT_CONFIG_ID = ObjectId('669fdb5a907548817b848c48')

class Tasks(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.quizzes_collection = self.db.quizzes
        self.player_games_collection = self.db.player_guessing_games
        
        self.bot_db = self.client.timaocord_bot
        self.bot_config_collection = self.bot_db.config

        self.check_for_scheduled_quizzes.start()
        self.check_for_scheduled_player_games.start()
        self.check_for_scheduled_forca_games.start()

    def cog_unload(self):
        self.check_for_scheduled_quizzes.cancel()
        self.check_for_scheduled_player_games.cancel()
        self.check_for_scheduled_forca_games.cancel()
        self.client.close()

    @tasks.loop(minutes=1.0)
    async def check_for_scheduled_quizzes(self):
        try:
            sao_paulo_tz = ZoneInfo('America/Sao_Paulo')
            now_sp = datetime.datetime.now(sao_paulo_tz)
            
            current_time_str = now_sp.strftime('%H:%M')
            current_day_str = now_sp.strftime('%Y-%m-%d')

            quizzes_to_run = self.quizzes_collection.find({
                "schedule": current_time_str
            })

            quiz_cog = self.bot.get_cog('Quiz')
            if not quiz_cog:
                print("Quiz cog not found, cannot run scheduled quizzes.")
                return

            for quiz in quizzes_to_run:
                last_triggers = quiz.get('lastScheduledTriggers', {})
                last_trigger_day = last_triggers.get(current_time_str)

                if last_trigger_day == current_day_str:
                    continue

                print(f"Triggering scheduled quiz: {quiz['name']} ({quiz['_id']})")
                
                try:
                    await quiz_cog.start_quiz_flow(str(quiz['_id']))
                    
                    self.quizzes_collection.update_one(
                        {"_id": quiz['_id']},
                        {"$set": {f"lastScheduledTriggers.{current_time_str}": current_day_str}}
                    )
                except Exception as e:
                    print(f"Error executing scheduled quiz {quiz['_id']}: {e}")

        except Exception as e:
            print(f"An error occurred in the quiz scheduler task: {e}")

    @check_for_scheduled_quizzes.before_loop
    async def before_check(self):
        await self.bot.wait_until_ready()
        print("Starting scheduled quiz checker loop.")

    @tasks.loop(minutes=1.0)
    async def check_for_scheduled_forca_games(self):
        try:
            bot_config = self.bot_config_collection.find_one({"_id": BOT_CONFIG_ID})
            if not bot_config or not bot_config.get("forcaChannelId"):
                return

            forca_channel_id = int(bot_config.get("forcaChannelId"))

            forca_cog = self.bot.get_cog('Forca')
            if not forca_cog:
                return

            if forca_channel_id in forca_cog.active_games:
                return

            schedule = bot_config.get("forcaSchedule", [])
            if not schedule:
                return
            
            sao_paulo_tz = ZoneInfo('America/Sao_Paulo')
            now_sp = datetime.datetime.now(sao_paulo_tz)
            current_time_str = now_sp.strftime('%H:%M')
            current_day_str = now_sp.strftime('%Y-%m-%d')
            
            last_triggers = bot_config.get('forcaLastScheduledTriggers', {})

            for scheduled_time in schedule:
                if scheduled_time == current_time_str:
                    if last_triggers.get(scheduled_time) != current_day_str:
                        print(f"Triggering scheduled Forca game at {scheduled_time}")
                        await forca_cog.run_scheduled_game()
                        
                        self.bot_config_collection.update_one(
                            {"_id": bot_config['_id']},
                            {"$set": {f"forcaLastScheduledTriggers.{scheduled_time}": current_day_str}}
                        )
                        break
        except Exception as e:
            print(f"An error occurred in the forca game scheduler task: {e}")

    @check_for_scheduled_forca_games.before_loop
    async def before_forca_game_check(self):
        await self.bot.wait_until_ready()
        print("Starting scheduled forca game checker loop.")

    @tasks.loop(minutes=1.0)
    async def check_for_scheduled_player_games(self):
        try:
            if self.player_games_collection.count_documents({"status": "active"}) > 0:
                return 

            bot_config = self.bot_config_collection.find_one({"_id": BOT_CONFIG_ID})
            if not bot_config:
                return

            schedule = bot_config.get("playerGameSchedule", [])
            if not schedule:
                return

            sao_paulo_tz = ZoneInfo('America/Sao_Paulo')
            now_sp = datetime.datetime.now(sao_paulo_tz)
            current_time_str = now_sp.strftime('%H:%M')
            current_day_str = now_sp.strftime('%Y-%m-%d')
            
            last_triggers = bot_config.get('playerGameLastScheduledTriggers', {})

            for scheduled_time in schedule:
                if scheduled_time == current_time_str:
                    if last_triggers.get(scheduled_time) != current_day_str:
                        # Time to trigger! Find a random game to start.
                        pipeline = [{"$sample": {"size": 1}}]
                        candidate_games = list(self.player_games_collection.aggregate(pipeline))
                        
                        if not candidate_games:
                            print(f"Scheduled player game at {scheduled_time} found no games to run.")
                            continue
                        
                        game_to_start = candidate_games[0]
                        
                        print(f"Triggering scheduled player game: {game_to_start['playerName']} ({game_to_start['_id']})")
                        
                        # Activate game and clear previous winner data for reusability
                        self.player_games_collection.update_one(
                            {"_id": game_to_start['_id']},
                            {
                                "$set": {"status": "active"},
                                "$unset": {
                                    "winnerId": "",
                                    "winnerName": "",
                                    "winnerAvatar": "",
                                }
                            }
                        )
                        
                        # Update global schedule trigger
                        self.bot_config_collection.update_one(
                            {"_id": bot_config['_id']},
                            {"$set": {f"playerGameLastScheduledTriggers.{scheduled_time}": current_day_str}}
                        )
                        break

        except Exception as e:
            print(f"An error occurred in the player game scheduler task: {e}")

    @check_for_scheduled_player_games.before_loop
    async def before_player_game_check(self):
        await self.bot.wait_until_ready()
        print("Starting scheduled player game checker loop.")


async def setup(bot):
    await bot.add_cog(Tasks(bot))
