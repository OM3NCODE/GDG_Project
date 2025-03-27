import os
import pandas as pd
import google.generativeai as genai
import chromadb
import logging
from dotenv import load_dotenv

# ✅ **Load API Key from Environment Variable**
load_dotenv()
API_KEY = os.getenv('GOOGLE_API_KEY')

if not API_KEY:
    raise ValueError("❌ GOOGLE_API_KEY not found in environment variables!")

genai.configure(api_key=API_KEY)

# ✅ **Initialize ChromaDB**
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="hate_speech_db",
    metadata={"hnsw:space": "cosine"}
)

# ✅ **Load CSV Data**
csv_file = "Dataset/hate_speech_text_updated.csv"  # Adjust path as needed

if not os.path.exists(csv_file):
    raise FileNotFoundError(f"❌ CSV file not found at: {csv_file}")

df = pd.read_csv(csv_file)
df.dropna(subset=["Text"], inplace=True)
print(f"✅ Loaded {len(df)} records from CSV!")

# ✅ **Configure Embeddings**
embedding_model = "models/text-embedding-004"
logging.getLogger("chromadb").setLevel(logging.ERROR)

# ✅ **Generate & Store Embeddings in ChromaDB**
if collection.count() == 0:
    print("⚡ Generating and storing embeddings for the first time...")

    for index, row in df.iterrows():
        embedding_response = genai.embed_content(
            model=embedding_model, 
            content=row["Text"]
        )
        embedding = embedding_response["embedding"]

        if len(embedding) != 768:
            raise ValueError(f"❌ Expected embedding dimension 768, but got {len(embedding)}")

        collection.add(
            ids=[str(index)],
            documents=[row["Text"]],
            embeddings=[embedding],  # Ensure it's a list
            metadatas=[{"label": row["Label"], "category": row["Category"]}]
        )

    print("✅ Embeddings stored in ChromaDB!")
else:
    print("✅ Embeddings already exist in ChromaDB, skipping computation.")

# 🚀 **RAG Function: Retrieve & Classify Text**
def classify_text(input_text):
    """Retrieve relevant texts from ChromaDB and classify input using Gemini."""
    
    # ✅ **Generate Embedding for Query**
    embedding_response = genai.embed_content(model=embedding_model, content=input_text)
    input_embedding = embedding_response["embedding"]

    if len(input_embedding) != 768:
        raise ValueError(f"❌ Expected query embedding dimension 768, but got {len(input_embedding)}")

    print(f"🔍 Query Embedding Dimension: {len(input_embedding)}")

    # ✅ **Retrieve Similar Texts from ChromaDB**
    results = collection.query(
        query_embeddings=[input_embedding],  # Use query_embeddings, not query_texts
        n_results=2
    )

    retrieved_texts = results["documents"][0] if results["documents"] else []
    print(f"🔍 Retrieved Texts: {retrieved_texts}")

    # ✅ **Prompt for Classification**
    prompt = f"""
    Given the retrieved examples: {retrieved_texts}
    Classify the following text as 'Hate Speech', 'Moderate', or 'Safe':  
    "{input_text}"
    Respond with only one label.
    """

    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    
    return response.text.strip()


#Use the below code to test if the model api is working properly 
'''# 🎯 **Test the Classification**
if __name__ == "__main__":
    test_text = "Life is good together"
    classification = classify_text(test_text)
    print(f"📝 Classification Result: {classification}")'''

# API part here mostly 
