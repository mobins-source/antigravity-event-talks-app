import os
import time
import hashlib
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache configuration
CACHE_DURATION = 600  # 10 minutes cache
_cache = {
    "data": None,
    "last_fetched": 0
}

def clean_html_content(html_str):
    """
    Cleans up feed HTML content to ensure absolute URLs for links
    and nicer formatting.
    """
    if not html_str:
        return ""
    soup = BeautifulSoup(html_str, 'html.parser')
    
    # Make all links target="_blank" and verify absolute URLs
    for a in soup.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
        # Add class for styling
        a['class'] = a.get('class', []) + ['feed-link']
        # Convert relative docs links if any
        href = a.get('href', '')
        if href.startswith('/'):
            a['href'] = f"https://docs.cloud.google.com{href}"
            
    # Add styling class to code snippets
    for code in soup.find_all('code'):
        code['class'] = code.get('class', []) + ['code-snippet']

    return str(soup)

def parse_feed():
    """
    Fetches the RSS feed and parses it into structured updates.
    Splits multi-update entries (grouped by date in the feed) into individual items.
    """
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        feed = feedparser.parse(response.text)
        
        all_updates = []
        
        for entry_idx, entry in enumerate(feed.entries):
            date_str = entry.title
            raw_content = ""
            if hasattr(entry, 'content') and entry.content:
                raw_content = entry.content[0].value
            elif hasattr(entry, 'summary'):
                raw_content = entry.summary
                
            link = entry.link or "https://docs.cloud.google.com/bigquery/docs/release-notes"
            
            # Sort date determination
            sort_date = date_str
            if hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                sort_date = time.strftime('%Y-%m-%d', entry.updated_parsed)
            elif hasattr(entry, 'updated') and entry.updated:
                try:
                    # Simple parse
                    sort_date = entry.updated.split('T')[0]
                except Exception:
                    pass

            soup = BeautifulSoup(raw_content, 'html.parser')
            
            # Find all <h3> headings which indicate the type of updates (e.g. Feature, Change, Deprecated)
            headings = soup.find_all('h3')
            
            if not headings:
                # No subheadings, package the entire content as a general Update
                cleaned_html = clean_html_content(raw_content)
                text_content = soup.get_text().strip()
                unique_content = f"{date_str}_General_{text_content}"
                update_id = hashlib.md5(unique_content.encode('utf-8')).hexdigest()
                
                all_updates.append({
                    "id": update_id,
                    "date": date_str,
                    "sort_date": sort_date,
                    "type": "General",
                    "content": cleaned_html,
                    "text": text_content,
                    "link": link,
                    "original_title": date_str
                })
                continue
                
            # Process sections between <h3> elements
            for i, heading in enumerate(headings):
                update_type = heading.get_text().strip()
                
                # Gather sibling elements until next <h3>
                sibling_elements = []
                next_node = heading.next_sibling
                while next_node and next_node.name != 'h3':
                    # Save HTML elements or text nodes
                    sibling_elements.append(next_node)
                    next_node = next_node.next_sibling
                
                # Convert gathered elements back to HTML
                section_soup = BeautifulSoup('', 'html.parser')
                for node in sibling_elements:
                    section_soup.append(node)
                
                cleaned_html = clean_html_content(str(section_soup))
                text_content = section_soup.get_text().strip()
                
                # If there's no text content (just empty tags), skip it
                if not text_content:
                    continue
                
                # Create a unique ID based on content
                unique_content = f"{date_str}_{update_type}_{text_content[:200]}"
                update_id = hashlib.md5(unique_content.encode('utf-8')).hexdigest()
                
                # Append to list
                all_updates.append({
                    "id": update_id,
                    "date": date_str,
                    "sort_date": sort_date,
                    "type": update_type,
                    "content": cleaned_html,
                    "text": text_content,
                    "link": f"{link}#{date_str.replace(' ', '_').replace(',', '')}" if link else "",
                    "original_title": date_str
                })
                
        # Sort updates by date descending (secondary sort by type or order)
        all_updates.sort(key=lambda x: (x['sort_date'], x['id']), reverse=True)
        return all_updates, None
        
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Return from cache if valid and not forced to refresh
    if not force_refresh and _cache["data"] is not None and (current_time - _cache["last_fetched"]) < CACHE_DURATION:
        return jsonify({
            "status": "success",
            "source": "cache",
            "cached_at": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(_cache["last_fetched"])),
            "data": _cache["data"]
        })
        
    # Fetch and parse
    updates, error = parse_feed()
    if error:
        # If fetch fails but we have cached data, return cache as fallback with a warning
        if _cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "source": "cache_fallback",
                "message": f"Failed to refresh feed: {error}. Serving cached data.",
                "cached_at": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(_cache["last_fetched"])),
                "data": _cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {error}"
        }), 500
        
    # Update cache
    _cache["data"] = updates
    _cache["last_fetched"] = current_time
    
    return jsonify({
        "status": "success",
        "source": "network",
        "fetched_at": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time)),
        "data": updates
    })

if __name__ == '__main__':
    # Default port for development
    app.run(debug=True, host='127.0.0.1', port=5001)
