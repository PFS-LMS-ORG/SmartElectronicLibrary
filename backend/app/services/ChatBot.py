import os
from dotenv import load_dotenv



load_dotenv()
if not os.environ.get("OPENAI_API_KEY") or not os.environ.get("LANGSMITH_API_KEY"):
    print("Les clés API sont manquantes. Veuillez vérifier le fichier .env")
    exit(1)
import uuid
import logging
from langchain.schema import Document
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
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
from app import db
from app.model import Book

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

class ChatResponse(BaseModel):
    answer: str = Field(description="The chatbot's response to the user's query")
    follow_up_question: str = Field(description="A question to continue the conversation")
    recommended_books: Optional[List[BookRecommendation]] = Field(
        default=None,
        description="List of recommended books based on the query"
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
        self.app = app  # Flask app for context
        self.llm = init_chat_model("gpt-4o-mini", model_provider="openai")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = self.load_books_from_db()
        self.graph = self.create_graph()
        self._initialized = True

    def book_to_document(self, book):
        """Convert a SQLAlchemy Book row to a LangChain Document."""
        # Handle authors - join with comma if there are multiple authors
        authors_text = ", ".join([author.name for author in book.authors]) if book.authors else "Unknown"
        
        # Handle categories - join with comma if there are multiple categories
        categories_text = ", ".join([category.name for category in book.categories]) if book.categories else "Unknown"
        
        content = f"""
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
        return Document(
            page_content=content.strip(),
            metadata={"title": book.title or "Unknown", "id": str(book.id)}
        )


    def add_book_to_vector_store(self, book_id: int):
        """Add a book to the vector store by ID."""
        with self.app.app_context():
            row = db.session.query(Book).get(book_id)
            if row:
                doc = self.book_to_document(row)
                self.vector_store.add_documents([doc])
                logger.info(f"Added book {book_id} to vector store.")

    def remove_book_from_vector_store(self, book_id: int):
        """Remove a book from the vector store by ID."""
        self.vector_store.delete([str(book_id)])
        logger.info(f"Removed book {book_id} from vector store.")

    def update_book_in_vector_store(self, book_id: int):
        """Update a book in the vector store by ID."""
        with self.app.app_context():
            row = db.session.query(Book).get(book_id)
            if row:
                self.vector_store.delete([str(book_id)])
                doc = self.book_to_document(row)
                self.vector_store.add_documents([doc])
                logger.info(f"Updated book {book_id} in vector store.")

    def load_books_from_db(self):
        """Load books from the database into the FAISS vector store."""
        cache_path = "./books_vectorstore"
        cache_index = f"{cache_path}/index.faiss"
        cache_metadata = f"{cache_path}/index.pkl"

        if os.path.exists(cache_index) and os.path.exists(cache_metadata):
            try:
                logger.info("Loading cached FAISS vector store...")
                vector_store = FAISS.load_local(
                    folder_path=cache_path,
                    embeddings=self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info("Cached vector store loaded successfully.")
                return vector_store
            except Exception as e:
                logger.error(f"Failed to load cached vector store: {e}")

        logger.info("Building new FAISS vector store from database...")
        with self.app.app_context():
            try:
                books = db.session.query(Book).limit(300).all()
                print(f"Books found: {books}")
                if not books:
                    logger.warning("No books found in database. Creating empty vector store.")
                    return FAISS.from_texts(["placeholder empty library"], embedding=self.embeddings)
                    
            except Exception as e:
                logger.error(f"Failed to query books from database: {e}")
                return FAISS.from_texts(["Error accessing library database"], embedding=self.embeddings)

            docs = []
            for book in books:
                doc = self.book_to_document(book)
                docs.append(doc)

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(docs)
        vector_store = FAISS.from_documents(chunks, embedding=self.embeddings)

        try:
            os.makedirs(cache_path, exist_ok=True)
            vector_store.save_local(cache_path)
            logger.info(f"Vector store cached to {cache_path}.")
        except Exception as e:
            logger.error(f"Failed to cache vector store: {e}")

        return vector_store

    def create_graph(self):
        @tool(response_format="content_and_artifact")
        def retrieve(query: str):
            """Retrieve information related to a query."""
            retrieved_docs = self.vector_store.similarity_search(query, k=3)
            books = []
            for doc in retrieved_docs:
                book_info = {
                    "id": 0,
                    "title": "Unknown",
                    "author": "Unknown",
                    "category": "Unknown",
                    "description": "No description",
                    "summary": "No summary",
                    "rating": 0.0,
                    "borrow_count": 0,
                    "total_books": 0,
                    "available_books": 0,
                    "featured_book": False,
                    "cover_url": None
                }
                lines = doc.page_content.split("\n")
                for line in lines:
                    line = line.strip()
                    if line.startswith("Title: "):
                        book_info["title"] = line.replace("Title: ", "").strip()
                    elif line.startswith("Author: "):
                        book_info["author"] = line.replace("Author: ", "").strip()
                    elif line.startswith("Category: "):
                        book_info["category"] = line.replace("Category: ", "").strip()
                    elif line.startswith("Description: "):
                        book_info["description"] = line.replace("Description: ", "").strip()
                    elif line.startswith("Summary: "):
                        book_info["summary"] = line.replace("Summary: ", "").strip()
                    elif line.startswith("Rating: "):
                        book_info["rating"] = float(line.replace("Rating: ", "").strip())
                    elif line.startswith("Borrow Count: "):
                        book_info["borrow_count"] = int(line.replace("Borrow Count: ", "").strip())
                    elif line.startswith("Total Books: "):
                        book_info["total_books"] = int(line.replace("Total Books: ", "").strip())
                    elif line.startswith("Available Books: "):
                        book_info["available_books"] = int(line.replace("Available Books: ", "").strip())
                    elif line.startswith("Featured Book: "):
                        book_info["featured_book"] = line.replace("Featured Book: ", "").strip().lower() == "true"
                    elif line.startswith("Cover URL: "):
                        book_info["cover_url"] = line.replace("Cover URL: ", "").strip()
                books.append(book_info)
            serialized = "\n\n".join(
                (f"Title: {doc.metadata['title']}\nContent: {doc.page_content}")
                for doc in retrieved_docs
            )
            return serialized, books

        def query_or_respond(state: MessagesState):
            llm_with_tools = self.llm.bind_tools([retrieve])
            response = llm_with_tools.invoke(state["messages"])
            return {"messages": [response]}

        def generate(state: MessagesState):
            try:
                tool_messages = [m for m in state["messages"] if m.type == "tool"]
                docs_content = "\n\n".join(msg.content for msg in tool_messages if hasattr(msg, "content"))

                system_message = SystemMessage(
                    content=(
                        "You are a library assistant. Answer the user's query concisely.\n\n"
                        "EXTREMELY IMPORTANT: Do NOT include ANY book details in your 'answer' field. "
                        "Your answer should only briefly mention that you have some recommendations, like 'Here are some fiction books you might enjoy:' "
                        "but DO NOT list any specific books, titles, authors or descriptions in the answer field.\n\n"
                        "All book details should ONLY go into the recommended_books structured field. "
                        "Generate a relevant follow-up question in the follow_up_question field.\n\n"
                        f"Book Context:\n{docs_content}"
                    )
                )

                convo = [
                    msg for msg in state["messages"]
                    if msg.type in ("human", "system") or (msg.type == "ai" and not msg.tool_calls)
                ]

                prompt = [system_message] + convo
                structured_llm = self.llm.with_structured_output(ChatResponse)
                response = structured_llm.invoke(prompt)

                logger.info(f"Recommended books: {response.recommended_books}")
                logger.info(f"Follow-up question: {response.follow_up_question}")

                return {
                    "messages": [AIMessage(content=response.answer, additional_kwargs={
                        "follow_up_question": response.follow_up_question,
                        "recommended_books": response.recommended_books
                    })]
                }
            except Exception as e:
                logger.error(f"Error in generate: {e}")
                return {
                    "messages": [AIMessage(content="Sorry, I couldn't process your request.")]
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

    def chat_with_user(self, user_input: str, thread_id : str) -> ChatResponse:
        config = {"configurable": {"thread_id": thread_id}}
        message = {"messages": [HumanMessage(content=user_input)]}

        final_response = None

        for step in self.graph.stream(message, stream_mode="values", config=config):
            last_message = step["messages"][-1]
            if last_message.type == "ai":
                recommended_books = last_message.additional_kwargs.get("recommended_books", None)
                if recommended_books and not isinstance(recommended_books[0], BookRecommendation):
                    recommended_books = [BookRecommendation(**book) for book in recommended_books]
                final_response = ChatResponse(
                    answer=last_message.content,
                    follow_up_question=last_message.additional_kwargs.get("follow_up_question", ""),
                    recommended_books=recommended_books
                )

        if not final_response:
            final_response = ChatResponse(
                answer="Sorry, I couldn't process your request.",
                follow_up_question="Can I help you with another query?",
                recommended_books=None
            )

        return final_response.model_dump_json(indent=2)
    
    
    
    