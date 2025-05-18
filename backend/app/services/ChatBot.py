import json
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
        # self.llm = init_chat_model("grok", model_provider="xai")
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




    # Helper methods for formatting data
    def _format_book_data(self, book):
        try:
            authors_text = ", ".join([author.name for author in book.authors]) if book.authors else "Unknown"
            categories_text = ", ".join([category.name for category in book.categories]) if book.categories else "Unknown"
            
            return {
                "id": str(book.id),
                "title": book.title or "Unknown",
                "author": authors_text,
                "category": categories_text,
                "rating": float(book.rating) if book.rating is not None else 0.0,
                "cover_url": book.cover_url or ""
            }
        except Exception as e:
            logger.error(f"Error formatting book data: {str(e)}")
            return None
    
    def _format_article_data(self, article):
        try:
            return {
                "id": str(article.id),
                "slug": article.slug or "unknown",
                "title": article.title or "Unknown",
                "author": article.author.name if article.author else "Unknown",
                "category": article.category or "Unknown",
                "views": article.meta.views if article.meta else 0,
                "likes": article.meta.likes_count if article.meta else 0
            }
        except Exception as e:
            logger.error(f"Error formatting article data: {str(e)}")
            return None
    
    


    def get_tools(self):
        """Returns all available tools for the chatbot."""
        
        @tool(response_format="content_and_artifact")
        def retrieve(query: str):
            """Retrieve information related to a query."""
            logger.info(f"Retrieving documents for query: {query}")
            try:
                retrieved_docs = self.vector_store.similarity_search(query, k=5)  # Increased from 3 to 5
                logger.info(f"Retrieved {len(retrieved_docs)} documents")
                # Log document types
                doc_types = [doc.metadata.get('type', 'unknown') for doc in retrieved_docs]
                logger.info(f"Document types in results: {doc_types}")
            except Exception as e:
                logger.error(f"Vector store search failed: {str(e)}")
                return "No results found due to search error.", {"books": [], "articles": []}

            books = []
            # Process books from retrieved documents
            for doc in retrieved_docs:
                metadata = doc.metadata or {}
                doc_type = metadata.get("type", "unknown")
                doc_id = metadata.get("id", "unknown")
                
                # Log every document for debugging
                logger.debug(f"Processing retrieved doc: {doc_id} of type {doc_type}")
                
                if doc_type == "book":
                    try:
                        book_id = int(doc_id.replace("book_", ""))
                        book_obj = db.session.query(Book).get(book_id)
                        if book_obj:
                            # Log successful book retrieval
                            logger.info(f"Found book in DB: ID={book_id}, Title={book_obj.title}")
                            
                            authors_text = ", ".join([author.name for author in book_obj.authors]) if book_obj.authors else "Unknown"
                            categories_text = ", ".join([category.name for category in book_obj.categories]) if book_obj.categories else "Unknown"
                            
                            book_data = {
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
                                "cover_url": book_obj.cover_url if book_obj.cover_url else "https://placehold.co/600x400"
                            }
                            
                            # Log actual book data
                            logger.debug(f"Book data: {book_data}")
                            books.append(book_data)
                        else:
                            logger.warning(f"Book {book_id} found in vector store but not in database")
                    except Exception as e:
                        logger.error(f"Error processing book {doc_id}: {str(e)}")
                        logger.error(traceback.format_exc())

            articles = []
            with self.app.app_context():
                for doc in retrieved_docs:
                    metadata = doc.metadata or {}
                    doc_type = metadata.get("type", "unknown")
                    doc_id = metadata.get("id", "unknown")
                    
                    # Log every document for debugging
                    logger.debug(f"Processing retrieved doc: {doc_id} of type {doc_type}")
                    
                    if doc_type == "article":
                        try:
                            article_id = int(doc_id.replace("article_", ""))
                            article_obj = db.session.query(Article).get(article_id)
                            if article_obj:
                                # Log successful article retrieval
                                logger.info(f"Found article in DB: ID={article_id}, Title={article_obj.title}")
                                
                                # Add more detailed logging
                                read_time = article_obj.meta.read_time or 5 if article_obj.meta else 5
                                views = article_obj.meta.views or 0 if article_obj.meta else 0
                                likes = article_obj.meta.likes_count or 0 if article_obj.meta else 0
                                
                                article_data = {
                                    "id": str(article_obj.id),
                                    "slug": article_obj.slug or "unknown",
                                    "title": article_obj.title or "Unknown",
                                    "author": article_obj.author.name if article_obj.author else "Unknown",
                                    "category": article_obj.category or "Unknown",
                                    "summary": article_obj.summary or "No summary",
                                    "pdf_url": article_obj.pdf_url or "",
                                    "cover_image_url": article_obj.cover_image_url or "https://placehold.co/600x300",
                                    "read_time": read_time,
                                    "views": views,
                                    "likes": likes
                                }
                                
                                # Log actual data
                                logger.debug(f"Article data: {article_data}")
                                articles.append(article_data)
                            else:
                                logger.warning(f"Article {article_id} found in vector store but not in database")
                        except Exception as e:
                            logger.error(f"Error processing article {doc_id}: {str(e)}")
                            logger.error(traceback.format_exc())


            serialized = "\n\n".join(
                (f"Type: {doc.metadata.get('type', 'unknown')}\nTitle: {doc.metadata.get('title', 'Unknown')}\nContent: {doc.page_content}")
                for doc in retrieved_docs
            ) if retrieved_docs else "No results found."
            message = AIMessage(content=serialized, additional_kwargs={"artifacts": {"books": books, "articles": articles}})
            logger.debug(f"Returning {len(books)} books and {len(articles)} articles")
            return message.content, message.additional_kwargs["artifacts"]

        @tool()
        def get_categories(item_type: str = "all"):
            """
            Get available categories for books or articles.
            
            Args:
                item_type: Type of items to get categories for. Options: "books", "articles", or "all" (default).
            
            Returns:
                List of category names and counts.
            """
            logger.info(f"Getting categories for: {item_type}")
            categories = {}
            
            with self.app.app_context():
                try:
                    if item_type.lower() in ["books", "all"]:
                        # Get book categories
                        from app.model.Category import Category
                        book_categories = db.session.query(Category).all()
                        for cat in book_categories:
                            if cat.name not in categories:
                                categories[cat.name] = {"count": 0, "type": "book"}
                            categories[cat.name]["count"] += len(cat.books)
                    
                    if item_type.lower() in ["articles", "all"]:
                        # Get article categories
                        article_categories = db.session.query(Article.category, db.func.count(Article.id)).\
                            group_by(Article.category).all()
                        for cat_name, count in article_categories:
                            if cat_name and cat_name.strip():
                                if cat_name not in categories:
                                    categories[cat_name] = {"count": 0, "type": "article"}
                                categories[cat_name]["count"] += count
                    
                    # Convert to list format
                    result = [{"name": name, "count": info["count"], "type": info["type"]} 
                            for name, info in categories.items()]
                    
                    return f"Available categories: {json.dumps(result, indent=2)}"
                except Exception as e:
                    logger.error(f"Error fetching categories: {str(e)}")
                    return "Error fetching categories."
        
        @tool()
        def search_by_category(category: str, item_type: str = "all", limit: int = 5):
            """
            Search for items in a specific category.
            
            Args:
                category: Category name to search for.
                item_type: Type of items to search. Options: "books", "articles", or "all" (default).
                limit: Maximum number of results to return (default: 5).
            
            Returns:
                List of items in the specified category.
            """
            logger.info(f"Searching for {item_type} in category: {category}")
            results = {"books": [], "articles": []}
            
            with self.app.app_context():
                try:
                    if item_type.lower() in ["books", "all"]:
                        # Search books by category
                        from app.model.Category import Category
                        book_cats = db.session.query(Category).filter(Category.name.ilike(f"%{category}%")).all()
                        for cat in book_cats:
                            for book in cat.books[:limit]:
                                book_data = self._format_book_data(book)
                                if book_data:
                                    results["books"].append(book_data)
                    
                    if item_type.lower() in ["articles", "all"]:
                        # Search articles by category
                        articles = db.session.query(Article).\
                            filter(Article.category.ilike(f"%{category}%")).\
                            limit(limit).all()
                        
                        for article in articles:
                            article_data = self._format_article_data(article)
                            if article_data:
                                results["articles"].append(article_data)
                    
                    return f"Category search results: {json.dumps(results, indent=2)}"
                except Exception as e:
                    logger.error(f"Error searching by category: {str(e)}")
                    return "Error searching by category."
        
        @tool()
        def get_popular_items(item_type: str = "all", limit: int = 3):
            """
            Get popular books or articles.
            
            Args:
                item_type: Type of items to get. Options: "books", "articles", or "all" (default).
                limit: Maximum number of results to return (default: 3).
            
            Returns:
                List of popular items.
            """
            logger.info(f"Getting popular {item_type}, limit: {limit}")
            results = {"books": [], "articles": []}
            
            with self.app.app_context():
                try:
                    if item_type.lower() in ["books", "all"]:
                        # Get popular books (by rating and borrow count)
                        books = db.session.query(Book).\
                            order_by(Book.rating.desc(), Book.borrow_count.desc()).\
                            limit(limit).all()
                        
                        for book in books:
                            book_data = self._format_book_data(book)
                            if book_data:
                                results["books"].append(book_data)
                    
                    if item_type.lower() in ["articles", "all"]:
                        # Get popular articles (by views and likes)
                        from app.model.ArticleMeta import ArticleMeta
                        articles = db.session.query(Article).\
                            join(ArticleMeta, Article.id == ArticleMeta.article_id).\
                            order_by(ArticleMeta.views.desc(), ArticleMeta.likes_count.desc()).\
                            limit(limit).all()
                        
                        for article in articles:
                            article_data = self._format_article_data(article)
                            if article_data:
                                results["articles"].append(article_data)
                    
                    return f"Popular items: {json.dumps(results, indent=2)}"
                except Exception as e:
                    logger.error(f"Error fetching popular items: {str(e)}")
                    return "Error fetching popular items."
        
        # Return all tools as a list
        return [retrieve, get_categories, search_by_category, get_popular_items]



    def create_graph(self):
        # Get all tools
        tools = self.get_tools()
        
        def query_or_respond(state: MessagesState):
            llm_with_tools = self.llm.bind_tools(tools)
            response = llm_with_tools.invoke(state["messages"])
            return {"messages": [response]}
        
        def generate(state: MessagesState):
            try:
                # Extract tool messages
                tool_messages = [m for m in state["messages"] if m.type == "tool"]
                
                # Collect all tool outputs for the system message
                tool_outputs = []
                for msg in tool_messages:
                    if hasattr(msg, "content"):
                        tool_outputs.append(f"Tool output: {msg.content}")
                
                # Extract book and article data
                all_books = []
                all_articles = []
                for msg in tool_messages:
                    if hasattr(msg, 'additional_kwargs') and 'artifacts' in msg.additional_kwargs:
                        books = msg.additional_kwargs['artifacts'].get('books', [])
                        articles = msg.additional_kwargs['artifacts'].get('articles', [])
                        all_books.extend(books)
                        all_articles.extend(articles)
                
                # Create lookup dictionaries
                book_data_by_id = {str(book.get("id", "0")): book for book in all_books}
                article_data_by_id = {str(article.get("id", "0")): article for article in all_articles}
                
                # Combine all tool outputs into a single string
                tools_output = "\n\n".join(tool_outputs)
                
                # Create system message that includes tool outputs
                system_message = SystemMessage(
                    content=(
                        "You are YOA+, a smart library assistant for LMSENSA+.\n"
                        "Your primary goal is to help users find relevant books and articles in our library database.\n\n"
                        "CRITICAL INSTRUCTIONS:\n"
                        "1. NEVER invent or hallucinate books or articles - only use what's in the database search results.\n"
                        "2. ONLY recommend books and articles explicitly present in the tools output or database search results.\n"
                        "3. If relevant items are found, feature them prominently in your response.\n"
                        "4. Keep your 'answer' field CONCISE (2-3 sentences) and focus on acknowledging what you found.\n"
                        "6. When the user asks about articles, check if there are ANY articles in the database results.\n"
                        "   If NO ACTUAL ARTICLES are present, inform the user and recommend books instead.\n"
                        "7. All details must appear in the structured fields (recommended_books and recommended_articles).\n"
                        "8. Make follow-up questions relevant to the user's query or the recommendations provided.\n"
                        "9. IMPORTANT: When recommending, distinguish between books and articles carefully.\n"
                        "10. NEVER include cover image URLs (cover_url or cover_image_url) in the 'answer' field. Cover images must only appear in the 'recommended_books' and 'recommended_articles' structured fields."
                        "11. ALWAYS limit your recommendations to a MAXIMUM of 3 items total. If you have more than 3 items,\n"
                        "   select only the 3 most relevant ones based on the user's query.\n\n"
                        "AVAILABLE TOOLS:\n"
                        "- retrieve: Search for books and articles based on keywords\n"
                        "- get_categories: Get all available categories of books and articles\n"
                        "- search_by_category: Search for books or articles within a specific category\n"
                        "- get_popular_items: Get the most popular books or articles\n\n"
                        f"TOOLS OUTPUT:\n{tools_output}\n\n"
                        f"DATABASE SEARCH RESULTS:\n{len(all_books)} books and {len(all_articles)} articles found."
                    )
                )
                

                convo = [
                    msg for msg in state["messages"]
                    if msg.type in ("human", "system") or (msg.type == "ai" and not msg.tool_calls)
                ]
                prompt = [system_message] + convo
                structured_llm = self.llm.with_structured_output(ChatResponse)
                response = structured_llm.invoke(prompt)

                logger.info(f"LLM Response - Answer: {response.answer}")
                logger.info(f"LLM Response - Books: {len(response.recommended_books) if response.recommended_books else 0}")
                logger.info(f"LLM Response - Articles: {len(response.recommended_articles) if response.recommended_articles else 0}")

                # Process book recommendations
                validated_books = []
                if response.recommended_books:
                    logger.debug(f"Processing {len(response.recommended_books)} recommended books")
                    for book in response.recommended_books:
                        # Extract book ID based on object type
                        if isinstance(book, dict):
                            book_id = str(book.get("id", "0"))
                        else:
                            book_id = str(getattr(book, "id", "0"))
                        
                        logger.debug(f"Looking up book with ID: {book_id}")
                        
                        # First try direct lookup from tool messages
                        book_data = book_data_by_id.get(book_id)
                        if book_data:
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
                                "cover_url": book_data.get("cover_url", "")
                            })
                            logger.debug(f"Added validated book from data dictionary: {book_data.get('title', 'Unknown')}")
                        else:
                            # Fallback to database lookup - only for REAL database entries
                            with self.app.app_context():
                                try:
                                    if book_id.isdigit():
                                        book_obj = db.session.query(Book).get(int(book_id))
                                        if book_obj:
                                            authors_text = ", ".join([author.name for author in book_obj.authors]) if book_obj.authors else "Unknown"
                                            categories_text = ", ".join([category.name for category in book_obj.categories]) if book_obj.categories else "Unknown"
                                            
                                            validated_books.append({
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
                                                "cover_url": book_obj.cover_url or ""
                                            })
                                            logger.debug(f"Added validated book from database: {book_obj.title}")
                                        else:
                                            logger.warning(f"Book ID {book_id} not found in database")
                                except Exception as e:
                                    logger.error(f"Error fetching book {book_id} from database: {str(e)}")

                # Process article recommendations
                validated_articles = []
                if response.recommended_articles:
                    logger.debug(f"Processing {len(response.recommended_articles)} recommended articles")
                    
                    # Log article IDs for debugging
                    article_ids = []
                    for article in response.recommended_articles:
                        if isinstance(article, dict):
                            article_ids.append(article.get("id"))
                        else:
                            article_ids.append(getattr(article, "id", None))
                    logger.debug(f"LLM recommended article IDs: {article_ids}")
                    
                    # Only try to find actual articles
                    for article in response.recommended_articles:
                        if isinstance(article, dict):
                            article_id = str(article.get("id", "0"))
                        else:
                            article_id = str(getattr(article, "id", "0"))
                        
                        logger.debug(f"Looking up article with ID: {article_id}")
                        
                        # First check the article data dictionary
                        article_data = article_data_by_id.get(article_id)
                        if article_data:
                            validated_articles.append({
                                "id": str(article_data.get("id", "0")),
                                "slug": article_data.get("slug", "unknown"),
                                "title": article_data.get("title", "Unknown"),
                                "author": article_data.get("author", "Unknown"),
                                "category": article_data.get("category", "Unknown"),
                                "summary": article_data.get("summary", "No summary"),
                                "pdf_url": article_data.get("pdf_url", ""),
                                "cover_image_url": article_data.get("cover_image_url", ""),
                                "read_time": int(article_data.get("read_time", 5)),
                                "views": int(article_data.get("views", 0)),
                                "likes": int(article_data.get("likes", 0))
                            })
                            logger.debug(f"Added validated article from data dictionary: {article_data.get('title', 'Unknown')}")
                            continue
                        
                        # Fallback to direct database lookup
                        with self.app.app_context():
                            try:
                                if article_id.isdigit():
                                    article_obj = db.session.query(Article).get(int(article_id))
                                    if article_obj:
                                        validated_articles.append({
                                            "id": str(article_obj.id),
                                            "slug": article_obj.slug or "unknown",
                                            "title": article_obj.title or "Unknown",
                                            "author": article_obj.author.name if article_obj.author else "Unknown",
                                            "category": article_obj.category or "Unknown",
                                            "summary": article_obj.summary or "No summary",
                                            "pdf_url": article_obj.pdf_url or "",
                                            "cover_image_url": article_obj.cover_image_url or "",
                                            "read_time": article_obj.meta.read_time if article_obj.meta else 5,
                                            "views": article_obj.meta.views if article_obj.meta else 0,
                                            "likes": article_obj.meta.likes_count if article_obj.meta else 0
                                        })
                                        logger.debug(f"Added validated article from database: {article_obj.title}")
                                    else:
                                        logger.warning(f"Article ID {article_id} not found in database")
                            except Exception as e:
                                logger.error(f"Error fetching article {article_id} from database: {str(e)}")

                # If the LLM was explicitly looking for articles but we found none, make a second search attempt
                if response.recommended_articles and not validated_articles and 'article' in docs_content.lower():
                    logger.warning("LLM recommended articles but none were valid - trying additional search")
                    try:
                        # Try another search specifically for articles
                        retrieved_docs = self.vector_store.similarity_search("article", k=5)
                        if retrieved_docs:
                            # Process only actual articles from the results
                            with self.app.app_context():
                                for doc in retrieved_docs:
                                    metadata = doc.metadata or {}
                                    doc_type = metadata.get("type", "unknown")
                                    doc_id = metadata.get("id", "unknown")
                                    
                                    if doc_type == "article":
                                        try:
                                            article_id = int(doc_id.replace("article_", ""))
                                            article_obj = db.session.query(Article).get(article_id)
                                            if article_obj and len(validated_articles) < 3:  # Limit to 3 articles
                                                validated_articles.append({
                                                    "id": str(article_obj.id),
                                                    "slug": article_obj.slug or "unknown",
                                                    "title": article_obj.title or "Unknown",
                                                    "author": article_obj.author.name if article_obj.author else "Unknown",
                                                    "category": article_obj.category or "Unknown",
                                                    "summary": article_obj.summary or "No summary",
                                                    "pdf_url": article_obj.pdf_url or "",
                                                    "cover_image_url": article_obj.cover_image_url or "",
                                                    "read_time": article_obj.meta.read_time if article_obj.meta else 5,
                                                    "views": article_obj.meta.views if article_obj.meta else 0,
                                                    "likes": article_obj.meta.likes_count if article_obj.meta else 0
                                                })
                                                logger.debug(f"Added article from secondary search: {article_obj.title}")
                                        except Exception as e:
                                            logger.error(f"Error processing article from secondary search: {str(e)}")
                    except Exception as e:
                        logger.error(f"Error in secondary article search: {str(e)}")


                
                # Create the final response
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
        
        # Build the graph
        builder = StateGraph(MessagesState)
        builder.add_node("query_or_respond", query_or_respond)
        builder.add_node("tools", ToolNode(tools))
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
                recommended_books = last_message.additional_kwargs.get("recommended_books", None)
                recommended_articles = last_message.additional_kwargs.get("recommended_articles", None)
                
                final_response = ChatResponse(
                    answer=last_message.content,
                    follow_up_question=last_message.additional_kwargs.get("follow_up_question", ""),
                    recommended_books=recommended_books,
                    recommended_articles=recommended_articles
                )

        if not final_response:
            final_response = ChatResponse(
                answer="Sorry, I couldn't process your request.",
                follow_up_question="Can I help you with another query?",
                recommended_books=None,
                recommended_articles=None
            )

        return final_response.model_dump_json(indent=2)
    
    
    
    