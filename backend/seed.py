from app import create_app
from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from app.model.User import User
from app.model.Rental import Rental

app = create_app()

with app.app_context():
    # حذف جميع البيانات القديمة
    db.drop_all()
    db.create_all()

    # المؤلفون
    rowling = Author(name="J.K. Rowling")
    tolkien = Author(name="J.R.R. Tolkien")
    dan_brown = Author(name="Dan Brown")
    alex_michaelides = Author(name="Alex Michaelides")
    stephen_king = Author(name="Stephen King")
    jessica_barry = Author(name="Jessica Barry")
    erich_gamma = Author(name="Erich Gamma")
    richard_helm = Author(name="Richard Helm")
    ralph_johnson = Author(name="Ralph Johnson")
    john_vlissides = Author(name="John Vlissides")

    # التصنيفات
    fantasy = Category(name="Fantasy")
    adventure = Category(name="Adventure")
    thriller = Category(name="Thriller / Mystery")
    psychological = Category(name="Psychological Thriller")
    horror = Category(name="Horror Game")
    suspense = Category(name="Thriller / Suspense")
    software = Category(name="Software Engineering")

    # الكتب مع الحقول الجديدة
    hp = Book(
        title="Harry Potter and the Philosopher's Stone", 
        cover_url="https://image.tmdb.org/t/p/original/lglQFk4opJuoDregOssk0gS16Pg.jpg",
        description="The first book in the Harry Potter series, where Harry discovers his magical heritage.",
        rating=4.9,
        summary="Harry Potter discovers he's a wizard and attends Hogwarts, where he uncovers mysteries surrounding his parents' death.",
        featured_book=True,
    )
    lotr = Book(
        title="The Lord of the Rings", 
        cover_url="https://m.media-amazon.com/images/M/MV5BNTg3NjcxYzgtYjljNC00Y2I2LWE3YmMtOTliZTkwYTE1MmZiXkEyXkFqcGdeQXVyNTY4NDc5MDE@._V1_.jpg",
        description="An epic high-fantasy novel by J.R.R. Tolkien about the journey to destroy the One Ring.",
        rating=4.8,
        summary="Frodo Baggins, aided by a fellowship, journeys to Mount Doom to destroy the One Ring and defeat Sauron."
    )
    origin = Book(
        title="Origin", 
        cover_url="https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain",
        description="A thriller by Dan Brown, combining art, science, and technology with a twisty plot.",
        rating=4.3,
        summary="Robert Langdon investigates the secret behind a futuristic discovery that could change the world."
    )
    fury = Book(
        title="The Fury", 
        cover_url="https://th.bing.com/th/id/R.0236080380cecfbb88b31137b3884702?rik=mYNHB3E0PfVAgQ&pid=ImgRaw&r=0",
        description="A psychological thriller that delves into the mind of a woman consumed by grief and rage.",
        rating=4.5,
        summary="A woman seeks revenge on the man who destroyed her family, but things spiral out of control."
    )
    maidens = Book(
        title="The Maidens", 
        cover_url="https://th.bing.com/th/id/OIP.QgMgOIcvBT9ciSRLPuy55wHaLb?rs=1&pid=ImgDetMain",
        description="A psychological thriller where a series of murders occur at a university campus.",
        rating=4.4,
        summary="A woman, mourning the death of her niece, investigates the murders of young women at a university."
    )
    gerald = Book(
        title="Gerald's Game", 
        cover_url="https://hachette.imgix.net/books/9781848940710.jpg?auto=compress,format",
        description="A horror novel by Stephen King, exploring psychological horror and survival.",
        rating=4.2,
        summary="A woman is left handcuffed to a bed in a secluded cabin after a game goes horribly wrong."
    )
    dont_turn = Book(
        title="Don't Turn Around", 
        cover_url="https://th.bing.com/th/id/R.fe08f2a0a8cbd00466e200cacfda6374?rik=fajyD%2fySWxiALw&pid=ImgRaw&r=0",
        description="A thriller about a woman who must face her past to survive.",
        rating=4.3,
        summary="After a traumatic event, a woman is forced to confront her past to stop a deadly chain of events."
    )
    design_patterns = Book(
        title="Design patterns : elements of reusable object oriented software", 
        cover_url="https://th.bing.com/th/id/R.fbbc9c0ec18a0fc0d947cae200fabfc0?rik=qlUli3VB%2bbtqDw&pid=ImgRaw&r=0",
        description="A technical book on software design patterns by four renowned authors in the field.",
        rating=4.7,
        summary="This book presents various design patterns used in software engineering to build reusable and flexible code."
    )

    # الربط بين الكتب والمؤلفين
    hp.authors.append(rowling)
    lotr.authors.append(tolkien)
    origin.authors.append(dan_brown)
    fury.authors.append(alex_michaelides)
    maidens.authors.append(alex_michaelides)
    gerald.authors.append(stephen_king)
    dont_turn.authors.append(jessica_barry)
    design_patterns.authors.extend([erich_gamma, richard_helm, ralph_johnson, john_vlissides])

    # الربط بين الكتب والتصنيفات
    hp.categories.extend([fantasy, adventure])
    lotr.categories.extend([fantasy, adventure])
    origin.categories.append(thriller)
    fury.categories.append(psychological)
    maidens.categories.append(psychological)
    gerald.categories.append(horror)
    dont_turn.categories.append(suspense)
    design_patterns.categories.append(software)

    # إضافة البيانات إلى قاعدة البيانات
    db.session.add_all([
        rowling, tolkien, dan_brown, alex_michaelides, stephen_king, jessica_barry, erich_gamma, 
        richard_helm, ralph_johnson, john_vlissides, fantasy, adventure, thriller, psychological, 
        horror, suspense, software, hp, lotr, origin, fury, maidens, gerald, dont_turn, design_patterns
    ])

    # إضافة مستخدمين افتراضيين
    user1 = User(name="Alice")
    user2 = User(name="Bob")
    user3 = User(name="Charlie")

    
    from datetime import datetime, timedelta

    rental1 = Rental(user=user1, book=hp, rented_at=datetime.utcnow() - timedelta(days=3))
    rental2 = Rental(user=user2, book=origin, rented_at=datetime.utcnow() - timedelta(days=10), returned_at=datetime.utcnow() - timedelta(days=2))
    rental3 = Rental(user=user3, book=design_patterns, rented_at=datetime.utcnow() - timedelta(days=1))

    db.session.add_all([user1, user2, user3, rental1, rental2, rental3])


    db.session.commit()

    print("🌱 Database seeded ")
