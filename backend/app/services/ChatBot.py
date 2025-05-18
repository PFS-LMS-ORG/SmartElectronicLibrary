import os
import traceback
import logging
from threading import Timer
from langchain.schema import Document
# from langchain.vectorstores import FAISS
# from langchain.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy import event
from app import db
from app.model.Book import Book
from app.model.Article import Article
import gc

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for structured output
class BookRecommendation(BaseModel):
    id: str = Field(description="The unique identifier of the book")
    title: str = Field(description="Title of the recommended book")
    author: str = Field(description="Author of the book")
    category: str = Field(description="Category of the book")
    description: str = Field(description="Description of the book")
    summary: str = Field(description="Summary of the book") 
    rating: float = Field(description="Rating of the book")
    borrow_count: int = Field(description="Number of times the book has been borrowed")
    total_books: int = Field(description="Total number of copies")
    available_books: int = Field(description="Number of available copies")
    featured_book: bool = Field(description="Whether the book is featured")
    cover_url: Optional[str] = Field(default=None, description="URL of the book cover")

class ArticleRecommendation(BaseModel):
    id: str = Field(description="The unique identifier of the article")
    slug: str = Field(description="The unique slug of the article")
    title: str = Field(description="Title of the article")
    author: str = Field(description="Author of the article")
    category: str = Field(description="Category of the article")
    summary: str = Field(description="Summary of the article")
    pdf_url: str = Field(description="URL of the article PDF")
    cover_image_url: Optional[str] = Field(default=None, description="URL of the article cover image")
    read_time: int = Field(description="Estimated read time in minutes")
    views: int = Field(description="Number of views")
    likes: int = Field(description="Number of likes")

class ChatResponse(BaseModel):
    answer: str = Field(description="The chatbot's response to the user's query")
    follow_up_question: str = Field(description="A question to continue the conversation")
    recommended_books: Optional[List[BookRecommendation]] = Field(
        default=None,
        description="List of recommended books based on the query"
    )
    recommended_articles: Optional[List[ArticleRecommendation]] = Field(
        default=None,
        description="List of recommended articles based on the query"
    )

class ChatBot:
    private_instance = None
    _initialized = False

    def __new__(cls, app=None):
        if cls.private_instance is None:
            cls.private_instance = super(ChatBot, cls).__new__(cls)
        return cls.private_instance

    def __init__(self, app=None):
        if self._initialized:
            return
        self.app = app
        self.llm = init_chat_model("gpt-4o-mini", model_provider="openai")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = self.load_content_from_db()
        self.graph = self.create_graph()
        self._id_cache = {}  # Cache for validated IDs
        self._pending_updates = set()  # For debounced updates
        self._update_timer = None
        self._initialized = True
        if app:
            with app.app_context():
                event.listen(Book, "after_insert", self._queue_update_book)
                event.listen(Book, "after_update", self._queue_update_book)
                event.listen(Book, "after_delete", self._queue_delete_book)
                event.listen(Article, "after_insert", self._queue_update_article)
                event.listen(Article, "after_update", self._queue_update_article)
                event.listen(Article, "after_delete", self._queue_delete_article)

    def _queue_update_book(self, mapper, connection, target):
        self._pending_updates.add(("book", target.id))
        self._schedule_updates()

    def _queue_delete_book(self, mapper, connection, target):
        self._pending_updates.add(("book_delete", target.id))
        self._schedule_updates()

    def _queue_update_article(self, mapper, connection, target):
        self._pending_updates.add(("article", target.id))
        self._schedule_updates()

    def _queue_delete_article(self, mapper, connection, target):
        self._pending_updates.add(("article_delete", target.id))
        self._schedule_updates()

    def _schedule_updates(self):
        if self._update_timer:
            self._update_timer.cancel()
        self._update_timer = Timer(5.0, self._process_updates)
        self._update_timer.start()

    def _process_updates(self):
        with self.app.app_context():
            updates = self._pending_updates.copy()
            self._pending_updates.clear()
            for update_type, item_id in updates:
                if update_type == "book":
                    self.update_book_in_vector_store(item_id)
                elif update_type == "book_delete":
                    self.remove_book_from_vector_store(item_id)
                elif update_type == "article":
                    self.update_article_in_vector_store(item_id)
                elif update_type == "article_delete":
                    self.remove_article_from_vector_store(item_id)
        self._update_timer = None

    def book_to_document(self, book):
        authors_text = ", ".join([author.name for author in book.authors]) if book.authors else "Unknown"
        categories_text = ", ".join([category.name for category in book.categories]) if book.categories else "Unknown"
        content = f"""
        Type: Book
        Book ID: {book.id or 0}
        Title: {book.title or 'Unknown'}
        Author: {authors_text}
        Category: {categories_text}
        Description: {book.description or 'No description'}
        Summary: {book.summary or 'No summary'}
        Rating: {book.rating or 0}
        Borrow Count: {book.borrow_count or 0}
        Total Books: {book.total_books or 0}
        Available Books: {book.available_books or 0}
        Featured Book: {book.featured_book or False}
        Cover URL: {book.cover_url or ''}
        """
        doc = Document(
            page_content=content.strip(),
            metadata={"title": book.title or "Unknown", "id": f"book_{book.id}", "type": "book"}
        )
        if f"book_{book.id}" != doc.metadata["id"]:
            logger.error(f"Metadata ID mismatch for book {book.id}")
        return doc

    def article_to_document(self, article):
        author_name = article.author.name if article.author else "Unknown"
        content = f"""
        Type: Article
        Article ID: {article.id or 0}
        Slug: {article.slug or 'unknown'}
        Title: {article.title or 'Unknown'}
        Author: {author_name}
        Category: {article.category or 'Unknown'}
        Summary: {article.summary or 'No summary'}
        PDF URL: {article.pdf_url or ''}
        Cover Image URL: {article.cover_image_url or 'https://placehold.co/600x300'}
        Read Time: {article.meta.read_time if article.meta else 5}
        Views: {article.meta.views if article.meta else 0}
        Likes: {article.meta.likes_count if article.meta else 0}
        """
        doc = Document(
            page_content=content.strip(),
            metadata={"title": article.title or "Unknown", "id": f"article_{article.id}", "type": "article"}
        )
        if f"article_{article.id}" != doc.metadata["id"]:
            logger.error(f"Metadata ID mismatch for article {article.id}")
        return doc

    def add_book_to_vector_store(self, book_id: int):
        with self.app.app_context():
            row = db.session.query(Book).get(book_id)
            if row:
                doc = self.book_to_document(row)
                self.vector_store.add_documents([doc])
                logger.info(f"Added book {book_id} to vector store.")

    def remove_book_from_vector_store(self, book_id: int):
        self.vector_store.delete([f"book_{book_id}"])
        logger.info(f"Removed book {book_id} from vector store.")

    def update_book_in_vector_store(self, book_id: int):
        with self.app.app_context():
            row = db.session.query(Book).get(book_id)
            if row:
                self.vector_store.delete([f"book_{book_id}"])
                doc = self.book_to_document(row)
                self.vector_store.add_documents([doc])
                logger.info(f"Updated book {book_id} in vector store.")

    def add_article_to_vector_store(self, article_id: int):
        with self.app.app_context():
            row = db.session.query(Article).get(article_id)
            if row:
                doc = self.article_to_document(row)
                self.vector_store.add_documents([doc])
                logger.info(f"Added article {article_id} to vector store.")

    def remove_article_from_vector_store(self, article_id: int):
        self.vector_store.delete([f"article_{article_id}"])
        logger.info(f"Removed article {article_id} from vector store.")

    def update_article_in_vector_store(self, article_id: int):
        with self.app.app_context():
            row = db.session.query(Article).get(article_id)
            if row:
                self.vector_store.delete([f"article_{article_id}"])
                doc = self.article_to_document(row)
                self.vector_store.add_documents([doc])
                logger.info(f"Updated article {article_id} in vector store.")

    def load_content_from_db(self):
        cache_path = "./content_vectorstore"
        cache_index = f"{cache_path}/index.faiss"
        cache_metadata = f"{cache_path}/index.pkl"
        logger.info("Attempting to load FAISS vector store from cache...")
        with self.app.app_context():
            try:
                # Check if cache exists
                if os.path.exists(cache_index) and os.path.exists(cache_metadata):
                    try:
                        vector_store = FAISS.load_local(cache_path, embeddings=self.embeddings, allow_dangerous_deserialization=True)
                        logger.info("Successfully loaded FAISS vector store from cache.")
                        return vector_store
                    except Exception as e:
                        logger.warning(f"Failed to load cache: {str(e)}. Rebuilding vector store...")
                else:
                    logger.info("No cache found. Building new FAISS vector store from database...")

                # Build new vector store
                vector_store = None
                batch_size = 200
                for model, type_name in [(Book, "book"), (Article, "article")]:
                    offset = 0
                    while True:
                        try:
                            rows = db.session.query(model).offset(offset).limit(batch_size).all()
                            if not rows:
                                break
                            docs = [getattr(self, f"{type_name}_to_document")(row) for row in rows]
                            chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)
                            if vector_store is None:
                                vector_store = FAISS.from_documents(chunks, embedding=self.embeddings)
                            else:
                                vector_store.add_documents(chunks)
                            os.makedirs(cache_path, exist_ok=True)
                            vector_store.save_local(cache_path)
                            offset += batch_size
                            logger.info(f"Processed {offset} {type_name}s")
                            gc.collect()
                        except Exception as e:
                            logger.error(f"Error processing {type_name} batch at offset {offset}: {str(e)}")
                            raise
                if vector_store is None:
                    logger.warning("No content found in database.")
                    return FAISS.from_texts(["No books or articles found in library database"], embedding=self.embeddings)
                logger.info("Successfully built and saved FAISS vector store.")
                return vector_store
            except Exception as e:
                logger.error(f"Failed to build vector store: {str(e)}")
                logger.error(traceback.format_exc())
                return FAISS.from_texts(["Error accessing library database"], embedding=self.embeddings)



    def create_graph(self):
        @tool(response_format="content_and_artifact")
        def retrieve(query: str):
            """Retrieve information related to a query."""
            logger.debug(f"Retrieving documents for query: {query}")
            try:
                retrieved_docs = self.vector_store.similarity_search(query, k=3)
                logger.debug(f"Retrieved {len(retrieved_docs)} documents")
            except Exception as e:
                logger.error(f"Vector store search failed: {str(e)}")
                return "No results found due to search error.", {"books": [], "articles": []}

            books = []
            articles = []
            with self.app.app_context():
                for doc in retrieved_docs:
                    metadata = doc.metadata or {}
                    doc_type = metadata.get("type", "unknown")
                    doc_id = metadata.get("id", "unknown")
                    if doc_type == "book":
                        try:
                            book_id = int(doc_id.replace("book_", ""))
                            book_obj = db.session.query(Book).get(book_id)
                            if book_obj:
                                authors_text = ", ".join([author.name for author in book_obj.authors]) if book_obj.authors else "Unknown"
                                categories_text = ", ".join([category.name for category in book_obj.categories]) if book_obj.categories else "Unknown"
                                books.append({
                                    "id": str(book_obj.id),
                                    "title": book_obj.title or "Unknown",
                                    "author": authors_text,
                                    "category": categories_text,
                                    "description": book_obj.description or "No description",
                                    "summary": book_obj.summary or "No summary",
                                    "rating": float(book_obj.rating) if book_obj.rating is not None else 0.0,
                                    "borrow_count": book_obj.borrow_count or 0,
                                    "total_books": book_obj.total_books or 0,
                                    "available_books": book_obj.available_books or 0,
                                    "featured_book": book_obj.featured_book or False,
                                    "cover_url": book_obj.cover_url or None
                                })
                            else:
                                logger.warning(f"Book {book_id} not found in database")
                        except Exception as e:
                            logger.error(f"Error processing book {doc_id}: {str(e)}")
                    elif doc_type == "article":
                        try:
                            article_id = int(doc_id.replace("article_", ""))
                            article = db.session.query(Article).get(article_id)
                            if article:
                                read_time = article.meta.read_time or 5 if article.meta else 5
                                views = article.meta.views or 0 if article.meta else 0
                                likes = article.meta.likes_count or 0 if article.meta else 0
                                articles.append({
                                    "id": str(article.id),
                                    "slug": article.slug or "unknown",
                                    "title": article.title or "Unknown",
                                    "author": article.author.name if article.author else "Unknown",
                                    "category": article.category or "Unknown",
                                    "summary": article.summary or "No summary",
                                    "pdf_url": article.pdf_url or "",
                                    "cover_image_url": article.cover_image_url or "https://placehold.co/600x300",
                                    "read_time": read_time,
                                    "views": views,
                                    "likes": likes
                                })
                            else:
                                logger.warning(f"Article {article_id} not found in database")
                        except Exception as e:
                            logger.error(f"Error processing article {doc_id}: {str(e)}")
                    else:
                        logger.warning(f"Unknown document type: {doc_type} for ID {doc_id}")

            serialized = "\n\n".join(
                (f"Type: {doc.metadata.get('type', 'unknown')}\nTitle: {doc.metadata.get('title', 'Unknown')}\nContent: {doc.page_content}")
                for doc in retrieved_docs
            ) if retrieved_docs else "No results found."
            message = AIMessage(content=serialized, additional_kwargs={"artifacts": {"books": books, "articles": articles}})
            logger.debug(f"Returning {len(books)} books and {len(articles)} articles")
            return message.content, message.additional_kwargs["artifacts"]

        def query_or_respond(state: MessagesState):
            llm_with_tools = self.llm.bind_tools([retrieve])
            response = llm_with_tools.invoke(state["messages"])
            return {"messages": [response]}

        def generate(state: MessagesState):  # Removed self, now a standalone function
            try:
                tool_messages = [m for m in state["messages"] if m.type == "tool"]
                docs_content = "\n\n".join(msg.content for msg in tool_messages if hasattr(msg, "content"))
                article_data_by_id = {}
                for msg in tool_messages:
                    if hasattr(msg, 'additional_kwargs') and 'artifacts' in msg.additional_kwargs:
                        articles = msg.additional_kwargs['artifacts'].get('articles', [])
                        for article in articles:
                            article_id = str(article.get("id", "0"))
                            article_data_by_id[article_id] = article
                            if article_id.isdigit():
                                article_data_by_id[int(article_id)] = article
                            logger.debug(f"Stored article: ID={article_id}")

                system_message = SystemMessage(
                    content=(
                        "You are YOA+, a smart library assistant for LMSENSA+.\n"
                        "ONLY respond with information explicitly present in the database search results.\n\n"
                        "CRITICAL INSTRUCTIONS:\n"
                        "1. NEVER invent or hallucinate books or articles - only use what's in the database results.\n"
                        "2. If no relevant items are found in the database, clearly state this fact.\n"
                        "3. EXTREMELY IMPORTANT: Keep your 'answer' field VERY CONCISE (2-3 sentences maximum) and NEVER include ANY book or article details (titles, authors, summaries) in the main answer.\n"
                        "4. Your main answer should ONLY acknowledge the user's query and indicate if you found relevant items, like: 'Here are some books about JavaScript you might find interesting.' or 'I couldn't find any articles on that topic.'\n"
                        "5. All book details must ONLY appear in the recommended_books structured field.\n"
                        "6. All article details must ONLY appear in the recommended_articles structured field.\n"
                        "7. If the user asks for something out of the library context, politely inform them that you can only assist with library-related queries.\n"
                        "8. Make follow-up questions relevant to the user's query or the recommendations provided.\n"
                        "9. IMPORTANT: When recommending articles, ALWAYS use the article's numeric ID (not slug or title) in the id field.\n"
                        "10. NEVER recommend more than 3 books or 3 articles. If there are more results, select only the top 3 most relevant ones.\n"
                        "RESPONSE FORMAT EXAMPLE:\n"
                        "- Correct answer: 'I found some books in our collection that match your interest in machine learning.'\n"
                        "- WRONG answer: 'Here are some books: 1. \"Machine Learning Basics\" by John Smith...'\n\n"
                        
                        f"DATABASE SEARCH RESULTS:\n{docs_content}"
                    )
                )

                convo = [
                    msg for msg in state["messages"]
                    if msg.type in ("human", "system") or (msg.type == "ai" and not msg.tool_calls)
                ]
                prompt = [system_message] + convo
                structured_llm = self.llm.with_structured_output(ChatResponse)  # Use self.llm from outer scope
                response = structured_llm.invoke(prompt)

                logger.info(f"LLM Response - Answer: {response.answer}")
                logger.info(f"LLM Response - Books: {len(response.recommended_books) if response.recommended_books else 0}")
                logger.info(f"LLM Response - Articles: {len(response.recommended_articles) if response.recommended_articles else 0}")

                validated_books = []
                if response.recommended_books:
                    for book in response.recommended_books:
                        book_data = book if isinstance(book, dict) else {
                            "id": getattr(book, "id", "0"),
                            "title": getattr(book, "title", "Unknown"),
                            "author": getattr(book, "author", "Unknown"),
                            "category": getattr(book, "category", "Unknown"),
                            "description": getattr(book, "description", "No description"),
                            "summary": getattr(book, "summary", "No summary"),
                            "rating": getattr(book, "rating", 0.0),
                            "borrow_count": getattr(book, "borrow_count", 0),
                            "total_books": getattr(book, "total_books", 0),
                            "available_books": getattr(book, "available_books", 0),
                            "featured_book": getattr(book, "featured_book", False),
                            "cover_url": getattr(book, "cover_url", None)
                        }
                        validated_books.append({
                            "id": str(book_data.get("id", "0")),
                            "title": book_data.get("title", "Unknown"),
                            "author": book_data.get("author", "Unknown"),
                            "category": book_data.get("category", "Unknown"),
                            "description": book_data.get("description", "No description"),
                            "summary": book_data.get("summary", "No summary"),
                            "rating": float(book_data.get("rating", 0.0)),
                            "borrow_count": int(book_data.get("borrow_count", 0)),
                            "total_books": int(book_data.get("total_books", 0)),
                            "available_books": int(book_data.get("available_books", 0)),
                            "featured_book": bool(book_data.get("featured_book", False)),
                            "cover_url": book_data.get("cover_url")
                        })

                validated_articles = []
                if response.recommended_articles:
                    for article in response.recommended_articles:
                        article_id_str = str(article.get("id", "0") if isinstance(article, dict) else getattr(article, "id", "0"))
                        article_id_int = int(article_id_str) if article_id_str.isdigit() else None
                        article_info = None
                        # Check both string and integer ID in article_data_by_id
                        if article_id_str in article_data_by_id:
                            article_info = article_data_by_id[article_id_str]
                        elif article_id_int is not None and article_id_int in article_data_by_id:
                            article_info = article_data_by_id[article_id_int]
                        
                        if article_info:
                            validated_articles.append({
                                "id": article_info["id"],
                                "slug": article_info["slug"],
                                "title": article_info["title"],
                                "author": article_info["author"],
                                "category": article_info["category"],
                                "summary": article_info["summary"],
                                "pdf_url": article_info["pdf_url"],
                                "cover_image_url": article_info["cover_image_url"],
                                "read_time": int(article_info["read_time"]),
                                "views": int(article_info["views"]),
                                "likes": int(article_info["likes"])
                            })
                            logger.debug(f"Validated article ID: {article_info['id']}")
                        else:
                            logger.warning(f"Article ID {article_id_str} not found in retrieved data, skipping")
                            # Attempt to fetch from database as a fallback
                            with self.app.app_context():
                                try:
                                    article_obj = db.session.query(Article).get(int(article_id_str))
                                    if article_obj:
                                        validated_articles.append({
                                            "id": str(article_obj.id),
                                            "slug": article_obj.slug or "unknown",
                                            "title": article_obj.title or "Unknown",
                                            "author": article_obj.author.name if article_obj.author else "Unknown",
                                            "category": article_obj.category or "Unknown",
                                            "summary": article_obj.summary or "No summary",
                                            "pdf_url": article_obj.pdf_url or "",
                                            "cover_image_url": article_obj.cover_image_url or "https://placehold.co/600x300",
                                            "read_time": article_obj.meta.read_time if article_obj.meta else 5,
                                            "views": article_obj.meta.views if article_obj.meta else 0,
                                            "likes": article_obj.meta.likes_count if article_obj.meta else 0
                                        })
                                        logger.info(f"Recovered article ID {article_id_str} from database")
                                    else:
                                        logger.warning(f"Article ID {article_id_str} not found in database")
                                except Exception as e:
                                    logger.error(f"Database query for article ID {article_id_str} failed: {str(e)}")

                return {
                    "messages": [AIMessage(content=response.answer, additional_kwargs={
                        "follow_up_question": response.follow_up_question,
                        "recommended_books": validated_books,
                        "recommended_articles": validated_articles
                    })]
                }
            except Exception as e:
                logger.error(f"Error in generate: {e}")
                logger.error(traceback.format_exc())
                return {
                    "messages": [AIMessage(content="Sorry, I couldn't process your request due to an internal error.")]
                }



        builder = StateGraph(MessagesState)
        builder.add_node("query_or_respond", query_or_respond)
        builder.add_node("tools", ToolNode([retrieve]))
        builder.add_node("generate", generate)
        builder.set_entry_point("query_or_respond")
        builder.add_conditional_edges("query_or_respond", tools_condition, {END: END, "tools": "tools"})
        builder.add_edge("tools", "generate")
        builder.add_edge("generate", END)
        return builder.compile(checkpointer=MemorySaver())


    def chat_with_user(self, user_input: str, thread_id: str) -> ChatResponse:
        config = {"configurable": {"thread_id": thread_id}}
        message = {"messages": [HumanMessage(content=user_input)]}
        final_response = None
        for step in self.graph.stream(message, stream_mode="values", config=config):
            last_message = step["messages"][-1]
            if last_message.type == "ai":
                recommended_books = last_message.additional_kwargs.get("recommended_books", [])
                recommended_articles = last_message.additional_kwargs.get("recommended_articles", [])
                with self.app.app_context():
                    validated_books = []
                    if recommended_books:
                        book_ids_to_check = [int(book["id"]) for book in recommended_books if book["id"] not in self._id_cache]
                        if book_ids_to_check:
                            valid_book_ids = {b.id for b in db.session.query(Book.id).filter(Book.id.in_(book_ids_to_check)).all()}
                            self._id_cache.update({str(id_): id_ in valid_book_ids for id_ in book_ids_to_check})
                        for book in recommended_books:
                            book_id = int(book["id"])
                            if self._id_cache.get(str(book_id), False):
                                validated_books.append(book)
                            else:
                                logger.error(f"Invalid book ID {book_id} in recommendations - possible hallucination or database mismatch")
                    validated_articles = []
                    if recommended_articles:
                        article_ids_to_check = [int(article["id"]) for article in recommended_articles if str(article["id"]) not in self._id_cache]
                        if article_ids_to_check:
                            try:
                                valid_article_ids = {a.id for a in db.session.query(Article.id).filter(Article.id.in_(article_ids_to_check)).all()}
                                self._id_cache.update({str(id_): id_ in valid_article_ids for id_ in article_ids_to_check})
                            except Exception as e:
                                logger.error(f"Database query for article IDs failed: {str(e)}")
                                valid_article_ids = set()
                        for article in recommended_articles:
                            article_id = int(article["id"])
                            if self._id_cache.get(str(article_id), False):
                                validated_articles.append(article)
                            else:
                                logger.error(f"Invalid article ID {article_id} in recommendations - possible hallucination or database mismatch")
                                logger.debug(f"Article details: {article}")
                    # Refresh vector store for article queries with no valid results
                    if not validated_articles and "article" in user_input.lower():
                        logger.warning("No valid articles found for article query; refreshing vector store...")
                        try:
                            self.vector_store = self.load_content_from_db()
                            # Retry the query
                            retry_response = self.graph.invoke({"messages": [HumanMessage(content=user_input)]}, config=config)
                            retry_message = retry_response["messages"][-1]
                            recommended_articles = retry_message.additional_kwargs.get("recommended_articles", [])
                            article_ids_to_check = [int(article["id"]) for article in recommended_articles if str(article["id"]) not in self._id_cache]
                            if article_ids_to_check:
                                valid_article_ids = {a.id for a in db.session.query(Article.id).filter(Article.id.in_(article_ids_to_check)).all()}
                                self._id_cache.update({str(id_): id_ in valid_article_ids for id_ in article_ids_to_check})
                            validated_articles = [
                                article for article in recommended_articles
                                if int(article["id"]) in {a.id for a in db.session.query(Article.id).all()}
                            ]
                            logger.info(f"Retry returned {len(validated_articles)} articles")
                        except Exception as e:
                            logger.error(f"Vector store refresh failed: {str(e)}")
                    if not validated_books and recommended_books:
                        logger.warning("All recommended books were invalid; returning empty book recommendations")
                    if not validated_articles and recommended_articles:
                        logger.warning("All recommended articles were invalid; returning empty article recommendations")
                    final_response = ChatResponse(
                        answer=last_message.content if validated_books or validated_articles else "I couldn't find any relevant articles in the library database.",
                        follow_up_question=last_message.additional_kwargs.get("follow_up_question", "Can I help you with a specific topic or category?"),
                        recommended_books=validated_books or None,
                        recommended_articles=validated_articles or None
                    )
        if not final_response:
            final_response = ChatResponse(
                answer="Sorry, I couldn't process your request.",
                follow_up_question="Can I help you with another query?",
                recommended_books=None,
                recommended_articles=None
            )
        return final_response.model_dump_json(indent=2)
    
    
    
    
    