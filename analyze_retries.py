import os
import re

search_dir = "src"
api_keywords = ["Groq", "NVIDIA", "OpenRouter", "fetch", "axios"]
error_keywords = ["catch", "try", "retry", "fallback", "error"]

def analyze():
    print("=== API Error Handling and Retry Audit ===")
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if file.endswith((".ts", ".tsx", ".js", ".jsx")):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        
                    for i, line in enumerate(lines):
                        if any(kw.lower() in line.lower() for kw in api_keywords):
                            print(f"\n[API Usage Found] {filepath}:{i+1}")
                            print(f"  Line: {line.strip()}")
                            # Look around for error handling
                            start = max(0, i-5)
                            end = min(len(lines), i+15)
                            context = "".join(lines[start:end])
                            
                            has_error_handling = any(kw.lower() in context.lower() for kw in error_keywords)
                            if has_error_handling:
                                print("  Status: Contains error handling/retry logic nearby.")
                            else:
                                print("  Status: WARNING - No obvious error handling nearby.")
                except Exception as e:
                    pass

if __name__ == "__main__":
    if os.path.exists(search_dir):
        analyze()
    else:
        print(f"Directory {search_dir} not found.")
