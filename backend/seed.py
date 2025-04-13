from app import create_app
from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from app.model.User import User
from app.model.Rental import Rental
from app.model.RentalRequest import RentalRequest
from datetime import datetime

app = create_app()

with app.app_context():
    # Delete all existing data
    db.drop_all()
    db.create_all()

    # Authors
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

    # Categories
    fantasy = Category(name="Fantasy")
    adventure = Category(name="Adventure")
    thriller = Category(name="Thriller / Mystery")
    psychological = Category(name="Psychological Thriller")
    horror = Category(name="Horror Game")
    suspense = Category(name="Thriller / Suspense")
    software = Category(name="Software Engineering")

    # Books with created_at timestamps
    hp = Book(
        title="Harry Potter and the Philosopher's Stone", 
        cover_url="https://image.tmdb.org/t/p/original/lglQFk4opJuoDregOssk0gS16Pg.jpg",
        description="The first book in the Harry Potter series, where Harry discovers his magical heritage.",
        rating=4.9,
        summary="Harry Potter, an orphaned boy living with his neglectful aunt and uncle, the Dursleys, discovers on his eleventh birthday that he is a wizard...",
        featured_book=True,
        created_at=datetime(1997, 6, 26)
    )
    lotr = Book(
        title="The Lord of the Rings", 
        cover_url="https://m.media-amazon.com/images/M/MV5BNTg3NjcxYzgtYjljNC00Y2I2LWE3YmMtOTliZTkwYTE1MmZiXkEyXkFqcGdeQXVyNTY4NDc5MDE@._V1_.jpg",
        description="An epic high-fantasy novel by J.R.R. Tolkien about the journey to destroy the One Ring.",
        rating=4.8,
        summary="In the peaceful Shire, Frodo Baggins, a young hobbit, inherits the One Ring from his uncle Bilbo, unaware of its immense power...",
        created_at=datetime(1954, 7, 29)
    )
    origin = Book(
        title="Origin", 
        cover_url="https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain",
        description="A thriller by Dan Brown, combining art, science, and technology with a twisty plot.",
        rating=4.3,
        summary="Harvard symbologist Robert Langdon is invited to Bilbao, Spain, by his former student, billionaire futurist Edmond Kirsch...",
        created_at=datetime(2017, 10, 3)
    )
    fury = Book(
        title="The Fury", 
        cover_url="https://th.bing.com/th/id/R.0236080380cecfbb88b31137b3884702?rik=mYNHB3E0PfVAgQ&pid=ImgRaw&r=0",
        description="A psychological thriller that delves into the mind of a woman consumed by grief and rage.",
        rating=4.5,
        summary="On a remote Greek island, former movie star Lana Farrar hosts a lavish Easter getaway for her closest friends...",
        created_at=datetime(2021, 5, 15)
    )
    maidens = Book(
        title="The Maidens", 
        cover_url="https://th.bing.com/th/id/OIP.QgMgOIcvBT9ciSRLPuy55wHaLb?rs=1&pid=ImgDetMain",
        description="A psychological thriller where a series of murders occur at a university campus.",
        rating=4.4,
        summary="Mariana Andros, a group therapist in London still reeling from her husband’s death, is drawn to Cambridge University when her niece Zoe’s friend is brutally murdered...",
        created_at=datetime(2021, 6, 15)
    )
    gerald = Book(
        title="Gerald's Game", 
        cover_url="https://d28hgpri8am2if.cloudfront.net/book_images/onix/cvr9781501144202/geralds-game-9781501144202_hr.jpg",
        description="A horror-thriller novel where a woman’s retreat with her husband takes a dangerous turn.",
        rating=4.2,
        summary="When Gerald’s game goes terribly wrong, Jessie must fight for survival and confront her dark past.",
        created_at=datetime(1992, 5, 11)
    )

    # Add books to session
    db.session.add_all([hp, lotr, origin, fury, maidens, gerald])
    db.session.commit()

    # Users
    user1 = User(name="Alice", email="alice@example.com", role="user")
    user2 = User(name="Bob", email="bob@example.com", role="user")
    admin = User(name="Admin", email="admin@example.com", role="admin")

    # Add users to session
    db.session.add_all([user1, user2, admin])
    db.session.commit()

    # Rentals
    rental1 = Rental(user_id=user1.id, book_id=hp.id, rented_at=datetime(2025, 4, 10))
    rental2 = Rental(user_id=user2.id, book_id=lotr.id, rented_at=datetime(2025, 4, 11), returned_at=datetime(2025, 4, 13))

    # Add rentals to session
    db.session.add_all([rental1, rental2])
    db.session.commit()

    # Rental requests
    rental_request1 = RentalRequest(user_id=user1.id, book_id=origin.id, requested_at=datetime(2025, 4, 9), status="pending")
    rental_request2 = RentalRequest(user_id=user2.id, book_id=fury.id, requested_at=datetime(2025, 4, 10), status="approved")

    # Add rental requests to session
    db.session.add_all([rental_request1, rental_request2])
    db.session.commit()
