async function classifyText(text) {
    try {
        const response = await fetch("http://127.0.0.1:8000/classify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error("Error contacting API:", error);
        return "safe";
    }
}

async function scanPosts() {
    const posts = document.querySelectorAll("p, span, div");  // Adjust for specific social media platforms

    for (let post of posts) {
        let text = post.innerText.trim();
        if (text.length > 5) {  // Avoid empty or very short text
            let result = await classifyText(text);
            
            if (result === "flagged") {
                post.style.filter = "blur(5px)";
                post.style.position = "relative";

                let warning = document.createElement("div");
                warning.innerText = "⚠️ Hate Speech Detected. Hover to reveal.";
                warning.style.position = "absolute";
                warning.style.backgroundColor = "rgba(255, 0, 0, 0.7)";
                warning.style.color = "white";
                warning.style.padding = "5px";
                warning.style.borderRadius = "5px";
                warning.style.top = "0";
                warning.style.left = "0";
                post.parentNode.insertBefore(warning, post);

                post.addEventListener("mouseenter", () => {
                    post.style.filter = "none";
                });

                post.addEventListener("mouseleave", () => {
                    post.style.filter = "blur(5px)";
                });
            }
        }
    }
}

scanPosts();