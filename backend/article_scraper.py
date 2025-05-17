import requests
import json
from bs4 import BeautifulSoup
from datetime import datetime
import hashlib
import urllib.parse
import re

def slugify(text):
    # First convert to lowercase
    text = text.lower()
    # Replace all non-alphanumeric characters (except hyphens) with a space
    text = re.sub(r'[^a-z0-9\s-]', ' ', text)
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    # Trim spaces from start and end
    text = text.strip()
    # Replace spaces with hyphens
    text = text.replace(' ', '-')
    # Remove consecutive hyphens
    text = re.sub(r'-+', '-', text)
    
    return text

def generate_id(title):
    return hashlib.md5(title.encode()).hexdigest()

def get_author_initials(author_name):
    # Split the name into parts
    parts = author_name.strip().split()
    if not parts:
        return "UN"  # Fallback for unknown
    # Take first letter of first name
    initials = parts[0][0].upper()
    # If there's a last name, add its first letter
    if len(parts) > 1:
        initials += parts[-1][0].upper()
    else:
        # If only one name part, use first two letters or repeat first
        initials += parts[0][1].upper() if len(parts[0]) > 1 else initials[0]
    return initials

def get_title_initials(title):
    # Split the title into words
    words = title.strip().split()
    if not words:
        return "AR"  # Fallback for empty title
    # Take first letter of first word
    initials = words[0][0].upper()
    # If there's a second word, add its first letter
    if len(words) > 1:
        initials += words[1][0].upper()
    else:
        # If only one word, use first two letters or repeat first
        initials += words[0][1].upper() if len(words[0]) > 1 else initials[0]
    return initials

URLS = [
    "https://arxiv.org/archive/cs",
    "https://arxiv.org/archive/math"
]

all_data = []

for URL in URLS:
    page = requests.get(URL)
    soup = BeautifulSoup(page.content, "html.parser")
    links = soup.find_all('a')
    links = list(filter(lambda link: link["href"].startswith('/list/') and link["href"].endswith("new"), links))

    links.pop(0)  # remove unwanted first link

    for link in links:
        page = requests.get("https://arxiv.org" + link["href"])
        soup = BeautifulSoup(page.content, "html.parser")

        dts = soup.find_all('dt')
        for dt in dts:
            article_link = dt.find('a', string="pdf")
            if not article_link:
                continue
            article_link = "https://arxiv.org" + article_link["href"]
            dd = dt.find_next_sibling('dd')

            # Authors
            authors_tags = dd.find('div', class_="list-authors").find_all('a')
            authors_list = [a.text.strip() for a in authors_tags]
            first_author = authors_list[0] if authors_list else "Unknown"

            # Get initials for author avatar
            author_initials = get_author_initials(first_author)
            # Generate avatar URL using UI Avatars
            avatar_url = f"https://ui-avatars.com/api/?name={urllib.parse.quote(author_initials)}&size=64&background=0D8ABC&color=fff"

            # Title
            title_tag = dd.find('div', class_="list-title mathjax")
            for span in title_tag.find_all('span'):
                span.decompose()
            title = title_tag.text.strip().replace("Title:", "").strip()

            # Get initials for article cover image
            title_initials = get_title_initials(title)
            # Generate cover image URL using UI Avatars
            cover_image_url = f"https://ui-avatars.com/api/?name={urllib.parse.quote(title_initials)}&size=600&background=1E3A8A&color=fff"

            # Summary
            summary = dd.find('p', class_="mathjax").text.strip()

            # Category
            category = dd.find('div', class_="list-subjects").find('span', class_="primary-subject").text.strip()

            # Build article structure
            data = {
                "id": generate_id(title),
                "title": title,
                "slug": slugify(title),
                "coverImageUrl": cover_image_url,
                "category": category,
                "author": {
                    "name": first_author,
                    "avatarUrl": avatar_url
                },
                "summary": summary,
                "pdfUrl": article_link,
                "tags": [category],
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }

            all_data.append(data)

with open("formatted_articles.json", "w", encoding="utf-8") as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)

print(f"Successfully scraped and saved {len(all_data)} articles.")