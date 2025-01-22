from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

connection_string = os.getenv('MONGO_URI')
if not connection_string:
    raise ValueError("MONGO_URI not found in environment variables")

client = MongoClient(connection_string)

db = client['userinfo']
collection = db['articles']

article = {
    "article_id": 1012027,
    "title": "Understanding Dyslexia",
    "content": "Dyslexia is a common learning difference that primarily affects reading, writing, and spelling abilities. It is a neurological condition that impacts how the brain processes language, making it difficult for individuals to recognize written words and decode letters. Dyslexia is not related to intelligence; many individuals with dyslexia have exceptional problem-solving skills and creativity.\n\nSome famous people who have been diagnosed with or are believed to have dyslexia include Albert Einstein, a theoretical physicist whose ideas revolutionized science; Richard Branson, the billionaire entrepreneur and founder of Virgin Group; and Whoopi Goldberg, an award-winning actress and television personality who has openly discussed her experiences with dyslexia.\n\nFun facts about dyslexia:\n- Dyslexia affects approximately 1 in 10 people worldwide.\n- Many individuals with dyslexia excel in fields that require creative and out-of-the-box thinking, such as art, entrepreneurship, and engineering.\n- Dyslexia is often identified in early childhood but can go undiagnosed until adulthood.\n- October is recognized as Dyslexia Awareness Month.\n- With the right support and accommodations, individuals with dyslexia can develop effective strategies to succeed in school and work.\n\nUnderstanding and embracing dyslexia helps foster an inclusive environment where individuals can leverage their unique strengths and abilities.",
    "excerpt": "An introduction to Dyslexia, highlighting famous individuals with dyslexia and fun facts about the condition.",
    "tags": ["Dyslexia", "Neurodiversity", "Awareness", "Education"],
    "published_date": "2025-01-22",
    "author": "John Smith "
}



try:
    collection.insert_one(article)
    print("Article inserted successfully")
except Exception as e:
    print(f"Error inserting article: {e}")
finally:
    client.close()