from supabase import create_client
from app.core.config import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE)

def upsert_destination(city, description, image_url):
    data = {
        "city": city,
        "description": description,
        "images": image_url,
    }

    response = supabase.table("destinations").upsert(
        data,
        on_conflict="city"
    ).execute()

    return response

