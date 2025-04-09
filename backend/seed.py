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
        summary="Harry Potter, an orphaned boy living with his neglectful aunt and uncle, the Dursleys, discovers on his eleventh birthday that he is a wizard. A giant named Hagrid arrives to reveal Harry’s true heritage: he is the son of James and Lily Potter, two talented wizards killed by the dark wizard Lord Voldemort. Voldemort had attempted to kill Harry as a baby too, but the curse rebounded, leaving Harry with a lightning-shaped scar and reducing Voldemort to a weakened state. Harry is whisked away to Hogwarts School of Witchcraft and Wizardry, where he befriends Ron Weasley and Hermione Granger. Together, they uncover the mystery of the Philosopher’s Stone, a magical object hidden within the school that grants immortality. As Harry navigates his first year, he learns about his parents’ sacrifice, faces prejudice about his fame, and confronts a plot by Voldemort—operating through a possessed professor—to steal the Stone and regain his power. Through courage and teamwork, Harry thwarts the plan, setting the stage for his ongoing battle against darkness.",
        featured_book=True,
    )
    lotr = Book(
        title="The Lord of the Rings", 
        cover_url="https://m.media-amazon.com/images/M/MV5BNTg3NjcxYzgtYjljNC00Y2I2LWE3YmMtOTliZTkwYTE1MmZiXkEyXkFqcGdeQXVyNTY4NDc5MDE@._V1_.jpg",
        description="An epic high-fantasy novel by J.R.R. Tolkien about the journey to destroy the One Ring.",
        rating=4.8,
        summary="In the peaceful Shire, Frodo Baggins, a young hobbit, inherits the One Ring from his uncle Bilbo, unaware of its immense power and dark origin. Crafted by the evil Sauron, the Dark Lord of Mordor, the Ring holds the key to his dominion over Middle-earth. When the wizard Gandalf the Grey reveals its true nature, Frodo is tasked with destroying it in the fires of Mount Doom, the only place it can be unmade. Joined by his loyal hobbit friends—Sam, Merry, and Pippin—Frodo begins a perilous journey. They are soon aided by a fellowship including Aragorn, a ranger and heir to Gondor’s throne; Legolas, an elven archer; Gimli, a dwarven warrior; and Boromir, a man of Gondor. The group faces relentless dangers: orcs, Nazgûl (Ringwraiths), and the temptations of the Ring itself, which corrupts those who bear it. As the fellowship fractures under strain, Frodo and Sam press on alone, guided by the treacherous Gollum, a former Ring-bearer. Their quest to destroy the Ring becomes a desperate race against Sauron’s growing forces, testing courage, loyalty, and the resilience of hope in a world teetering on the edge of ruin."
    )
    origin = Book(
        title="Origin", 
        cover_url="https://th.bing.com/th/id/OIP._nr-URRb3s2MWuZwe1N5AgHaLj?rs=1&pid=ImgDetMain",
        description="A thriller by Dan Brown, combining art, science, and technology with a twisty plot.",
        rating=4.3,
        summary="RHarvard symbologist Robert Langdon is invited to Bilbao, Spain, by his former student, billionaire futurist Edmond Kirsch, who claims to have solved two of humanity’s greatest questions: “Where did we come from?” and “Where are we going?” At a high-profile event in the Guggenheim Museum, Kirsch unveils a groundbreaking discovery blending science, technology, and artificial intelligence, poised to upend religious beliefs worldwide. But before he can fully reveal it, he is assassinated, plunging Langdon into a race against time to unlock Kirsch’s encrypted presentation. Teamed with Ambra Vidal, the museum’s director and fiancée to Spain’s crown prince, Langdon navigates a web of clues rooted in art, architecture, and cutting-edge tech. From Gaudí’s Sagrada Família to the supercomputer-filled Barcelona Supercomputing Center, they evade a shadowy enemy tied to the Catholic Church and a mysterious figure known as the Regent. As Langdon unravels Kirsch’s secret—humanity’s origin tied to cosmic inevitability and a future shaped by AI—he confronts ethical dilemmas, fanaticism, and the fragile line between knowledge and power, culminating in a revelation that redefines existence itself."
    )
    fury = Book(
        title="The Fury", 
        cover_url="https://th.bing.com/th/id/R.0236080380cecfbb88b31137b3884702?rik=mYNHB3E0PfVAgQ&pid=ImgRaw&r=0",
        description="A psychological thriller that delves into the mind of a woman consumed by grief and rage.",
        rating=4.5,
        summary="n a remote Greek island, former movie star Lana Farrar hosts a lavish Easter getaway for her closest friends. Among them is Elliot Chase, the unreliable narrator who recounts this tale of betrayal and vengeance. What begins as a sun-soaked retreat turns sinister when a murder shatters the group’s idyllic facade. The victim’s death is no accident, and as a fierce wind—the “fury” of the title—traps them on the island, tensions unravel years of buried secrets: infidelity, jealousy, and festering resentment. Lana, grieving a past tragedy that claimed her family, becomes the focal point of suspicion and rage. Elliot’s account weaves a tangled narrative, blending dark humor with psychological depth, as he reveals his own role in the chaos. Each guest harbors motives, and the truth emerges in jagged pieces—culminating in a shocking confrontation where grief-fueled revenge spirals into a devastating climax, leaving readers questioning who the real “fury” is: the storm, the killer, or the broken woman at the center of it all."
    )
    maidens = Book(
        title="The Maidens", 
        cover_url="https://th.bing.com/th/id/OIP.QgMgOIcvBT9ciSRLPuy55wHaLb?rs=1&pid=ImgDetMain",
        description="A psychological thriller where a series of murders occur at a university campus.",
        rating=4.4,
        summary="Mariana Andros, a group therapist in London still reeling from her husband’s death, is drawn to Cambridge University when her niece Zoe’s friend is brutally murdered. The victim, a member of an elite clique called “The Maidens,” was ritualistically killed, her body staged with a chilling postcard depicting a Greek myth. Mariana, a Cambridge alumna with a sharp mind for psychology, suspects Edward Fosca, a charismatic classics professor who mentors the Maidens and lectures on tragedy and fate. Fosca’s allure and alibi make him untouchable, yet Mariana senses his darkness. As more Maidens die—each murder echoing ancient rites—she delves into the university’s shadowy corners, from secret societies to the myths Fosca teaches. Haunted by her own grief and guilt, Mariana’s investigation blurs into obsession, straining her bond with Zoe and unearthing her own buried trauma. The killer taunts her with clues, leading to a twist-laden showdown where love, loss, and revenge collide, revealing that the true danger lies closer than she ever imagined."
    )
    gerald = Book(
        title="Gerald's Game", 
        cover_url="https://hachette.imgix.net/books/9781848940710.jpg?auto=compress,format",
        description="A horror novel by Stephen King, exploring psychological horror and survival.",
        rating=4.2,
        summary="Jessie Burlingame and her husband Gerald retreat to their isolated lake house in Maine for a weekend of intimacy. Gerald suggests a kinky game—handcuffing Jessie to the bedposts—but when she resists and he refuses to stop, a scuffle ends with him suffering a fatal heart attack. Alone, shackled, and miles from help, Jessie faces a nightmarish ordeal. As hours stretch into days, dehydration and exhaustion set in, and her mind fractures under the strain. She’s tormented by voices: a confident alter-ego urging survival, a cruel one mocking her weakness, and memories of childhood abuse at her father’s hands, long suppressed. A stray dog gnaws at Gerald’s corpse, and a shadowy figure—real or hallucinated—lurks in the dark, heightening her terror. Jessie’s desperate struggle to free herself becomes a battle against physical limits and psychological demons, culminating in a gruesome act of self-mutilation to slip the cuffs. Even after escape, the trauma lingers, as she pieces together whether the “Space Cowboy” she saw was a figment or a real threat, forcing her to reclaim her shattered identity."
    )
    dont_turn = Book(
        title="Don't Turn Around", 
        cover_url="https://th.bing.com/th/id/R.fe08f2a0a8cbd00466e200cacfda6374?rik=fajyD%2fySWxiALw&pid=ImgRaw&r=0",
        description="A thriller about a woman who must face her past to survive.",
        rating=4.3,
        summary="Cait Monaghan, a Boston journalist, wakes up battered in a crashed car in the New Mexico desert, with no memory of how she got there. Beside her is her friend Rebecca, equally disoriented but determined to keep moving. As fragmented memories return, Cait recalls writing a controversial article exposing a powerful figure, triggering threats that forced them to flee. Now, with a truck relentlessly pursuing them across desolate highways, the women are hunted by an unseen enemy tied to Cait’s past. Flashbacks reveal Rebecca’s own secret—a pregnancy she’s hiding—and the bond that pushed her to join Cait’s escape. Every stop for gas or shelter risks exposure, and the tension mounts as they piece together who wants them dead: a vengeful politician, a hired killer, or someone closer. Survival hinges on confronting the choices that led here—professional ambition, buried guilt—and outrunning a predator who’s always one turn behind. The climactic revelation flips their flight into a fight, testing their resolve in a pulse-pounding showdown."
    )
    design_patterns = Book(
        title="Design patterns : elements of reusable object oriented software", 
        cover_url="https://th.bing.com/th/id/R.fbbc9c0ec18a0fc0d947cae200fabfc0?rik=qlUli3VB%2bbtqDw&pid=ImgRaw&r=0",
        description="A technical book on software design patterns by four renowned authors in the field.",
        rating=4.7,
        summary="Written by Erich Gamma, Richard Helm, Ralph Johnson, and John Vlissides (the “Gang of Four”), this seminal work catalogs 23 design patterns—proven solutions to recurring problems in object-oriented software design. The book begins with an introduction to the philosophy of patterns, emphasizing flexibility, reusability, and maintainability in code. It divides patterns into three categories: Creational (e.g., Singleton, Factory Method) for object instantiation; Structural (e.g., Adapter, Decorator) for organizing classes and objects; and Behavioral (e.g., Observer, Strategy) for managing communication and responsibilities. Each pattern is detailed with its intent, motivation, structure (via UML diagrams), and sample code, primarily in C++ with Smalltalk examples. For instance, the Observer pattern explains how objects can notify dependents of state changes, as in GUI updates, while the Composite pattern shows how to treat individual and grouped objects uniformly, like in graphics systems. Aimed at developers and architects, the book blends theoretical rigor with practical application, offering a timeless toolkit for building robust, scalable software systems across industries."
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
