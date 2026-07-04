# BigQuery Release Notes Hub & Tweet Composer 🚀

A modern, high-performance web application designed to track Google Cloud BigQuery release updates and make it effortless to draft and share updates to X/Twitter.

Built with a sleek, glassmorphic dark theme, the app delivers real-time search, category filtering, caching, and a smart tweet drafting suite.

---

## ✨ Features

-   **Granular Update Parsing**: Automatically separates daily grouped release notes from Google's Atom feed into individual, category-coded cards (e.g. separates *Features* from *Changes* published on the same day).
-   **In-Memory Caching**: Caches parsed results for 10 minutes to minimize network latency and API calls, with a robust fallback system if Google's feed is down.
-   **Real-Time Search & Filtering**: Instantly search updates by keywords or filter by categories (*Features*, *Changes*, *Deprecated*, and *General*).
-   **Interactive X/Twitter Composer**:
    -   **4 Pre-designed templates**: Select between *Standard*, *Hype*, *Corporate*, and *Minimal* post formats.
    -   **Auto-Shorten Tool**: A smart text-budgeting algorithm that crops the summary description cleanly at word boundaries to fit the exact 280-character limit, accounting for links and hashtags.
    -   **Hashtag Helper Chips**: Fast injection of common tech tags (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`).
    -   **Live Character Counter**: Dynamic colors that warn you as you approach the character limit.
    -   **Click to Post**: Instantly open a pre-filled tweet window on X using Twitter Web Intents, or copy to your clipboard.
-   **Responsive Layout**: Fully optimized for mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack

-   **Backend**: Python, Flask, `BeautifulSoup4` (HTML parsing), `feedparser` (Atom/RSS extraction), `requests`.
-   **Frontend**: Plain HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom properties, grid, flexbox).
-   **Icons & Assets**: Responsive inline SVG paths (no heavy dependencies).

---

## 📁 Directory Structure

```
├── app.py                 # Flask server, caching logic & feed parsing
├── requirements.txt       # Python package dependencies
├── README.md              # Project documentation
├── .gitignore             # Git exclusion rules
├── templates/
│   └── index.html         # Main app page layout
└── static/
    ├── css/
    │   └── style.css      # Glassmorphic dark styling & responsive grid
    └── js/
        └── main.js        # API caller, filters, and Tweet Composer controller
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Python 3.8+** installed on your machine.

### Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/mobins-source/antigravity-event-talks-app.git
    cd antigravity-event-talks-app
    ```

2.  **Initialize the virtual environment**:
    ```bash
    python3 -m venv .venv
    ```

3.  **Activate the virtual environment**:
    *   **macOS / Linux**:
        ```bash
        source .venv/bin/activate
        ```
    *   **Windows**:
        ```cmd
        .venv\Scripts\activate
        ```

4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the Flask application**:
    ```bash
    python app.py
    ```

6.  **Access the application**:
    Open your browser and navigate to **[http://127.0.0.1:5001](http://127.0.0.1:5001)**.

---

## 💡 How It Works (Sample Data Flow)

1.  **Request**: The browser calls the `/api/notes` endpoint (via initial load or clicking the **Refresh** button).
2.  **Bypass/Cache**: If cache is valid, the server returns cached JSON. Otherwise, it downloads the XML feed from Google.
3.  **Parse & Restructure**: The backend breaks down feed updates by `<h3>` tags and cleans HTML strings (forcing relative links to absolute docs links).
4.  **Compose**: Selecting a card loads its text and URL into the composer. Changing style templates or clicking **Auto-Shorten** dynamically modifies the textarea content.
5.  **Publish**: Clicking **Post on X** triggers a window intent redirecting you to Twitter with your prefilled draft ready to post.

---

## 📄 License

This project is licensed under the Apache 2.0 License. See the [requirements.txt](file:///Users/mobin/agy-cli-projects/bq-releases-notes/requirements.txt) and files for details.
