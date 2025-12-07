from app.workers.celery_app import celery_app
from app.agent.city_agent import CityDescriptionAgent
from app.core.config import settings
from app.db.supabase_client import upsert_destination

@celery_app.task(name="tasks.generate_city", bind=True, max_retries=3)
def generate_city_task(self, city: str):
    agent = CityDescriptionAgent(
        settings.GEMINI_API_KEY,
        settings.UNSPLASH_API_KEY,
        settings.PEXELS_API_KEY,
    )

    result = agent.generate_city_info(city)

    description = result["description"]
    image_url = result["image"]["image_url"]

    upsert_destination(city, description, image_url)
    return {"status": "success", "city": city}
