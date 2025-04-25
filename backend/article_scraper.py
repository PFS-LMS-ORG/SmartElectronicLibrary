import requests
import time
import json
from bs4 import BeautifulSoup
from datetime import datetime
import hashlib

def slugify(text):
    return text.lower().replace(" ", "-").replace("\n", "").strip()

def generate_id(title):
    return hashlib.md5(title.encode()).hexdigest()

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

            # Title
            title_tag = dd.find('div', class_="list-title mathjax")
            for span in title_tag.find_all('span'):
                span.decompose()
            title = title_tag.text.strip().replace("Title:", "").strip()

            #summary
            summary = dd.find('p',class_="mathjax").text.strip()

            # Category
            category = dd.find('div', class_="list-subjects").find('span', class_="primary-subject").text.strip()

            # Build article structure
            data = {
                "id": generate_id(title),
                "title": title,
                "slug": slugify(title),
                "coverImageUrl": "https://placehold.co/600x300",  # placeholder
                "category": category,
                "author": {
                    "name": first_author,
                    "avatarUrl": "https://placehold.co/64"  # placeholder
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
