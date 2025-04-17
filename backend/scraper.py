import requests
from bs4 import BeautifulSoup
from app.model.Book import Book
import json

URL = "https://www.gutenberg.org/ebooks/bookshelf/"
print(f"going into the url : {URL}")
page = requests.get(URL)
soup = BeautifulSoup(page.content, "html.parser")

books=[]

categories = soup.find("div",class_="bookshelves").find_all("ul")
for category in categories:
    a = category.find("a")
    URL = "https://www.gutenberg.org" + a["href"]
    category_name = a.text.strip() if a else None
    print(f"Category: {category_name} - {URL}")


    #for each category, we will get the books in that category from the first navlink
    print(f"going into the url : {URL}")
    page = requests.get(URL)
    soup = BeautifulSoup(page.content, "html.parser")
    ul = soup.find("ul", class_="results")

    result = next(
        (li for li in ul.find_all("li") if li.get("class", []) == ["navlink"]),
        None
    )

    cat = result.find("span", class_="title").text.strip() if result.find("span", class_="title") else None
   
    URL = "https://www.gutenberg.org" + result.find("a")["href"]

    #now we enter each link to get the link of the book , enter the book and get informations
    print(f"going into the url : {URL}")
    page = requests.get(URL)
    soup = BeautifulSoup(page.content, "html.parser")
    results = soup.find_all("li", class_="booklink")

    for result in results:
        book_url = "https://www.gutenberg.org" + result.find("a")["href"]

        book_author = result.find("span", class_="subtitle").text.strip() if result.find("span", class_="subtitle") else None

        page = requests.get(book_url)
        soup = BeautifulSoup(page.content, "html.parser")

        cover_img_container = soup.find(id="cover") 
        cover_img = cover_img_container.find("img",class_="cover-art")["src"] if cover_img_container else None
        book_title = soup.find(id="book_title").text.strip() if soup.find(id="book_title") else None

        summary = soup.find("div", class_="summary-text-container").text.strip() if soup.find("div", class_="summary-text-container") else None
        # book = Book(book_title)
        # book.cover_img = cover_img
        # book.author = book_author
        # book.summary = summary
        # book.category = cat

        # book_title = result.find("span", class_="title").text.strip() if result.find("span", class_="title") else None
        # book_author = result.find("span", class_="subtitle").text.strip() if result.find("span", class_="subtitle") else None
        # book = Book(book_title)
        # book.author = book_author
        # book.url = book_url

        books.append({
            "title": book_title or "Untitled",
            "cover_url": cover_img if cover_img else "https://via.placeholder.com/150",
            "description": f"A classic work by {book_author or 'Unknown Author'}.",
            "rating": 4.0,  # Default rating
            "summary": summary if summary else f"This book, {book_title or 'Untitled'}, is a work by {book_author or 'Unknown Author'}. No detailed summary is available.",
            "borrow_count": 0,  # Default
            "total_books": 10,  # Default stock
            "available_books": 10,  # Default available
            "featured_book": False,  # Default
            "author": book_author or "Unknown Author",
            "category": cat or "Uncategorized"
        })
    


with open("books.json", "w", encoding="utf-8") as f:
    json.dump(books, f, ensure_ascii=False, indent=4)