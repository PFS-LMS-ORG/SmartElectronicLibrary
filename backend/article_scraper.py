import requests
import time
import json
from bs4 import BeautifulSoup

URL1 = "https://arxiv.org/archive/cs"

URLS = [URL1]

all_data = []

for URL in URLS:
    page = requests.get(URL)
    soup = BeautifulSoup(page.content , "html.parser")
    links = soup.find_all('a')
    links = list(filter(lambda link: link["href"].startswith('/list/') and link["href"].endswith("new"), links ))

    links.pop(0) #the only link that should be removed

    for link in links:
        print(" going into : ==> https://arxiv.org" + link["href"])
        page = requests.get("https://arxiv.org" + link["href"])
        soup = BeautifulSoup(page.content , "html.parser")


        dts = soup.find_all('dt')
        for dt in dts:
            article_link = dt.find('a',string="html")
            if not article_link:
                continue

            article_link = article_link["href"]

            dd = dt.find_next_sibling('dd')
            authors = dd.find('div' , class_ = "list-authors").find_all('a')
            authors = [author.text for author in authors]

            category = dd.find('div',class_="list-subjects").find('span',class_="primary-subject").text

            page = requests.get(article_link)
            soup = BeautifulSoup(page.content , "html.parser")

            data = {
                "authors" : authors,
                "category" : category
            }

            all_data.append(data)


with open("output.json", "w", encoding="utf-8") as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)
