import chromadb

# Load the second database
client2 = chromadb.PersistentClient(path="./chroma_db2")
collection2 = client2.get_or_create_collection(name="collection2")

print("✅ Connected to Second Database!")

def query_second_db(query_text):
    results = collection2.query(query_text)
    return results

# Example usage
query = "example query"
res = query_second_db(query)
print("Results from DB2:", res)