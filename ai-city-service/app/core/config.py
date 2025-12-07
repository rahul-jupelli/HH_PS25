import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY")
    PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE")  # MUST use service role

settings = Settings()
