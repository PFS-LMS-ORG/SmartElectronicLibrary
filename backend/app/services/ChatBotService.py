import logging
import random

from app import db
from app.model import ChatMessage

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class ChatbotService:
    
    # Dummy book recommendations by language
    BOOK_RECOMMENDATIONS = {
        "en": [
            "I'd recommend 'To Kill a Mockingbird' by Harper Lee. It's a classic that explores themes of racial injustice and moral growth.",
            "For fantasy lovers, 'The Name of the Wind' by Patrick Rothfuss is an excellent choice with its rich world-building and compelling characters.",
            "If you enjoy science fiction, try 'Dune' by Frank Herbert. It's considered one of the greatest sci-fi novels of all time.",
            "For a modern thriller, 'Gone Girl' by Gillian Flynn keeps readers on the edge of their seats with its unexpected twists.",
            "If you're interested in non-fiction, 'Sapiens' by Yuval Noah Harari offers fascinating insights into human history."
        ],
        "fr": [
            "Je vous recommande 'L'Étranger' d'Albert Camus. C'est un classique de la littérature française qui explore l'absurdité de la vie.",
            "Pour les amateurs de fantasy, 'La Horde du Contrevent' d'Alain Damasio est un excellent choix avec son univers riche et ses personnages fascinants.",
            "Si vous aimez la science-fiction, essayez 'Les Particules élémentaires' de Michel Houellebecq, une œuvre provocatrice et visionnaire.",
            "Pour un thriller moderne, 'Au revoir là-haut' de Pierre Lemaitre est captivant avec son intrigue bien construite.",
            "Si vous êtes intéressé par les essais, 'Pensées pour moi-même' de Marc Aurèle offre des réflexions intemporelles sur la vie et la philosophie."
        ],
        "ar": [
            "أنصحك بقراءة 'ألف ليلة وليلة'، وهي مجموعة من القصص الشعبية التي تعتبر من كلاسيكيات الأدب العربي.",
            "إذا كنت تحب الروايات الحديثة، جرب 'عمارة يعقوبيان' لعلاء الأسواني، وهي رواية تصور مصر المعاصرة بطريقة ملفتة.",
            "للمهتمين بالشعر، مجموعة 'الأعمال الكاملة' لمحمود درويش تقدم تجربة شعرية فريدة وعميقة.",
            "رواية 'موسم الهجرة إلى الشمال' للطيب صالح تعتبر من أهم الروايات العربية في القرن العشرين.",
            "إذا كنت مهتمًا بالفلسفة، كتاب 'تهافت التهافت' لابن رشد يقدم نقاشًا فلسفيًا عميقًا حول قضايا الوجود والمعرفة."
        ]
    }
    
    # Dummy library information responses by language
    LIBRARY_INFO = {
        "en": [
            "Our library is open Monday through Friday from 9 AM to 8 PM, and weekends from 10 AM to 6 PM.",
            "We have over 10,000 books in our collection, covering genres from fiction to academic textbooks.",
            "You can borrow up to 5 books at a time for a period of 14 days. Renewals are available if no one else has requested the book.",
            "We offer free WiFi, study spaces, and computer access to all library members.",
            "Our membership is free for all residents. Just bring a valid ID and proof of address to register."
        ],
        "fr": [
            "Notre bibliothèque est ouverte du lundi au vendredi de 9h à 20h, et les week-ends de 10h à 18h.",
            "Nous avons plus de 10 000 livres dans notre collection, couvrant des genres allant de la fiction aux manuels académiques.",
            "Vous pouvez emprunter jusqu'à 5 livres à la fois pour une période de 14 jours. Les renouvellements sont possibles si personne d'autre n'a demandé le livre.",
            "Nous offrons le WiFi gratuit, des espaces d'étude et l'accès à des ordinateurs à tous les membres de la bibliothèque.",
            "Notre adhésion est gratuite pour tous les résidents. Apportez simplement une pièce d'identité valide et un justificatif de domicile pour vous inscrire."
        ],
        "ar": [
            "مكتبتنا مفتوحة من الاثنين إلى الجمعة من الساعة 9 صباحًا حتى 8 مساءً، وفي عطلات نهاية الأسبوع من الساعة 10 صباحًا حتى 6 مساءً.",
            "لدينا أكثر من 10000 كتاب في مجموعتنا، تغطي مجالات متنوعة من الروايات إلى الكتب الدراسية الأكاديمية.",
            "يمكنك استعارة ما يصل إلى 5 كتب في المرة الواحدة لمدة 14 يومًا. يمكن تجديد الاستعارة إذا لم يطلب أحد الكتاب.",
            "نوفر خدمة الواي فاي المجانية ومساحات للدراسة وإمكانية استخدام أجهزة الكمبيوتر لجميع أعضاء المكتبة.",
            "العضوية مجانية لجميع المقيمين. ما عليك سوى إحضار بطاقة هوية سارية المفعول وإثبات عنوان للتسجيل."
        ]
    }
    
    # Dummy reading suggestions by language
    READING_SUGGESTIONS = {
        "en": [
            "For better comprehension, try reading in a quiet environment without distractions.",
            "Reading before bed can help improve sleep quality, but use a physical book rather than an e-reader for better results.",
            "Join a book club to discover new books and engage in meaningful discussions about your reading.",
            "Setting aside specific time each day for reading can help establish a beneficial habit.",
            "Try the Pomodoro technique: read for 25 minutes, then take a 5-minute break to maintain focus and retention."
        ],
        "fr": [
            "Pour une meilleure compréhension, essayez de lire dans un environnement calme et sans distractions.",
            "Lire avant de dormir peut améliorer la qualité du sommeil, mais utilisez un livre physique plutôt qu'une liseuse pour de meilleurs résultats.",
            "Rejoignez un club de lecture pour découvrir de nouveaux livres et participer à des discussions enrichissantes sur vos lectures.",
            "Réserver un moment spécifique chaque jour pour la lecture peut vous aider à établir une habitude bénéfique.",
            "Essayez la technique Pomodoro : lisez pendant 25 minutes, puis prenez une pause de 5 minutes pour maintenir la concentration et la rétention."
        ],
        "ar": [
            "للحصول على فهم أفضل، حاول القراءة في بيئة هادئة وخالية من المشتتات.",
            "القراءة قبل النوم يمكن أن تساعد في تحسين جودة النوم، ولكن استخدم كتابًا ورقيًا بدلاً من القارئ الإلكتروني للحصول على نتائج أفضل.",
            "انضم إلى نادي كتاب لاكتشاف كتب جديدة والمشاركة في مناقشات مفيدة حول قراءاتك.",
            "تخصيص وقت محدد كل يوم للقراءة يمكن أن يساعد في تأسيس عادة مفيدة.",
            "جرب تقنية بومودورو: اقرأ لمدة 25 دقيقة، ثم خذ استراحة لمدة 5 دقائق للحفاظ على التركيز والاستيعاب."
        ]
    }
    
    # General responses for unrecognized queries
    GENERAL_RESPONSES = {
        "en": [
            "I'm sorry, I don't have information about that specific topic. Is there something else I can help you with?",
            "That's an interesting question! While I don't have a specific answer, I'd be happy to discuss other library-related topics.",
            "I'm not sure about that, but I can help you find books, answer questions about our library, or provide reading suggestions.",
            "I don't have that information in my knowledge base. Would you like me to help you with book recommendations instead?",
            "I'm still learning and don't have an answer for that query. Can I assist you with something else related to our library or books?"
        ],
        "fr": [
            "Je suis désolé, je n'ai pas d'informations sur ce sujet précis. Y a-t-il autre chose avec laquelle je peux vous aider ?",
            "C'est une question intéressante ! Bien que je n'aie pas de réponse spécifique, je serais heureux de discuter d'autres sujets liés à la bibliothèque.",
            "Je ne suis pas sûr de cela, mais je peux vous aider à trouver des livres, répondre à des questions sur notre bibliothèque ou vous donner des suggestions de lecture.",
            "Je n'ai pas cette information dans ma base de connaissances. Souhaitez-vous que je vous aide avec des recommandations de livres à la place ?",
            "Je suis encore en apprentissage et je n'ai pas de réponse à cette question. Puis-je vous aider avec autre chose en rapport avec notre bibliothèque ou nos livres ?"
        ],
        "ar": [
            "آسف، ليس لدي معلومات حول هذا الموضوع المحدد. هل هناك شيء آخر يمكنني مساعدتك فيه؟",
            "هذا سؤال مثير للاهتمام! على الرغم من أنني لا أملك إجابة محددة، إلا أنني سأكون سعيدًا بمناقشة مواضيع أخرى متعلقة بالمكتبة.",
            "لست متأكدًا من ذلك، لكن يمكنني مساعدتك في العثور على كتب، أو الإجابة على أسئلة حول مكتبتنا، أو تقديم اقتراحات للقراءة.",
            "ليس لدي هذه المعلومات في قاعدة معرفتي. هل ترغب في أن أساعدك في توصيات الكتب بدلاً من ذلك؟",
            "ما زلت أتعلم وليس لدي إجابة لهذا الاستفسار. هل يمكنني مساعدتك في شيء آخر متعلق بمكتبتنا أو الكتب؟"
        ]
    }
    
    @staticmethod
    def get_chatbot_response(user_id, message, language='en'):
        """
        Generate a response to the user's message based on the content and language.
        For now, this uses predefined responses based on keywords.
        
        Args:
            user_id (int): The ID of the user sending the message
            message (str): The user's message
            language (str): The language code (en, fr, ar)
            
        Returns:
            str: The chatbot's response
        """
        try:
            # Normalize language code
            language = language.lower()[:2]
            if language not in ['en', 'fr', 'ar']:
                language = 'en'  # Default to English if unsupported language
            
            message_lower = message.lower()
            
            # Check for keywords to determine response category
            if any(keyword in message_lower for keyword in ['recommend', 'suggestion', 'book', 'read', 'author', 'novel', 'fiction', 'non-fiction']):
                responses = ChatbotService.BOOK_RECOMMENDATIONS.get(language, ChatbotService.BOOK_RECOMMENDATIONS['en'])
                response = random.choice(responses)
            elif any(keyword in message_lower for keyword in ['library', 'hours', 'open', 'close', 'membership', 'borrow', 'return']):
                responses = ChatbotService.LIBRARY_INFO.get(language, ChatbotService.LIBRARY_INFO['en'])
                response = random.choice(responses)
            elif any(keyword in message_lower for keyword in ['how to read', 'reading tips', 'better reading', 'comprehension', 'focus', 'concentration']):
                responses = ChatbotService.READING_SUGGESTIONS.get(language, ChatbotService.READING_SUGGESTIONS['en'])
                response = random.choice(responses)
            else:
                # General response for unrecognized queries
                responses = ChatbotService.GENERAL_RESPONSES.get(language, ChatbotService.GENERAL_RESPONSES['en'])
                response = random.choice(responses)
            
            # Store the message and response in the database
            try:
                new_chat = ChatMessage(
                    user_id=user_id,
                    message=message,
                    response=response,
                    language=language
                )
                db.session.add(new_chat)
                db.session.commit()
                logger.debug(f"Saved chat message for user {user_id}")
            except Exception as e:
                logger.error(f"Error saving chat message: {str(e)}")
                db.session.rollback()
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating chatbot response: {str(e)}")
            # Return a fallback response in the requested language
            fallback_responses = {
                'en': "I'm sorry, I encountered an issue processing your request. Please try again.",
                'fr': "Je suis désolé, j'ai rencontré un problème lors du traitement de votre demande. Veuillez réessayer.",
                'ar': "آسف، لقد واجهت مشكلة في معالجة طلبك. يرجى المحاولة مرة أخرى."
            }
            return fallback_responses.get(language, fallback_responses['en'])
    
    @staticmethod
    def get_user_chat_history(user_id, limit=50):
        """
        Get the chat history for a specific user.
        
        Args:
            user_id (int): The ID of the user
            limit (int): Maximum number of messages to retrieve
            
        Returns:
            list: List of chat message dictionaries
        """
        try:
            chat_history = ChatMessage.query.filter_by(user_id=user_id).order_by(
                ChatMessage.created_at.desc()
            ).limit(limit).all()
            
            return [chat.to_dict() for chat in chat_history]
        except Exception as e:
            logger.error(f"Error retrieving chat history: {str(e)}")
            return []
    
    @staticmethod
    def clear_user_chat_history(user_id):
        """
        Clear the chat history for a specific user.
        
        Args:
            user_id (int): The ID of the user
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Delete all chat messages for the user
            ChatMessage.query.filter_by(user_id=user_id).delete()
            db.session.commit()
            logger.debug(f"Cleared chat history for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing chat history: {str(e)}")
            db.session.rollback()
            return False, 'Error clearing chat history'