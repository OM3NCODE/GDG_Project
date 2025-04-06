import os
import pandas as pd
import google.generativeai as genai
import chromadb
import logging
from dotenv import load_dotenv

# ✅ Load API Key from Environment Variable
load_dotenv()
API_KEY = os.getenv('GOOGLE_API_KEY')

if not API_KEY:
    raise ValueError("❌ GOOGLE_API_KEY not found in environment variables!")

genai.configure(api_key=API_KEY)

# ✅ Initialize ChromaDB Clients
chroma_client1 = chromadb.PersistentClient(path="./chroma_db")
chroma_client2 = chromadb.PersistentClient(path="./chroma_db2")

HatespeechDB = chroma_client1.get_or_create_collection(
    name="hate_speech_db",
    metadata={"hnsw:space": "cosine"}
)

Hinglish_hatespeechDB = chroma_client2.get_or_create_collection(
    name="Hinglish_Hate_Speech_db",
    metadata={"hnsw:space": "cosine"}
)

# ✅ Load CSV Data
csv_files = {
    "hate_speech_db": "Dataset/hate_speech_text_updated.csv",
    "Hinglish_Hate_Speech_db": "Dataset/Hinglish_Hate_Speech_Labeled.csv"
}

def load_data_and_store_embeddings(db, csv_file):
    if not os.path.exists(csv_file):
        raise FileNotFoundError(f"❌ CSV file not found at: {csv_file}")
    
    df = pd.read_csv(csv_file)
    df.dropna(subset=["Text"], inplace=True)
    print(f"✅ Loaded {len(df)} records from {csv_file}!")
    
    embedding_model = "models/text-embedding-004"
    logging.getLogger("chromadb").setLevel(logging.ERROR)
    
    if db.count() == 0:
        print("⚡ Generating and storing embeddings for the first time...")
        
        for index, row in df.iterrows():
            embedding_response = genai.embed_content(
                model=embedding_model, 
                content=row["Text"]
            )
            embedding = embedding_response["embedding"]

            if len(embedding) != 768:
                raise ValueError(f"❌ Expected embedding dimension 768, but got {len(embedding)}")
            
            db.add(
                ids=[str(index)],
                documents=[row["Text"]],
                embeddings=[embedding],
                metadatas=[{"label": row.get("Label", row.get("LABEL")), "category": row.get("Category", "Unknown")}]
            )
        print("✅ Embeddings stored in ChromaDB!")
    else:
        print("✅ Embeddings already exist in ChromaDB, skipping computation.")

# Load both datasets
load_data_and_store_embeddings(HatespeechDB, csv_files["hate_speech_db"])
load_data_and_store_embeddings(Hinglish_hatespeechDB, csv_files["Hinglish_Hate_Speech_db"])

# 🚀 RAG Function: Retrieve & Classify Text
def classify_text(input_text):
    """Retrieve relevant texts from both ChromaDB collections and classify input using Gemini."""
    
    # ✅ Generate Embedding for Query
    embedding_response = genai.embed_content(model="models/text-embedding-004", content=input_text)
    input_embedding = embedding_response["embedding"]
    
    
    if len(input_embedding) != 768:
        raise ValueError(f"❌ Expected query embedding dimension 768, but got {len(input_embedding)}")
    
    print(f"🔍 Query Embedding Dimension: {len(input_embedding)}")
    
    # ✅ Retrieve Similar Texts from Both ChromaDBs
    results1 = HatespeechDB.query(query_embeddings=[input_embedding], n_results=2)
    results2 = Hinglish_hatespeechDB.query(query_embeddings=[input_embedding], n_results=2)
    
    retrieved_texts = (results1["documents"][0] if results1["documents"] else []) + \
                      (results2["documents"][0] if results2["documents"] else [])
    
    print(f"🔍 Retrieved Texts: {retrieved_texts}")
    print(f"Input Text: {input_text}")
    
    # ✅ Prompt for Classification
    prompt = f"""
    As an AI content moderator, classify the following {content_type} as 'Hate Speech', 'Moderate', or 'Safe'.
    
    Guidelines:
    - 'Hate Speech': Content that attacks, threatens, or demeans a person or group based on identity
    - 'Moderate': Content that is potentially offensive but doesn't rise to hate speech
    - 'Safe': Content that is neutral or positive
    
    For short comments, pay careful attention to slurs, threats, or derogatory language even in brief text.
    
    Retrieved similar examples with their classifications:
    {examples_string}
    
    Text to classify ({content_type}):
    "{input_text}"
    
    Respond with exactly one label: 'Hate Speech', 'Moderate', or 'Safe'
    """
    
    
    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    
    return response.text.strip()

'''
# 🎯 Test the Classification
if __name__ == "__main__":
    test_text = "Log Chuitye Hai"
    classification = classify_text(test_text)
    print(f"📝 Classification Result: {classification}") '''
