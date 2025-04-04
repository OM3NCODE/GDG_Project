import os
import pandas as pd
import google.generativeai as genai
import chromadb
import logging
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv('GOOGLE_API_KEY')

if not API_KEY:
    raise ValueError("❌ GOOGLE_API_KEY not found in environment variables!")

genai.configure(api_key=API_KEY)

chroma_client = chromadb.PersistentClient(path="./chroma_db")
HatespeechDB = chroma_client.get_or_create_collection(
    name="hate_speech_db",
    metadata={"hnsw:space": "cosine"}
)

csv_file = "Dataset/hate_speech_text_updated.csv"  # Adjust path as needed

if not os.path.exists(csv_file):
    raise FileNotFoundError(f"❌ CSV file not found at: {csv_file}")

df = pd.read_csv(csv_file)
df.dropna(subset=["Text"], inplace=True)
print(f"✅ Loaded {len(df)} records from CSV!")

embedding_model = "models/text-embedding-004"
logging.getLogger("chromadb").setLevel(logging.ERROR)

if HatespeechDB.count() == 0:
    print("⚡ Generating and storing embeddings for the first time...")

    for index, row in df.iterrows():
        embedding_response = genai.embed_content(
            model=embedding_model, 
            content=row["Text"]
        )
        embedding = embedding_response["embedding"]

        if len(embedding) != 768:
            raise ValueError(f"❌ Expected embedding dimension 768, but got {len(embedding)}")

        HatespeechDB.add(
            ids=[str(index)],
            documents=[row["Text"]],
            embeddings=[embedding],  # Ensure it's a list
            metadatas=[{"label": row["Label"], "category": row["Category"]}]
        )

    print("✅ Embeddings stored in ChromaDB!")
else:
    print("✅ Embeddings already exist in ChromaDB, skipping computation.")

def classify_text(input_text, content_type="unknown"):
    """
    Retrieve relevant texts from ChromaDB and classify input using Gemini.
    
    Args:
        input_text: The text to classify
        content_type: Type of content ("main_content" or "comment")
    """

    embedding_response = genai.embed_content(model=embedding_model, content=input_text)
    input_embedding = embedding_response["embedding"]
    
    if len(input_embedding) != 768:
        raise ValueError(f"❌ Expected query embedding dimension 768, but got {len(input_embedding)}")
    
    results = HatespeechDB.query(
        query_embeddings=[input_embedding],
        n_results=4  # Increased from 2 to 4
    )
    
    retrieved_texts = results["documents"][0] if results["documents"] else []
    retrieved_metadata = results["metadatas"][0] if results["metadatas"] else []
    
    examples_with_labels = []
    for i, text in enumerate(retrieved_texts):
        if i < len(retrieved_metadata) and "label" in retrieved_metadata[i]:
            label = retrieved_metadata[i]["label"]
            examples_with_labels.append(f"Example {i+1}: \"{text}\" - {label}")
    
    examples_string = "\n".join(examples_with_labels)
    
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
    
    result = response.text.strip()
    
    if len(result.split()) > 3:
        for label in ["Hate Speech", "Moderate", "Safe"]:
            if label in result:
                result = label
                break
    
    return result


'''
#Use the below code to test if the model api is working properly 
# 🎯 **Test the Classification**
if __name__ == "__main__":
    test_text = "Minority Sucks dick they should not exsist"
    classification = classify_text(test_text)
    print(f"📝 Classification Result: {classification}")

# API part here mostly '''
