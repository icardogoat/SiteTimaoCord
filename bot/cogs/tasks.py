
from discord.ext import commands, tasks
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import datetime
from zoneinfo import ZoneInfo

load_dotenv()

class Tasks(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.quizzes_collection = self.db.quizzes
        self.check_for_scheduled_quizzes.start()

    def cog_unload(self):
        self.check_for_scheduled_quizzes.cancel()
        self.client.close()

    @tasks.loop(minutes=1.0)
    async def check_for_scheduled_quizzes(self):
        try:
            # Get the current time in São Paulo timezone for accuracy
            sao_paulo_tz = ZoneInfo('America/Sao_Paulo')
            now_sp = datetime.datetime.now(sao_paulo_tz)
            
            current_time_str = now_sp.strftime('%H:%M')
            current_day_str = now_sp.strftime('%Y-%m-%d')

            # Find quizzes scheduled for the current time
            quizzes_to_run = self.quizzes_collection.find({
                "schedule": current_time_str
            })

            quiz_cog = self.bot.get_cog('Quiz')
            if not quiz_cog:
                print("Quiz cog not found, cannot run scheduled quizzes.")
                return

            for quiz in quizzes_to_run:
                # Check if this schedule has already been triggered today to prevent duplicates
                last_triggers = quiz.get('lastScheduledTriggers', {})
                last_trigger_day = last_triggers.get(current_time_str)

                if last_trigger_day == current_day_str:
                    continue

                print(f"Triggering scheduled quiz: {quiz['name']} ({quiz['_id']})")
                
                try:
                    # Start the quiz flow directly
                    await quiz_cog.start_quiz_flow(str(quiz['_id']))
                    
                    # Mark as triggered for today to prevent duplicates
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


async def setup(bot):
    await bot.add_cog(Tasks(bot))
