from discord.ext import commands, tasks
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

class Tasks(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.client = MongoClient(os.getenv('MONGODB_URI'))
        self.db = self.client.timaocord
        self.quiz_commands = self.db.quiz_commands
        self.check_for_quiz_commands.start()

    def cog_unload(self):
        self.check_for_quiz_commands.cancel()
        self.client.close()

    @tasks.loop(seconds=5.0)
    async def check_for_quiz_commands(self):
        # Find one command to process
        command_doc = self.quiz_commands.find_one_and_delete({})
        if command_doc:
            quiz_id = command_doc.get('quizId')
            print(f"Found quiz command for quizId: {quiz_id}")
            
            # Get the quiz cog
            quiz_cog = self.bot.get_cog('Quiz')
            if quiz_cog and quiz_id:
                try:
                    # We need a dummy interaction object for the function.
                    # It's not ideal, but it allows reusing the quiz logic.
                    # The function needs to be adapted to handle a None interaction.
                    await quiz_cog.start_quiz_flow(str(quiz_id))
                except Exception as e:
                    print(f"Error executing scheduled quiz {quiz_id}: {e}")

    @check_for_quiz_commands.before_loop
    async def before_check(self):
        await self.bot.wait_until_ready()
        print("Starting quiz command checker loop.")


async def setup(bot):
    await bot.add_cog(Tasks(bot))
