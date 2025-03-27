import google.generativeai as genai
from difflib import get_close_matches

# 1️⃣ Set Up Google AI API Key
genai.configure(api_key="AIzaSyDXPl2SDEutTgAB4A2Wfwf_DlIzdFRLHv8")

# 2️⃣ Sample Hate Speech Data (Instead of JSON)
sample_data = [
    {"text": "XYZ group should not exist.", "label": "Hate Speech"},
    {"text": "All people deserve equal rights.", "label": "Hate Speech"},
    {"text": "People from ABC group are not human.", "label": "Hate Speech"},
    {"text": "The government should protect minorities.", "label": "Hate Speech"},
    {"text": "Some communities are a threat to society.", "label": "Moderate"}
]

# 3️⃣ Function to Retrieve Similar Texts
def retrieve_similar_texts(query, data, n=3):
    """Finds most similar texts to the query using simple text matching."""
    texts = [entry["text"] for entry in data]
    return get_close_matches(query, texts, n=n, cutoff=0.5)

# 4️⃣ Classification Function Using Google AI API
def classify_text_with_api(text):
    """Uses Google AI API (Gemma) to classify text with context from similar data."""
    
    # Retrieve Similar Texts
    retrieved_texts = retrieve_similar_texts(text, sample_data)
    context = " ".join(retrieved_texts) if retrieved_texts else "No relevant examples found."

    # Create Prompt
    prompt = f"""
    Context: {context}
    User Input: {text}

    Task: Based on the context and user input, classify the text as:
    - "Safe"
    - "Moderate"
    - "Hate Speech"

    Output only the classification.
    """

    # Send to Google AI API
    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    
    return {
        "classification": response.text.strip(),
        "retrieved_examples": retrieved_texts
    }

# 5️⃣ **Testing with Sample Data**
if __name__ == "__main__":
    test_text = "XYZ group is should not exist."
    result = classify_text_with_api(test_text)
    
    print("\n🔍 **Classification Result**:")
    print(result)
