import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url: str = os.environ.get("SUPABASE_URL", "")
_key: str = os.environ.get("SUPABASE_KEY", "")

# Will be None if env vars not set — app still works without DB
supabase: Client | None = None

if _url and _key and _url != "https://oxjbbrlmyxgnrrmkrslj.supabase.co":
    try:
        supabase = create_client(_url, _key)
        print("✅ Supabase connected")
    except Exception as e:
        print(f"⚠️  Supabase connection failed: {e}")
else:
    print("ℹ️  Supabase not configured — running in memory-only mode")