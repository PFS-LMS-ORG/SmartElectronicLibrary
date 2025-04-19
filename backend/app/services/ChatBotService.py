# app/services/ChatBotService.py

import logging
import json
import os
import re
from typing import List, Dict, Any
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings  # Updated to use langchain_huggingface
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from langgraph.graph import StateGraph, END, MessagesState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode, tools_condition
from langchain.chat_models import init_chat_model
from app import db
from app.model.ChatMessage import ChatMessage
from app.model.Book import Book
from app.model.RentalRequest import RentalRequest
from sqlalchemy import func
from langchain.memory import ConversationBufferMemory
import uuid
from datetime import datetime, timedelta



# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ChatBotService:
    _instance = None
    _conversation_memories = {}  # Store conversation memories by user_id
    _last_activity = {}  # Track when each user last interacted with the chatbot

    def __new__(cls):
        """Implement the Singleton pattern to ensure only one instance of ChatBotService exists."""
        if cls._instance is None:
            cls._instance = super(ChatBotService, cls).__new__(cls)
            # Initialize the instance only once
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the LLM and LangGraph workflow once during instance creation."""
        # Check for OpenAI API key
        if not os.environ.get("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY environment variable is not set.")
            raise ValueError("OPENAI_API_KEY environment variable is not set. Please set it to use the chatbot.")
        
        # Initialize LLM
        try:
            self.llm = init_chat_model("gpt-4o-mini", model_provider="openai")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {str(e)}")
            raise
        
        # Load vector store initially
        try:
            self.vector_store = self._load_vector_store()
        except Exception as e:
            logger.error(f"Failed to load vector store: {str(e)}")
            raise
        
        # Create LangGraph workflow
        try:
            self.graph = self._create_graph()
        except Exception as e:
            logger.error(f"Failed to create LangGraph workflow: {str(e)}")
            raise
        
        # Log LangSmith setup
        if os.environ.get("LANGSMITH_TRACING") == "true":
            if not os.environ.get("LANGSMITH_API_KEY"):
                logger.warning("LANGSMITH_TRACING is enabled but LANGSMITH_API_KEY is not set. Tracing will be disabled.")
            else:
                logger.info("LangSmith tracing is enabled.")
        else:
            logger.info("LangSmith tracing is disabled.")

    def _load_vector_store(self) -> FAISS:
        """Load book data from the database into a FAISS vector store."""
        logger.debug("Loading book data into FAISS vector store...")
        books = db.session.query(Book).all()
        if not books:
            logger.warning("No books found in the database. Vector store will be empty.")
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            return FAISS.from_texts(["Empty"], embedding=embeddings)

        docs = []
        for book in books:
            author_names = [author.name for author in book.authors] if book.authors else ["Unknown Author"]
            category_names = [category.name for category in book.categories] if book.categories else ["Uncategorized"]
            
            content = f"""
            Title: {book.title or 'Untitled'}
            Author: {', '.join(author_names)}
            Category: {', '.join(category_names)}
            Description: {book.description or 'No description available'}
            Summary: {book.summary or 'No summary available'}
            Rating: {book.rating or 0.0}
            Borrow Count: {book.borrow_count or 0}
            Total Books: {book.total_books or 0}
            Available Books: {book.available_books or 0}
            Featured Book: {book.featured_book or False}
            Cover URL: {book.cover_url or '/default_cover.jpg'}
            Book ID: {book.id}
            """
            docs.append(Document(page_content=content.strip(), metadata={"title": book.title or 'Untitled', "book_id": book.id}))
        
        logger.debug(f"Loaded {len(docs)} books into documents for vector store.")
        
        if not docs:
            logger.warning("No documents created from books. Vector store will be empty.")
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            return FAISS.from_texts(["Empty"], embedding=embeddings)

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(docs)
        try:
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        except Exception as e:
            logger.error(f"Failed to initialize HuggingFaceEmbeddings: {str(e)}")
            raise
        try:
            vector_store = FAISS.from_documents(chunks, embedding=embeddings)
        except Exception as e:
            logger.error(f"Failed to create FAISS vector store: {str(e)}")
            raise
        logger.debug("FAISS vector store created successfully.")
        return vector_store

    def refresh_vector_store(self):
        """Manually refresh the FAISS vector store if the database changes."""
        logger.debug("Refreshing FAISS vector store...")
        try:
            self.vector_store = self._load_vector_store()
            logger.info("FAISS vector store refreshed successfully.")
        except Exception as e:
            logger.error(f"Failed to refresh FAISS vector store: {str(e)}")
            raise

    @tool(response_format="content_and_artifact")
    def retrieve(self, query: str):
        """Retrieve information related to a query."""
        logger.debug(f"Retrieving documents for query: {query}")
        retrieved_docs = self.vector_store.similarity_search(query, k=3)
        serialized = "\n\n".join(
            (f"Source: {doc.metadata}\nContent: {doc.page_content}")
            for doc in retrieved_docs
        )
        logger.debug(f"Retrieved {len(retrieved_docs)} documents.")
        return serialized, retrieved_docs


    def _validate_and_filter_response(self, response_content, book_recommendations, retrieved_docs, language="en"):
        """Validate that the response only contains information about books in our library."""
        logger.debug("Validating and filtering chatbot response")
        
        # Get all book IDs from the retrieved context
        valid_book_ids = []
        for doc in retrieved_docs:
            if "book_id" in doc.metadata:
                valid_book_ids.append(doc.metadata["book_id"])
        
        # Filter book recommendations to only include books from our library
        filtered_recommendations = []
        for book in book_recommendations:
            if book["book_id"] in valid_book_ids:
                filtered_recommendations.append(book)
            else:
                logger.warning(f"Removed invalid book recommendation with ID: {book['book_id']}")
        
        # Check if the response contains non-library content
        off_topic_responses = {
            "en": "I'm AYO+, and I can only help with questions about our library collection, book recommendations, or library services. Please ask me about our books, authors, or how I can help you find reading materials.",
            "fr": "Je suis AYO+, et je ne peux répondre qu'aux questions concernant notre collection de bibliothèque, les recommandations de livres ou les services de bibliothèque. Veuillez me poser des questions sur nos livres, nos auteurs ou comment je peux vous aider à trouver des documents de lecture.",
            "ar": "أنا AYO+، ويمكنني فقط المساعدة في الأسئلة المتعلقة بمجموعة مكتبتنا، أو توصيات الكتب، أو خدمات المكتبة. يرجى طرح أسئلة حول كتبنا، أو المؤلفين، أو كيف يمكنني مساعدتك في العثور على مواد القراءة."
        }
        
        # Check for common non-library topics in the response
        non_library_keywords = [
            "weather", "politics", "sports", "movie", "film", "tv show", "television",
            "news", "music", "song", "restaurant", "recipe", "food", "diet", "exercise",
            "workout", "game", "travel", "stock", "investment", "crypto"
        ]
        
        if any(keyword in response_content.lower() for keyword in non_library_keywords):
            logger.warning("Response contains non-library content, replacing with standard message")
            return off_topic_responses.get(language, off_topic_responses["en"]), filtered_recommendations
        
        # Ensure the chatbot identifies itself as AYO+
        name_mentions = {
            "en": ["I am AYO+", "my name is AYO+", "I'm AYO+"],
            "fr": ["Je suis AYO+", "Mon nom est AYO+"],
            "ar": ["أنا AYO+", "اسمي AYO+"]
        }
        
        # If the user asks about the chatbot's name but the response doesn't include the correct name
        name_questions = ["who are you", "what's your name", "what is your name", "your name", "chatbot name"]
        response_lower = response_content.lower()
        if any(question in response_lower for question in name_questions):
            if not any(name in response_content for name in name_mentions.get(language, name_mentions["en"])):
                name_response = {
                    "en": "I am AYO+, your library assistant. I can help you find books, authors, and answer questions about our library services.",
                    "fr": "Je suis AYO+, votre assistant de bibliothèque. Je peux vous aider à trouver des livres, des auteurs et répondre aux questions sur les services de notre bibliothèque.",
                    "ar": "أنا AYO+، مساعد المكتبة الخاص بك. يمكنني مساعدتك في العثور على الكتب والمؤلفين والإجابة على الأسئلة حول خدمات مكتبتنا."
                }
                return name_response.get(language, name_response["en"]), filtered_recommendations
        
        return response_content, filtered_recommendations

    def _get_user_reading_history(self, user_id: int) -> str:
        """Fetch user's reading history to personalize recommendations."""
        logger.debug(f"Fetching reading history for user {user_id}")
        rental_requests = db.session.query(RentalRequest).filter(
            RentalRequest.user_id == user_id,
            RentalRequest.status == "approved"
        ).all()
        if not rental_requests:
            logger.debug(f"No reading history found for user {user_id}")
            return "The user has no reading history yet."
        
        book_ids = [rr.book_id for rr in rental_requests]
        books = db.session.query(Book).filter(Book.id.in_(book_ids)).all()
        history = "\n".join(
            f"Title: {book.title or 'Untitled'}, Category: {', '.join(category.name for category in book.categories) if book.categories else 'Uncategorized'}"
            for book in books
        )
        logger.debug(f"Reading history for user {user_id}: {history}")
        return f"User's reading history:\n{history}"

    def _create_graph(self):
        def query_or_respond(state: MessagesState):
            logger.debug("Entering query_or_respond node")
            llm_with_tools = self.llm.bind_tools([self.retrieve])
            response = llm_with_tools.invoke(state["messages"])
            logger.debug("Query or respond completed")
            return {"messages": [response]}

        def generate(state: MessagesState):
            logger.debug("Entering generate node")
            user_id = state.get("user_id", 0)
            language = state.get("language", "en")
            
            # Fetch user reading history for personalization
            user_history = self._get_user_reading_history(user_id)
            
            # Get retrieved documents
            tool_messages = [m for m in state["messages"] if m.type == "tool"]
            retrieved_docs = []
            docs_content = ""
            for msg in tool_messages:
                if hasattr(msg, "content"):
                    docs_content += msg.content + "\n\n"
                if hasattr(msg, "artifact"):
                    retrieved_docs.extend(msg.artifact)
            
            # Define system prompts with strict instructions
            system_prompts = {
                "en": (
                    "You are AYO+, a specialized library assistant. "
                    "IMPORTANT: You can ONLY discuss and recommend books that are explicitly mentioned in the retrieved context. "
                    "NEVER recommend books that are not in the retrieved context. "
                    "ONLY answer questions related to books, authors, categories, or library services. "
                    "If a user asks about anything not related to the library or its books, politely inform them "
                    "that you can only assist with library-related questions. "
                    "For book recommendation requests, suggest up to 3 books that are present in the retrieved context. "
                    "Format each recommendation as:\n"
                    "Title: [Title]\n"
                    "Author: [Author]\n"
                    "Category: [Category]\n"
                    "Rating: [Rating]\n"
                    "Book ID: [Book ID]\n"
                    "Cover URL: [Cover URL]\n"
                    "Reason: [Reason]\n"
                    "For borrowing requests, confirm the book's availability and indicate that a rental request will be created. "
                    "Keep responses concise and professional, with a maximum of 5 sentences."
                    f"\n\nUser History:\n{user_history}\n\nRetrieved Context:\n{docs_content}"
                ),
                # [French and Arabic prompts would be here]
            }

            system_message = SystemMessage(
                content=system_prompts.get(language, system_prompts["en"])
            )

            convo = [
                msg for msg in state["messages"]
                if msg.type in ("human", "system") or (msg.type == "ai" and not msg.tool_calls)
            ]

            # Check if the user's query is library-related
            user_message = convo[-1].content.lower() if convo and convo[-1].type == "human" else ""
            non_library_keywords = [
                "weather", "politics", "sports", "movie", "film", "tv show", "television",
                "news", "music", "song", "restaurant", "recipe", "food", "diet", "exercise",
                "workout", "game", "travel", "stock", "investment", "crypto"
            ]
            
            # If the query contains clear non-library topics, provide a standard response
            if any(keyword in user_message for keyword in non_library_keywords):
                off_topic_responses = {
                    "en": "I'm AYO+, and I can only help with questions about our library collection, book recommendations, or library services. Please ask me about our books, authors, or how I can help you find reading materials.",
                    "fr": "Je suis AYO+, et je ne peux répondre qu'aux questions concernant notre collection de bibliothèque, les recommandations de livres ou les services de bibliothèque. Veuillez me poser des questions sur nos livres, nos auteurs ou comment je peux vous aider à trouver des documents de lecture.",
                    "ar": "أنا AYO+، ويمكنني فقط المساعدة في الأسئلة المتعلقة بمجموعة مكتبتنا، أو توصيات الكتب، أو خدمات المكتبة. يرجى طرح أسئلة حول كتبنا، أو المؤلفين، أو كيف يمكنني مساعدتك في العثور على مواد القراءة."
                }
                return {
                    "messages": [AIMessage(content=off_topic_responses.get(language, off_topic_responses["en"]))],
                    "book_recommendations": []
                }

            prompt = [system_message] + convo
            try:
                response = self.llm.invoke(prompt)
            except Exception as e:
                logger.error(f"LLM invocation failed: {str(e)}")
                response = AIMessage(content="I'm sorry, I encountered an error while processing your request. Please try again.")
                return {
                    "messages": [response],
                    "book_recommendations": []
                }
            
            # Parse response for book recommendations with robust error handling
            book_recommendations = []
            if "Title:" in response.content:
                lines = response.content.split("\n")
                current_book = {}
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        if line.startswith("Title:"):
                            if current_book:
                                required_fields = ["title", "author", "category", "rating", "book_id", "cover_url", "reason"]
                                if all(field in current_book for field in required_fields):
                                    # Verify the book exists in the database
                                    book = db.session.query(Book).filter(Book.id == current_book["book_id"]).first()
                                    if book:
                                        book_recommendations.append(current_book)
                                    else:
                                        logger.warning(f"Book ID {current_book['book_id']} not found in database. Skipping recommendation.")
                                else:
                                    logger.warning(f"Skipping incomplete book recommendation: {current_book}")
                            current_book = {"title": line.replace("Title: ", "").strip()}
                        # [Rest of the parsing code would be here]
                    except Exception as e:
                        logger.error(f"Error parsing book recommendation line '{line}': {str(e)}")
                        continue
                # [Handle the last book record]
            
            # Validate and filter the response to ensure it's library-focused
            filtered_response, filtered_recommendations = self._validate_and_filter_response(
                response.content, book_recommendations, retrieved_docs, language
            )
            
            # [Borrowing logic would be here]
            
            logger.debug("Generate node completed")
            return {
                "messages": [AIMessage(content=filtered_response)],
                "book_recommendations": filtered_recommendations
            }


        builder = StateGraph(MessagesState)
        builder.add_node("query_or_respond", query_or_respond)
        builder.add_node("tools", ToolNode([self.retrieve]))
        builder.add_node("generate", generate)
        builder.set_entry_point("query_or_respond")
        builder.add_conditional_edges("query_or_respond", tools_condition, {END: END, "tools": "tools"})
        builder.add_edge("tools", "generate")
        builder.add_edge("generate", END)
        return builder.compile(checkpointer=MemorySaver())


    # def get_chatbot_response(self, user_id: int, message: str, language: str = "en") -> Dict[str, Any]:
    #     """Generate a response to the user's message."""
    #     logger.debug(f"Generating response for user {user_id}, message: {message}, language: {language}")
        
    #     # Pre-filter obviously non-library questions
    #     non_library_keywords = [
    #         "weather", "politics", "sports", "movie", "film", "tv show", "television",
    #         "news", "music", "song", "restaurant", "recipe", "food", "diet", "exercise",
    #         "workout", "game", "travel", "stock", "investment", "crypto"
    #     ]
        
    #     # If the query contains clear non-library topics, provide a standard response
    #     if any(keyword in message.lower() for keyword in non_library_keywords):
    #         off_topic_responses = {
    #             "en": "I'm AYO+, and I can only help with questions about our library collection, book recommendations, or library services. Please ask me about our books, authors, or how I can help you find reading materials.",
    #             "fr": "Je suis AYO+, et je ne peux répondre qu'aux questions concernant notre collection de bibliothèque, les recommandations de livres ou les services de bibliothèque. Veuillez me poser des questions sur nos livres, nos auteurs ou comment je peux vous aider à trouver des documents de lecture.",
    #             "ar": "أنا AYO+، ويمكنني فقط المساعدة في الأسئلة المتعلقة بمجموعة مكتبتنا، أو توصيات الكتب، أو خدمات المكتبة. يرجى طرح أسئلة حول كتبنا، أو المؤلفين، أو كيف يمكنني مساعدتك في العثور على مواد القراءة."
    #         }
            
    #         # Save to database
    #         try:
    #             new_chat = ChatMessage(
    #                 user_id=user_id,
    #                 message=message,
    #                 response=off_topic_responses.get(language, off_topic_responses["en"]),
    #                 language=language,
    #                 book_recommendations=None
    #             )
    #             db.session.add(new_chat)
    #             db.session.commit()
    #             logger.debug(f"Saved chat message for user {user_id}")
    #         except Exception as e:
    #             logger.error(f"Error saving chat message: {str(e)}")
    #             db.session.rollback()
                
    #         return {
    #             "response": off_topic_responses.get(language, off_topic_responses["en"]),
    #             "book_recommendations": []
    #         }
        
    #     # If question is about chatbot name, give standard response
    #     name_questions = ["who are you", "what's your name", "what is your name", "your name", "chatbot name"]
    #     if any(question in message.lower() for question in name_questions):
    #         name_responses = {
    #             "en": "I am AYO+, your library assistant. I can help you find books, authors, and answer questions about our library services.",
    #             "fr": "Je suis AYO+, votre assistant de bibliothèque. Je peux vous aider à trouver des livres, des auteurs et répondre aux questions sur les services de notre bibliothèque.",
    #             "ar": "أنا AYO+، مساعد المكتبة الخاص بك. يمكنني مساعدتك في العثور على الكتب والمؤلفين والإجابة على الأسئلة حول خدمات مكتبتنا."
    #         }
            
    #         # Save to database
    #         try:
    #             new_chat = ChatMessage(
    #                 user_id=user_id,
    #                 message=message,
    #                 response=name_responses.get(language, name_responses["en"]),
    #                 language=language,
    #                 book_recommendations=None
    #             )
    #             db.session.add(new_chat)
    #             db.session.commit()
    #             logger.debug(f"Saved chat message for user {user_id}")
    #         except Exception as e:
    #             logger.error(f"Error saving chat message: {str(e)}")
    #             db.session.rollback()
                
    #         return {
    #             "response": name_responses.get(language, name_responses["en"]),
    #             "book_recommendations": []
    #         }
        
    #     # Proceed with normal flow for library-related questions
    #     config = {"configurable": {"thread_id": f"user_{user_id}"}, "user_id": user_id, "language": language}
    #     message_input = {"messages": [HumanMessage(content=message)]}

    #     outputs = []
    #     book_recommendations = []
    #     try:
    #         for step in self.graph.stream(message_input, stream_mode="values", config=config):
    #             last_message = step["messages"][-1]
    #             outputs.append(last_message.content)
    #             if "book_recommendations" in step:
    #                 book_recommendations = step["book_recommendations"]
    #     except Exception as e:
    #         logger.error(f"Error in LangGraph workflow: {str(e)}")
    #         return {
    #             "response": "I'm sorry, I encountered an error while processing your request. Please try again.",
    #             "book_recommendations": []
    #         }

    #     # Save to database
    #     try:
    #         new_chat = ChatMessage(
    #             user_id=user_id,
    #             message=message,
    #             response=outputs[-1],
    #             language=language,
    #             book_recommendations=json.dumps(book_recommendations) if book_recommendations else None
    #         )
    #         db.session.add(new_chat)
    #         db.session.commit()
    #         logger.debug(f"Saved chat message for user {user_id}")
    #     except Exception as e:
    #         logger.error(f"Error saving chat message: {str(e)}")
    #         db.session.rollback()

    #     logger.debug("Chatbot response generated successfully")
    #     return {
    #         "response": outputs[-1],
    #         "book_recommendations": book_recommendations
    #     }
    
    @staticmethod
    def get_user_chat_history(user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get the chat history for a specific user."""
        logger.debug(f"Fetching chat history for user {user_id}, limit: {limit}")
        try:
            # Get all chat messages for this user, ordered by creation time
            chat_history = ChatMessage.query.filter_by(user_id=user_id).order_by(
                ChatMessage.created_at.asc()  # Changed to ascending order to get oldest first
            ).limit(limit).all()
            
            # Convert to list of dictionaries
            history = [chat.to_dict() for chat in chat_history]
            
            logger.debug(f"Retrieved {len(history)} chat messages for user {user_id}")
            return history
        except Exception as e:
            logger.error(f"Error retrieving chat history: {str(e)}")
            return []
    
    @staticmethod
    def clear_user_chat_history(user_id: int) -> bool:
        """Clear the chat history for a specific user."""
        logger.debug(f"Clearing chat history for user {user_id}")
        try:
            ChatMessage.query.filter_by(user_id=user_id).delete()
            db.session.commit()
            logger.debug(f"Cleared chat history for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing chat history: {str(e)}")
            db.session.rollback()
            return False
    
    def _cleanup_old_conversations(self, max_age_hours=24):
        """Clean up conversation memories that haven't been used recently."""
        current_time = datetime.now()
        users_to_remove = []
        
        for user_id, last_time in self._last_activity.items():
            if (current_time - last_time).total_seconds() > max_age_hours * 3600:
                users_to_remove.append(user_id)
        
        for user_id in users_to_remove:
            if user_id in self._conversation_memories:
                del self._conversation_memories[user_id]
            del self._last_activity[user_id]
            
        logger.debug(f"Cleaned up {len(users_to_remove)} old conversation memories")
    
    def get_chatbot_response(self, user_id: int, message: str, language: str = "en") -> Dict[str, Any]:
        """Generate a response to the user's message, ensuring book recommendations are structured."""
        logger.debug(f"Generating response for user {user_id}, message: {message}, language: {language}")
        
        try:
            # Get user reading history for personalization
            user_history = self._get_user_reading_history(user_id)
            
            # Directly retrieve relevant book information from our database
            retrieved_docs = self.vector_store.similarity_search(message, k=5)
            docs_content = "\n\n".join(
                (f"Source: {doc.metadata}\nContent: {doc.page_content}")
                for doc in retrieved_docs
            )
            
            # Extract valid book IDs from the retrieved context
            valid_book_ids = []
            for doc in retrieved_docs:
                if "book_id" in doc.metadata:
                    book_id = doc.metadata["book_id"]
                    # Ensure book_id is an integer
                    if isinstance(book_id, str):
                        try:
                            book_id = int(book_id)
                        except ValueError:
                            continue
                    valid_book_ids.append(book_id)
            
            # Define the system prompt with instructions for formatting recommendations
            system_prompts = {
                "en": (
                    "You are AYO+, a specialized library assistant for a library management system. "
                    "Your primary function is to help users with library-related questions and book recommendations. "
                    
                    "Guidelines for your responses:"
                    "\n1. Always identify yourself as AYO+ when asked about your name or identity."
                    "\n2. You can answer simple conversational questions about yourself as AYO+."
                    "\n3. For most queries, focus on library-related topics - books, authors, genres, library services."
                    "\n4. When recommending books, ONLY recommend books that are explicitly mentioned in the retrieved context."
                    "\n5. NEVER make up or recommend books that aren't in the retrieved context or valid book IDs list."
                    
                    "\nIMPORTANT: When recommending books, DO NOT include the book details in your text response. "
                    "Instead, provide a brief introduction about your recommendations, then format each book using the tags below."
                    
                    "\nFor each book recommendation, use EXACTLY this format:"
                    "\nRECOMMENDATION_START"
                    "\ntitle: [Book Title]"
                    "\nauthor: [Author Name]"
                    "\ncategory: [Book Category]"
                    "\nrating: [Rating as number, e.g. 4.5]"
                    "\nbook_id: [Book ID number from retrieved context]"
                    "\ncover_url: [Cover URL from retrieved context]"
                    "\nreason: [Brief reason for recommendation]"
                    "\nRECOMMENDATION_END"
                    
                    "\nNOTE: Do not add comments in any field. For rating, only include the numeric value."
                    "\nIf the user asks about animal books or any specific genre, make sure to recommend relevant books from our library."
                    
                    f"\n\nUser History:\n{user_history}"
                    f"\n\nRetrieved Context:\n{docs_content}"
                    f"\n\nValid Book IDs that you can recommend: {valid_book_ids}"
                ),
                # French and Arabic versions would be here
            }
            
            # Get the appropriate system prompt
            system_prompt = system_prompts.get(language, system_prompts["en"])
            
            # Create messages for the LLM
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=message)
            ]
            
            # Get response from LLM
            try:
                response = self.llm.invoke(messages)
                full_response = response.content
                
                # Extract book recommendations from the response
                raw_recommendations = self._extract_book_recommendations(full_response)
                
                # Validate the recommendations
                valid_recommendations = self._validate_book_recommendations(raw_recommendations, valid_book_ids)
                
                # Clean up the response to remove any recommendation formatting
                clean_response = self._clean_response_text(full_response)
                
                # Log what we found
                logger.debug(f"Extracted {len(raw_recommendations)} recommendations, {len(valid_recommendations)} valid")
                
                # If the message mentions recommendations but none were found, try to fetch some relevant books
                if (("recommend" in clean_response.lower() or "here are" in clean_response.lower()) and 
                        not valid_recommendations and valid_book_ids):
                    
                    logger.debug("Message mentions recommendations but none were found. Fetching fallback recommendations.")
                    
                    # Get up to 3 books from the retrieved context
                    fallback_recommendations = []
                    found_books = set()  # To prevent duplicates
                    
                    for book_id in valid_book_ids[:3]:  # Take up to 3 books
                        if book_id in found_books:
                            continue
                            
                        book = db.session.query(Book).filter(Book.id == book_id).first()
                        if book:
                            found_books.add(book_id)
                            
                            # Get category names
                            category_names = [category.name for category in book.categories] if book.categories else ["Uncategorized"]
                            category_text = ", ".join(category_names)
                            
                            # Get author names
                            author_names = [author.name for author in book.authors] if book.authors else ["Unknown Author"]
                            author_text = ", ".join(author_names)
                            
                            fallback_recommendations.append({
                                "title": book.title or "Unknown Title",
                                "author": author_text,
                                "category": category_text,
                                "rating": book.rating or 0.0,
                                "book_id": book_id,
                                "cover_url": book.cover_url or "/default_cover.jpg",
                                "reason": "This book matches your interests"
                            })
                    
                    if fallback_recommendations:
                        valid_recommendations = fallback_recommendations
                        logger.debug(f"Added {len(fallback_recommendations)} fallback recommendations")
                
                # Check for identity questions and ensure AYO+ is mentioned
                identity_keywords = ["your name", "who are you", "call you", "what are you"]
                if any(keyword in message.lower() for keyword in identity_keywords) and "AYO+" not in clean_response:
                    identity_prefixes = {
                        "en": "I am AYO+, your library assistant. ",
                        "fr": "Je suis AYO+, votre assistant de bibliothèque. ",
                        "ar": "أنا AYO+، مساعد المكتبة الخاص بك. "
                    }
                    clean_response = identity_prefixes.get(language, identity_prefixes["en"]) + clean_response
                
                # Save to database
                self._save_chat_message(user_id, message, clean_response, language, valid_recommendations)
                
                # Return the cleaned response and valid recommendations
                return {
                    "response": clean_response,
                    "book_recommendations": valid_recommendations
                }
            except Exception as e:
                logger.error(f"LLM invocation failed: {str(e)}")
                response_content = "I'm sorry, I encountered an error while processing your request. Please try again."
                self._save_chat_message(user_id, message, response_content, language)
                return {
                    "response": response_content,
                    "book_recommendations": []
                }
        
        except Exception as e:
            logger.error(f"Error in chatbot processing: {str(e)}")
            response = "I'm sorry, I encountered an error while processing your request. Please try again."
            self._save_chat_message(user_id, message, response, language)
            return {
                "response": response,
                "book_recommendations": []
            }

    def _extract_book_recommendations(self, response_text: str) -> List[Dict[str, Any]]:
        """Extract book recommendations from the response text using the special format."""
        recommendations = []
        
        # Log the full response for debugging
        logger.debug(f"Extracting recommendations from response text of length: {len(response_text)}")
        
        # Look for recommendation blocks
        pattern = r"RECOMMENDATION_START(.*?)RECOMMENDATION_END"
        recommendation_blocks = re.findall(pattern, response_text, re.DOTALL)
        
        logger.debug(f"Found {len(recommendation_blocks)} recommendation blocks")
        
        # If no blocks found with START/END tags, try looking for title pattern
        if not recommendation_blocks and "title:" in response_text.lower():
            # Try to find book information directly
            titles = re.findall(r"title:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            authors = re.findall(r"author:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            categories = re.findall(r"category:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            ratings = re.findall(r"rating:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            book_ids = re.findall(r"book_id:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            cover_urls = re.findall(r"cover_url:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            reasons = re.findall(r"reason:\s*(.*?)(?:\n|$)", response_text, re.IGNORECASE | re.MULTILINE)
            
            # Take the minimum length to avoid index errors
            count = min(len(titles), len(authors), len(categories), len(ratings), 
                    len(book_ids), len(cover_urls), len(reasons))
            
            logger.debug(f"Found {count} potential books using alternative parsing")
            
            for i in range(count):
                recommendations.append({
                    "title": titles[i].strip(),
                    "author": authors[i].strip(),
                    "category": categories[i].strip(),
                    "rating": ratings[i].strip(),  # Keep as string for now
                    "book_id": book_ids[i].strip(),
                    "cover_url": cover_urls[i].strip(),
                    "reason": reasons[i].strip()
                })
        
        # Process the blocks if found
        for block in recommendation_blocks:
            recommendation = {}
            # Extract fields
            for field in ["title", "author", "category", "rating", "book_id", "cover_url", "reason"]:
                match = re.search(rf"{field}:\s*(.*?)(?:\n|$)", block, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    recommendation[field] = value
                else:
                    logger.debug(f"Field '{field}' not found in recommendation block")
            
            if recommendation:
                recommendations.append(recommendation)
                logger.debug(f"Extracted recommendation: {recommendation}")
            else:
                logger.debug("Empty recommendation after parsing block")
        
        return recommendations

    def _validate_book_recommendations(self, recommendations: List[Dict[str, Any]], valid_book_ids: List[int]) -> List[Dict[str, Any]]:
        """Validate and convert extracted book recommendations."""
        valid_recommendations = []
        
        for rec in recommendations:
            try:
                # Extract book_id
                book_id_str = rec.get("book_id", "0")
                # Remove any comments or non-numeric parts
                book_id_str = re.sub(r'#.*$', '', book_id_str).strip()
                book_id = int(book_id_str)
                
                # Check if the book exists and is in valid_book_ids
                book = db.session.query(Book).filter(Book.id == book_id).first()
                if not book or (valid_book_ids and book_id not in valid_book_ids):
                    logger.warning(f"Book ID {book_id} not found in database or not in retrieved context")
                    continue
                    
                # Create a validated recommendation
                validated_rec = {
                    "title": rec.get("title", "Unknown Title"),
                    "author": rec.get("author", "Unknown Author"),
                    "category": rec.get("category", "Uncategorized"),
                    "book_id": book_id,
                    "cover_url": rec.get("cover_url", "/default_cover.jpg"),
                    "reason": rec.get("reason", "Recommended based on your interests")
                }
                
                # Process rating - handle various formats
                rating_str = rec.get("rating", "0")
                # Remove any comments or non-numeric parts
                rating_str = re.sub(r'#.*$', '', rating_str).strip()
                try:
                    validated_rec["rating"] = float(rating_str)
                except ValueError:
                    # If we can't convert to float, use the book's actual rating from database
                    validated_rec["rating"] = book.rating or 0.0
                    logger.debug(f"Using book's actual rating {validated_rec['rating']} instead of '{rating_str}'")
                
                valid_recommendations.append(validated_rec)
                
            except Exception as e:
                logger.warning(f"Invalid book recommendation: {str(e)}")
                continue
                
        return valid_recommendations
    
    def _clean_response_text(self, response_text: str) -> str:
        """Remove recommendation blocks and any formatting instructions from the response."""
        # Remove recommendation blocks
        cleaned_text = re.sub(r"RECOMMENDATION_START.*?RECOMMENDATION_END", "", response_text, flags=re.DOTALL)
        
        # Remove any other formatting instructions
        cleaned_text = re.sub(r"When recommending books, use the following format.*?recommendations for display\.", "", cleaned_text, flags=re.DOTALL)
        
        # Remove extra whitespace and newlines
        cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text)
        cleaned_text = cleaned_text.strip()
        
        return cleaned_text
    
    
    
    # Add this method to clear a user's conversation memory
    def clear_conversation_memory(self, user_id: int):
        """Clear the conversation memory for a specific user."""
        if user_id in self._conversation_memories:
            del self._conversation_memories[user_id]
        logger.debug(f"Cleared conversation memory for user {user_id}")
        return True
    
    def _save_chat_message(self, user_id, message, response, language, book_recommendations=None):
        """Helper method to save chat messages to the database."""
        try:
            new_chat = ChatMessage(
                user_id=user_id,
                message=message,
                response=response,
                language=language,
                book_recommendations=json.dumps(book_recommendations) if book_recommendations else None
            )
            db.session.add(new_chat)
            db.session.commit()
            logger.debug(f"Saved chat message for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            db.session.rollback()



