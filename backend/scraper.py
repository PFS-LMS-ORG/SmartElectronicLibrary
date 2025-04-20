import requests
import time
import json
from bs4 import BeautifulSoup
import random

# URLs to scrape
URL1 = "https://www.gutenberg.org/ebooks/bookshelves/search/?query=technology%20%7C%20Cookbooks%20and%20Cooking%20%7C%20Crafts%20%7C%20Engineering%20%7C%20Manufacturing%20%7C%20Woodwork"
URL2 = "https://www.gutenberg.org/ebooks/bookshelves/search/?query=Astronomy%20%7C%20Biology%20%7C%20Botany%20%7C%20Chemistry%20%7C%20Ecology%20%7C%20Geology%20%7C%20Mathematics%20%7C%20Microbiology%20%7C%20Microscopy%20%7C%20Mycology%20%7C%20Science%20Fiction%20%7C%20Natural%20History%20%7C%20Physics%20%7C%20Physiology%20%7CScientific%20American%20%7C%20Zoology"
URLS = [URL1 , URL2]

books = []

for URL in URLS:
    print(f"\n Going into the URL: {URL}")
    page = requests.get(URL)
    soup = BeautifulSoup(page.content, "html.parser")

    ul = soup.find("ul", class_="results")
    if not ul:
        continue

    links = ul.find_all(lambda tag: tag.name == "li" and tag.get("class") == ["navlink"])


    for link in links:
        bookshelf_url = "https://www.gutenberg.org" + link.find('a')["href"]
        category = link.find("span", class_="title").text.strip() if link.find("span", class_="title") else "Uncategorized"

        while bookshelf_url:
            print(f"Scraping bookshelf page: {bookshelf_url}")
            page = requests.get(bookshelf_url)
            soup = BeautifulSoup(page.content, "html.parser")

            results = soup.find_all("li", class_="booklink")
            for result in results:
                book_href = result.find("a", class_="link")["href"]
                book_url = "https://www.gutenberg.org" + book_href
                book_author = result.find("span", class_="subtitle").text.strip() if result.find("span", class_="subtitle") else "Unknown Author"

                print(f"  Scraping book: {book_url}")
                book_page = requests.get(book_url)
                book_soup = BeautifulSoup(book_page.content, "html.parser")

                title_tag = book_soup.find(id="book_title")
                book_title = title_tag.text.strip() if title_tag else "Untitled"

                summary_tag = book_soup.find("div", class_="summary-text-container")
                summary = summary_tag.text.strip() if summary_tag else None

                cover_img = None
                cover_img_container = book_soup.find(id="cover")
                if cover_img_container:
                    img_tag = cover_img_container.find("img", class_="cover-art")
                    if img_tag:
                        cover_img = img_tag["src"]
                        if cover_img.startswith("/"):
                            cover_img = "https://www.gutenberg.org" + cover_img

                # Now match your full book model structure
                book_dict = {
                    "title": book_title,
                    "cover_url": cover_img if cover_img else "https://via.placeholder.com/150",
                    "description": f"A classic work by {book_author}.",
                    "rating": round(random.uniform(3.5, 5.0), 1),
                    "summary": summary if summary else f"This book, {book_title}, is a work by {book_author}. No detailed summary is available.",
                    "borrow_count": 0,
                    "total_books": 10,
                    "available_books": 10,
                    "featured_book": False,
                    "author": book_author,
                    "category": category
                }

                books.append(book_dict)
                time.sleep(1)

            # Handle pagination
            next_link = soup.find("a", string="Next")
            if next_link:
                bookshelf_url = "https://www.gutenberg.org" + next_link["href"]
                time.sleep(1)
            else:
                bookshelf_url = None

# Save to JSON
with open("books.json", "w", encoding="utf-8") as f:
    json.dump(books, f, indent=4, ensure_ascii=False)

print(f"\n Done! Scraped {len(books)} books and saved them to books.json.")
