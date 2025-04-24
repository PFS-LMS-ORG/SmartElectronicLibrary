from app import create_app
from app.db import db
from app.model import Book, Author, Category, User, Rental, RentalRequest, Article, ArticleAuthor, ArticleMeta, ArticleLike, ArticleBookmark
from datetime import datetime, timedelta
import json

app = create_app()

with app.app_context():
    # Drop all existing data and recreate tables
    db.drop_all()
    db.create_all()

    # Load scraped books from JSON
    try:
        with open("books.json", "r", encoding="utf-8") as f:
            scraped_books = json.load(f)
    except FileNotFoundError:
        print("❌ scraped_books.json not found")
        scraped_books = []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in scraped_books.json: {e}")
        scraped_books = []

    # Process authors (deduplicate)
    author_dict = {}
    for book_data in scraped_books:
        author_name = book_data.get("author", "Unknown Author")
        if author_name not in author_dict:
            author_dict[author_name] = Author(name=author_name)

    # Process categories (deduplicate)
    category_dict = {}
    for book_data in scraped_books:
        category_name = book_data.get("category", "Uncategorized")
        if category_name not in category_dict:
            category_dict[category_name] = Category(name=category_name)

    # Create books and link authors/categories
    books = []
    for book_data in scraped_books:
        book = Book(
            title=book_data.get("title", "Untitled"),
            cover_url=book_data.get("cover_url", "https://via.placeholder.com/150"),
            description=book_data.get("description", "No description available."),
            rating=book_data.get("rating", 4.0),
            summary=book_data.get("summary", "No summary available."),
            borrow_count=book_data.get("borrow_count", 0),
            total_books=book_data.get("total_books", 10),
            available_books=book_data.get("available_books", 10),
            featured_book=book_data.get("featured_book", False)
        )

        # Link author
        author_name = book_data.get("author", "Unknown Author")
        book.authors.append(author_dict[author_name])

        # Link category
        category_name = book_data.get("category", "Uncategorized")
        book.categories.append(category_dict[category_name])

        books.append(book)

    # Add all authors, categories, and books to the database session
    db.session.add_all(list(author_dict.values()) + list(category_dict.values()) + books)

    # Add mock users with email and password
    user1 = User(name="Alice", email="alice@example.com")
    user1.set_password("password123")
    user2 = User(name="Bob", email="bob@example.com")
    user2.set_password("password123")
    user3 = User(name="Charlie", email="charlie@example.com", role="admin")
    user3.set_password("password123")

    # Add rentals (use first few books to avoid index errors)
    rentals = []
    if books:
        rental1 = Rental(user=user1, book=books[0], rented_at=datetime.utcnow() - timedelta(days=3))
        books[0].available_books -= 1
        books[0].borrow_count += 1
        rentals.append(rental1)

    if len(books) > 1:
        rental2 = Rental(
            user=user2,
            book=books[1],
            rented_at=datetime.utcnow() - timedelta(days=10),
            returned_at=datetime.utcnow() - timedelta(days=2)
        )
        books[1].borrow_count += 1
        rentals.append(rental2)

    if len(books) > 2:
        rental3 = Rental(user=user3, book=books[2], rented_at=datetime.utcnow() - timedelta(days=1))
        books[2].available_books -= 1
        books[2].borrow_count += 1
        rentals.append(rental3)

    # Add rental requests
    rental_requests = []
    if books:
        request1 = RentalRequest(
            user=user1,
            book=books[0],
            requested_at=datetime.utcnow() - timedelta(days=5),
            status='pending'
        )
        rental_requests.append(request1)

    if len(books) > 1:
        request2 = RentalRequest(
            user=user2,
            book=books[1],
            requested_at=datetime.utcnow() - timedelta(days=7),
            status='approved'
        )
        rental_requests.append(request2)

    if len(books) > 2:
        request3 = RentalRequest(
            user=user3,
            book=books[2],
            requested_at=datetime.utcnow() - timedelta(days=2),
            status='rejected'
        )
        rental_requests.append(request3)

    if len(books) > 3:
        request4 = RentalRequest(
            user=user1,
            book=books[3],
            requested_at=datetime.utcnow() - timedelta(days=1),
            status='pending'
        )
        rental_requests.append(request4)

    # Add all users, rentals, and rental requests to the session
    db.session.add_all([user1, user2, user3] + rentals + rental_requests)

    # Load and process dummy articles
    dummy_articles = [
        {
            "id": "1",
            "title": "Introduction to Neural Networks",
            "slug": "introduction-to-neural-networks",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "AI",
            "author": {
                "name": "John Doe",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "A beginner-friendly overview of neural networks in AI and how they're transforming the technology landscape.",
            "content": "# Introduction to Neural Networks\n\nArtificial Neural Networks (ANNs) are computing systems inspired by the biological neural networks that constitute animal brains. These systems learn to perform tasks by considering examples, generally without being programmed with task-specific rules.\n\n## How Neural Networks Work\n\nAt their core, neural networks consist of layers of interconnected nodes or \"neurons.\" Each connection can transmit a signal from one neuron to another. The receiving neuron processes the signal and then signals downstream neurons connected to it.\n\n```python\nimport tensorflow as tf\n\nmodel = tf.keras.Sequential([\n    tf.keras.layers.Dense(128, activation='relu'),\n    tf.keras.layers.Dense(64, activation='relu'),\n    tf.keras.layers.Dense(10, activation='softmax')\n])\n```\n\n## Applications of Neural Networks\n\nNeural networks are used in various applications including:\n\n- Image and voice recognition\n- Natural language processing\n- Medical diagnosis\n- Financial forecasting\n- Game playing and decision making\n\n## The Future of Neural Networks\n\nAs computational power increases and algorithms improve, neural networks will continue to advance. The field of deep learning, which uses multi-layered neural networks, is particularly promising for solving complex problems previously thought to be the domain of human intelligence alone.",
            "tags": ["AI", "Neural Networks", "Deep Learning", "Machine Learning"],
            "createdAt": "2025-04-01T10:00:00Z",
            "updatedAt": "2025-04-02T12:00:00Z",
            "meta": {
                "readTime": 6,
                "views": 120,
                "likes": 15,
                "bookmarks": 8
            }
        },
        {
            "id": "2",
            "title": "Understanding TypeScript with React",
            "slug": "understanding-typescript-with-react",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Web Development",
            "author": {
                "name": "Jane Smith",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "Explore how TypeScript enhances React development with static type checking and improved developer tools.",
            "content": "# Understanding TypeScript with React\n\nTypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. When combined with React, it provides an excellent developer experience with enhanced code quality and maintainability.\n\n## Why Use TypeScript with React?\n\nReact applications can grow large and complex. TypeScript helps manage this complexity by:\n\n- Catching errors during development instead of runtime\n- Providing better IDE support with intelligent code completion\n- Making refactoring safer and more predictable\n- Serving as self-documenting code\n\n## Getting Started\n\nTo create a new React project with TypeScript:\n\n```bash\nnpx create-react-app my-app --template typescript\n```\n\n## Component Type Definitions\n\nHere's how you might define a simple component with props:\n\n```tsx\ntype ButtonProps = {\n  text: string;\n  onClick: () => void;\n  color?: 'primary' | 'secondary';\n};\n\nconst Button: React.FC<ButtonProps> = ({ text, onClick, color = 'primary' }) => {\n  return (\n    <button\n      className={`btn btn-${color}`}\n      onClick={onClick}\n    >\n      {text}\n    </button>\n  );\n};\n```\n\n## Hooks with TypeScript\n\nTypeScript works seamlessly with React Hooks:\n\n```tsx\nconst [count, setCount] = useState<number>(0);\n\nconst user = useContext<UserContext>(UserContext);\n```\n\n## Conclusion\n\nAdopting TypeScript in your React projects requires a small learning curve, but the benefits in terms of code quality, team collaboration, and maintainability are substantial. As your application grows, you'll appreciate the guardrails that TypeScript provides.",
            "tags": ["TypeScript", "React", "Frontend", "JavaScript"],
            "createdAt": "2025-04-15T08:30:00Z",
            "updatedAt": "2025-04-16T09:00:00Z",
            "meta": {
                "readTime": 8,
                "views": 90,
                "likes": 22,
                "bookmarks": 10
            }
        },
        {
            "id": "3",
            "title": "The Evolution of Library Management Systems",
            "slug": "evolution-of-library-management-systems",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Library Science",
            "author": {
                "name": "Emily Chen",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "A comprehensive look at how library management systems have evolved from card catalogs to modern digital platforms.",
            "content": "# The Evolution of Library Management Systems\n\nLibrary management systems have undergone remarkable transformations over the past century, from manual card catalogs to sophisticated digital platforms that manage resources, user interactions, and analytics.\n\n## The Card Catalog Era\n\nFor much of the 20th century, libraries relied on card catalogs - cabinets filled with index cards containing book metadata. Librarians maintained these systems meticulously, sorting cards by author, title, and subject.\n\n## Early Automation (1960s-1980s)\n\nThe first computerized library systems emerged in the 1960s, with the MARC (Machine Readable Cataloging) format standardizing how bibliographic information was encoded. Systems like OCLC began to network libraries together, allowing for shared cataloging.\n\n## Integrated Library Systems (1990s-2000s)\n\nThe 1990s saw the rise of Integrated Library Systems (ILS) that combined:\n\n- Cataloging\n- Circulation\n- Acquisitions\n- Serials management\n- Online public access catalogs (OPACs)\n\n## Modern Digital Library Platforms\n\nToday's systems include:\n\n- Cloud-based architecture\n- Mobile accessibility\n- Discovery layers with modern search capabilities\n- Integration with digital repositories\n- APIs for interoperability\n- Data analytics and reporting\n\n## The Future\n\nEmerging trends include:\n\n- AI-powered recommendations\n- Blockchain for digital rights management\n- Enhanced support for digital collections\n- Community engagement features\n\nThe evolution continues as libraries adapt to changing user needs and technological capabilities.",
            "tags": ["Library Science", "Digital Libraries", "Information Systems"],
            "createdAt": "2025-03-10T14:15:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 7,
                "views": 85,
                "likes": 12,
                "bookmarks": 15
            }
        },
        {
            "id": "4",
            "title": "Data Visualization Best Practices",
            "slug": "data-visualization-best-practices",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Data Science",
            "author": {
                "name": "Michael Rodriguez",
                "avatarUrl": None
            },
            "summary": "Learn essential principles for creating effective and ethical data visualizations that communicate insights clearly.",
            "content": "# Data Visualization Best Practices\n\nData visualization is both an art and a science. While there are technical aspects to creating visualizations, there are also design principles that make the difference between a confusing chart and an insightful one.\n\n## Choose the Right Chart Type\n\nMatch your visualization to the story you're telling:\n\n- **Comparisons**: Bar charts, bullet charts\n- **Distributions**: Histograms, box plots\n- **Relationships**: Scatter plots, bubble charts\n- **Compositions**: Pie charts, stacked bars\n- **Trends over time**: Line charts, area charts\n\n## Design for Clarity\n\n- Remove chart junk (unnecessary decorative elements)\n- Use a clear visual hierarchy\n- Label directly when possible instead of using legends\n- Use color purposefully and consistently\n- Consider accessibility (color blindness, contrast)\n\n## Example: Improving a Visualization\n\nBefore:\n```python\nimport matplotlib.pyplot as plt\nimport numpy as np\n\n# Complex, hard-to-read plot\nfig, ax = plt.subplots()\nx = np.linspace(0, 10, 100)\nax.plot(x, np.sin(x), '-b', label='Sin')\nax.plot(x, np.cos(x), ':r', label='Cos')\nax.plot(x, np.tan(x), '--g', label='Tan')\nax.legend(loc='upper left', bbox_to_anchor=(1, 1))\nplt.tight_layout()\nplt.show()\n```\n\nAfter:\n```python\n# Clearer, focused visualization\nfig, ax = plt.subplots(figsize=(10, 5))\nax.plot(x, np.sin(x), color='#1d7ab1', linewidth=2.5, label='Sin')\nax.set_xlim(0, 10)\nax.set_ylim(-1.5, 1.5)\nax.set_title('Sine Wave', fontsize=16)\nax.set_xlabel('Angle (radians)', fontsize=12)\nax.set_ylabel('Amplitude', fontsize=12)\nax.grid(True, alpha=0.3)\nax.legend(frameon=False)\nplt.tight_layout()\nplt.show()\n```\n\n## Ethical Considerations\n\n- Don't distort the data (e.g., truncated axes can exaggerate differences)\n- Provide context for interpretation\n- Be transparent about data sources and processing\n- Consider cultural differences in color meaning and interpretation\n\n## Tools for Modern Visualization\n\n- Python: Matplotlib, Seaborn, Plotly\n- JavaScript: D3.js, Chart.js, Highcharts\n- Business Tools: Tableau, Power BI\n\nRemember that the goal of data visualization is communication. Technical excellence matters, but so does the audience's ability to understand and gain insights from your visualization.",
            "tags": ["Data Science", "Visualization", "Data Analysis"],
            "createdAt": "2025-03-05T09:45:00Z",
            "updatedAt": "2025-03-07T16:20:00Z",
            "meta": {
                "readTime": 9,
                "views": 140,
                "likes": 38,
                "bookmarks": 23
            }
        },
        {
            "id": "5",
            "title": "Building Accessible Web Applications",
            "slug": "building-accessible-web-applications",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Web Development",
            "author": {
                "name": "Sarah Johnson",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "A practical guide to designing and developing web applications that are usable by everyone, including people with disabilities.",
            "content": "# Building Accessible Web Applications\n\nWeb accessibility ensures that people with disabilities can perceive, understand, navigate, and interact with websites and tools. It's not just about compliance—it's about creating a better experience for everyone.\n\n## Understanding WCAG Guidelines\n\nThe Web Content Accessibility Guidelines (WCAG) organize accessibility principles into four main categories:\n\n1. **Perceivable**: Information must be presentable in ways all users can perceive\n2. **Operable**: Interface components must be navigable by all users\n3. **Understandable**: Information and operation must be understandable to all users\n4. **Robust**: Content must be robust enough to work with current and future technologies\n\n## Practical Implementation\n\n### Semantic HTML\n\nUse HTML elements for their intended purpose:\n\n```html\n<!-- Instead of this -->\n<div class=\"heading\">Important Section</div>\n\n<!-- Use this -->\n<h2>Important Section</h2>\n```\n\n### Keyboard Navigation\n\nEnsure all interactive elements are keyboard accessible:\n\n```jsx\n// React example with keyboard support\nfunction AccessibleButton({ onClick, children }) {\n  const handleKeyDown = (e) => {\n    if (e.key === 'Enter' || e.key === ' ') {\n      onClick();\n    }\n  };\n\n  return (\n    <div \n      role=\"button\"\n      tabIndex={0}\n      onClick={onClick}\n      onKeyDown={handleKeyDown}\n      className=\"button\"\n    >\n      {children}\n    </div>\n  );\n}\n```\n\n### ARIA When Necessary\n\nARIA attributes help when HTML alone isn't enough:\n\n```html\n<div role=\"alert\" aria-live=\"assertive\">\n  Form submitted successfully!\n</div>\n```\n\n### Testing Tools\n\n- Screen readers: NVDA, VoiceOver, JAWS\n- Automated tools: Lighthouse, axe, Wave\n- Keyboard testing: Try navigating without a mouse\n- Contrast checkers: WebAIM Contrast Checker\n\n## Common Pitfalls to Avoid\n\n- Missing alt text on images\n- Color as the only means of conveying information\n- Non-responsive designs that break at different zoom levels\n- Lack of visible focus indicators\n- Time-based restrictions without override options\n\n## Conclusion\n\nAccessibility is an ongoing process, not a one-time task. By integrating accessibility considerations throughout the development lifecycle, you can create web applications that provide a better experience for everyone.",
            "tags": ["Accessibility", "Web Development", "WCAG", "Frontend"],
            "createdAt": "2025-02-20T11:30:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 10,
                "views": 95,
                "likes": 27,
                "bookmarks": 19
            }
        },
        {
            "id": "6",
            "title": "Ethical Considerations in AI Development",
            "slug": "ethical-considerations-in-ai-development",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "AI",
            "author": {
                "name": "David Washington",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "Exploring the ethical challenges and responsibilities in artificial intelligence development and deployment.",
            "content": "# Ethical Considerations in AI Development\n\nAs artificial intelligence becomes increasingly integrated into our daily lives, the ethical implications of AI systems demand careful consideration. Developers, organizations, and society must work together to ensure AI benefits humanity while minimizing potential harms.\n\n## Bias and Fairness\n\nAI systems reflect the data they're trained on. When this data contains historical biases, AI can perpetuate or even amplify these biases:\n\n- **Representation bias**: When training data doesn't adequately represent all groups\n- **Measurement bias**: When proxies used for measurement are flawed\n- **Aggregation bias**: When models work well for dominant groups but fail for others\n\n### Example: Addressing Bias\n\n```python\n# Simple example of bias mitigation through balanced datasets\nfrom sklearn.utils import resample\n\n# Assuming imbalanced_data has representation issues\nminority_data = imbalanced_data[imbalanced_data['protected_attribute'] == 'minority_value']\nmajority_data = imbalanced_data[imbalanced_data['protected_attribute'] == 'majority_value']\n\n# Upsample minority class\nminority_upsampled = resample(minority_data,\n                             replace=True,\n                             n_samples=len(majority_data),\n                             random_state=42)\n\n# Combine into balanced dataset\nbalanced_data = pd.concat([majority_data, minority_upsampled])\n```\n\n## Transparency and Explainability\n\nComplex AI systems, particularly deep learning models, often function as \"black boxes.\" This lack of transparency raises concerns:\n\n- How can users trust decisions they don't understand?\n- How can we audit systems when their decision process is opaque?\n- How can we identify and correct errors in reasoning?\n\n## Privacy Considerations\n\nAI systems often require vast amounts of data, raising privacy concerns:\n\n- Data collection and consent\n- Re-identification risks in anonymized data\n- Surveillance capabilities of AI systems\n\n## Accountability\n\nWhen AI systems cause harm, questions of accountability arise:\n\n- Who is responsible when an autonomous system causes harm?\n- How should liability be distributed among developers, deployers, and users?\n- What oversight mechanisms are needed?\n\n## A Framework for Ethical AI\n\n1. **Human-centered design**: Prioritize human well-being and autonomy\n2. **Fairness by design**: Test for and mitigate biases throughout development\n3. **Transparency**: Make systems as explainable as possible\n4. **Privacy preservation**: Minimize data collection and secure what's needed\n5. **Accountability**: Establish clear lines of responsibility\n6. **Ongoing monitoring**: Continuously evaluate system impacts\n\n## Conclusion\n\nEthical AI development isn't just about avoiding harm—it's about actively working toward systems that promote human flourishing. By incorporating ethical considerations from the earliest stages of development, we can build AI that serves humanity's best interests.",
            "tags": ["AI", "Ethics", "Technology Ethics", "Responsible AI"],
            "createdAt": "2025-01-15T13:20:00Z",
            "updatedAt": "2025-02-01T10:15:00Z",
            "meta": {
                "readTime": 12,
                "views": 210,
                "likes": 45,
                "bookmarks": 32
            }
        },
        {
            "id": "7",
            "title": "Research Methods in Digital Humanities",
            "slug": "research-methods-in-digital-humanities",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Digital Humanities",
            "author": {
                "name": "Priya Sharma",
                "avatarUrl": None
            },
            "summary": "An overview of computational approaches to humanities research, including text analysis, network analysis, and spatial mapping.",
            "content": "# Research Methods in Digital Humanities\n\nDigital humanities represents the intersection of computational methods with traditional humanities disciplines. This emerging field opens new possibilities for analyzing cultural, historical, and literary materials at scales previously impossible.\n\n## Text Analysis and Mining\n\nComputational text analysis allows humanities scholars to discover patterns across large corpora:\n\n### Distant Reading\n\nFranco Moretti's concept of \"distant reading\" involves analyzing patterns across many texts rather than close reading of individual works.\n\n### Topic Modeling\n\n```python\n# Simple topic modeling with Gensim\nfrom gensim import corpora, models\n\ntexts = [doc.split() for doc in processed_documents]\ndictionary = corpora.Dictionary(texts)\ncorpus = [dictionary.doc2bow(text) for text in texts]\n\nlda_model = models.LdaModel(corpus=corpus,\n                          id2word=dictionary,\n                          num_topics=10,\n                          passes=10)\n\n# Print topics\nfor topic_id, topic in lda_model.print_topics():\n    print(f\"Topic {topic_id}: {topic}\")\n```\n\n### Stylometry and Authorship Attribution\n\nComputational analysis of writing style can help attribute anonymous texts or distinguish between authors.\n\n## Network Analysis\n\nHumanities researchers use network analysis to understand relationships between people, places, concepts, or texts:\n\n- Character networks in literature\n- Citation networks in academic publications\n- Correspondence networks in historical letters\n\n## Spatial Methods\n\nGeographic Information Systems (GIS) help humanities scholars analyze spatial dimensions:\n\n- Mapping historical events\n- Analyzing spatial patterns in literature\n- Visualizing the movement of people, ideas, or artifacts\n\n## Digital Archives and Collections\n\nDigital humanities often involves creating or using digital archives:\n\n- Digitization standards and best practices\n- Metadata schemas for cultural materials\n- Considerations for long-term preservation\n\n## Ethical Considerations\n\nDigital humanities research raises particular ethical questions:\n\n- Representation of marginalized communities\n- Digitization of culturally sensitive materials\n- Privacy concerns with historical materials\n- Environmental impact of digital infrastructure\n\n## Interdisciplinary Collaboration\n\nSuccessful digital humanities projects typically require collaboration between:\n\n- Humanities scholars\n- Computer scientists\n- Librarians and archivists\n- Data visualization specialists\n\n## Conclusion\n\nDigital humanities methods don't replace traditional humanities approaches—they complement them. By combining computational techniques with humanistic inquiry, scholars can ask new questions and explore cultural materials in innovative ways.",
            "tags": ["Digital Humanities", "Research Methods", "Text Analysis", "Computational Methods"],
            "createdAt": "2025-02-10T09:00:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 9,
                "views": 75,
                "likes": 18,
                "bookmarks": 14
            }
        },
        {
            "id": "8",
            "title": "The Art of Database Design",
            "slug": "the-art-of-database-design",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Software Engineering",
            "author": {
                "name": "Alex Thompson",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "Principles and practices for designing efficient, scalable, and maintainable database systems.",
            "content": "# The Art of Database Design\n\nWell-designed databases are the foundation of robust applications. This article explores key principles and practices for creating database schemas that balance performance, scalability, and maintainability.\n\n## Normalization vs. Denormalization\n\nNormalization reduces data redundancy and improves data integrity, while denormalization can improve read performance.\n\n### Normal Forms\n\n- **First Normal Form (1NF)**: Eliminate repeating groups\n- **Second Normal Form (2NF)**: Remove partial dependencies\n- **Third Normal Form (3NF)**: Remove transitive dependencies\n\n### When to Denormalize\n\nConsider denormalization when:\n- Read performance is critical\n- Joins are expensive\n- Data is rarely updated\n\n## Entity-Relationship Modeling\n\n```sql\n-- Example schema for a library management system\nCREATE TABLE Authors (\n    author_id INT PRIMARY KEY,\n    name VARCHAR(100) NOT NULL,\n    biography TEXT\n);\n\nCREATE TABLE Books (\n    book_id INT PRIMARY KEY,\n    title VARCHAR(200) NOT NULL,\n    isbn VARCHAR(13) UNIQUE,\n    publication_date DATE,\n    publisher_id INT REFERENCES Publishers(publisher_id)\n);\n\nCREATE TABLE BookAuthors (\n    book_id INT REFERENCES Books(book_id),\n    author_id INT REFERENCES Authors(author_id),\n    PRIMARY KEY (book_id, author_id)\n);\n```\n\n## Indexing Strategies\n\nProper indexing is crucial for query performance:\n\n- Index columns frequently used in WHERE clauses\n- Index foreign keys\n- Consider covering indexes for queries that select a subset of columns\n- Be cautious about over-indexing, which impacts write performance\n\n## Data Types and Constraints\n\nChoose appropriate data types and constraints to ensure data integrity:\n\n- Use the most specific data type possible\n- Apply NOT NULL constraints where appropriate\n- Use CHECK constraints to enforce business rules\n- Implement uniqueness with UNIQUE constraints\n\n## Performance Considerations\n\n- **Query optimization**: Analyze and optimize frequently run queries\n- **Partitioning**: Split large tables based on logical divisions\n- **Connection pooling**: Manage database connections efficiently\n- **Caching**: Implement appropriate caching strategies\n\n## NoSQL Considerations\n\nWhen might a NoSQL solution be appropriate?\n\n- Handling semi-structured or unstructured data\n- Scaling horizontally across many servers\n- Prioritizing availability over consistency\n- Dealing with very high write loads\n\n## Evolution and Maintenance\n\nDesign for change:\n\n- Use database migration tools\n- Version control your schema\n- Consider backward compatibility\n- Plan for scaling from the start\n\n## Conclusion\n\nDatabase design is both science and art. While following established principles is important, the best design for your application depends on specific requirements, expected growth, and access patterns. Regular review and refinement of your database design pays dividends in long-term application performance and maintainability.",
            "tags": ["Database Design", "SQL", "Software Engineering", "Data Modeling"],
            "createdAt": "2025-02-05T14:40:00Z",
            "updatedAt": "2025-02-08T11:25:00Z",
            "meta": {
                "readTime": 11,
                "views": 165,
                "likes": 32,
                "bookmarks": 28
            }
        },
        {
            "id": "9",
            "title": "Modern Approaches to Literature Education",
            "slug": "modern-approaches-to-literature-education",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Education",
            "author": {
                "name": "Rachel Adams",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "Innovative strategies for engaging students with literature in the digital age.",
            "content": "# Modern Approaches to Literature Education\n\nLiterature education faces unique challenges and opportunities in the digital age. This article explores innovative approaches to engage students with literary texts while developing critical thinking, empathy, and creative expression.\n\n## Digital Storytelling\n\nDigital storytelling combines traditional narrative with multimedia elements:\n\n- Students create video essays analyzing literary works\n- Interactive timelines illustrate historical context of texts\n- Podcasts explore themes or character development\n\n## Multimodal Analysis\n\nExpanding beyond traditional text analysis:\n\n- Film adaptations as interpretive lens\n- Graphic novel versions to study visual storytelling\n- Audio performances to analyze tone and delivery\n\n## Collaborative Reading\n\nLeveraging technology for social reading experiences:\n\n- Annotation tools like Hypothesis for collaborative marginalia\n- Online discussion forums for asynchronous conversation\n- Video conferencing for virtual book clubs\n\n## Inclusive Text Selection\n\nExpanding the canon to include diverse voices:\n\n- Works from underrepresented authors and perspectives\n- Contemporary texts that resonate with students' experiences\n- Global literature that broadens cultural understanding\n\n## Creative Response Projects\n\nInviting students to engage creatively with texts:\n\n- Creating alternative endings or perspectives\n- Translating works across media formats\n- Developing games based on literary worlds\n\n## Gamification Elements\n\nIncorporating game-based learning principles:\n\n- Reading \"quests\" with progressive challenges\n- Achievement systems for analytical skills development\n- Competitive or cooperative activities around texts\n\n## Authentic Assessment\n\nMoving beyond traditional essays:\n\n- Student-led literary podcasts\n- Curated digital exhibitions\n- Creative works with analytical artist statements\n- Community reading events or workshops\n\n## Example: Digital Close Reading Activity\n\n```\nDigital Close Reading Exercise: \"The Yellow Wallpaper\"\n\n1. Choose a 1-2 paragraph passage from the text\n2. Create a Google Doc or use Hypothesis for annotation\n3. Identify and color-code different elements:\n   - YELLOW: References to the wallpaper\n   - BLUE: Language suggesting confinement\n   - GREEN: Hints of the narrator's mental state\n   - PURPLE: Pattern/repetition\n4. Comment on connections between these elements\n5. Create a word cloud visualization of your passage\n6. Compare your analysis with peers in breakout rooms\n```\n\n## Conclusion\n\nEffective literature education in the modern era balances traditional close reading with digital approaches, maintains rigor while increasing engagement, and honors canonical works while expanding to include diverse perspectives. By embracing these innovative approaches, educators can help students develop not only literary analysis skills but also the critical thinking and empathy they'll need in an increasingly complex world.",
            "tags": ["Education", "Literature", "Teaching", "Digital Pedagogy"],
            "createdAt": "2025-01-20T10:30:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 8,
                "views": 110,
                "likes": 29,
                "bookmarks": 22
            }
        },
        {
            "id": "10",
            "title": "Sustainability in Software Development",
            "slug": "sustainability-in-software-development",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Software Engineering",
            "author": {
                "name": "Thomas Garcia",
                "avatarUrl": None
            },
            "summary": "Exploring practices for developing environmentally sustainable software that minimizes energy consumption and carbon footprint.",
            "content": "# Sustainability in Software Development\n\nAs our digital infrastructure grows, so does its environmental impact. Software developers have an increasing responsibility to consider the sustainability implications of their work, from energy consumption to hardware lifecycle.\n\n## The Environmental Impact of Software\n\nSoftware affects the environment through multiple channels:\n\n- **Energy consumption** during execution\n- **Hardware demands** that drive device manufacturing and disposal\n- **Data center resources** including electricity and cooling\n- **Network traffic** requiring infrastructure energy\n\n## Measuring Software Efficiency\n\nBaseline metrics to consider:\n\n- Energy consumption per operation\n- CPU and memory efficiency\n- Network data transfer volume\n- Storage requirements\n\n```javascript\n// Example: Measuring execution time and memory usage in Node.js\nconst { performance } = require('perf_hooks');\n\nconst start = performance.now();\nconst startMemory = process.memoryUsage().heapUsed;\n\n// Function to measure\nfunction inefficientFunction() {\n  let array = [];\n  for (let i = 0; i < 1000000; i++) {\n    array.push(i);\n  }\n  return array.filter(num => num % 2 === 0).length;\n}\n\n// More efficient version\nfunction efficientFunction() {\n  let count = 0;\n  for (let i = 0; i < 1000000; i++) {\n    if (i % 2 === 0) count++;\n  }\n  return count;\n}\n\ninefficientFunction(); // Slower, higher memory usage\nconsole.log(`Memory used (inefficient): ${(process.memoryUsage().heapUsed - startMemory) / 1024 / 1024} MB`);\nconsole.log(`Execution time: ${performance.now() - start} ms`);\n\nefficientFunction(); // Faster, lower memory usage\nconsole.log(`Memory used (efficient): ${(process.memoryUsage().heapUsed - startMemory) / 1024 / 1024} MB`);\nconsole.log(`Execution time: ${performance.now() - start} ms`);\n```\n\n## Optimizing for Efficiency\n\n- **Code optimization**: Minimize computational complexity\n- **Data structures**: Choose appropriate structures for the use case\n- **Caching**: Implement intelligent caching strategies\n- **Lazy loading**: Load resources only when needed\n\n## Green Hosting\n\nChoose hosting providers with:\n\n- Renewable energy sources\n- Energy-efficient data centers\n- Carbon offset programs\n\n## Lifecycle Considerations\n\n- Design for longevity to reduce hardware upgrades\n- Minimize dependencies to reduce bloat\n- Support older devices when possible\n\n## Measuring Carbon Footprint\n\nUse tools like:\n\n- Green Web Foundation\n- Website Carbon Calculator\n- Cloud Carbon Footprint\n\n## Conclusion\n\nSustainable software development requires balancing performance, functionality, and environmental impact. By adopting efficient coding practices, choosing green infrastructure, and considering the full lifecycle of software, developers can significantly reduce their carbon footprint while maintaining high-quality applications.",
            "tags": ["Software Engineering", "Sustainability", "Green Computing", "Energy Efficiency"],
            "createdAt": "2025-01-10T15:20:00Z",
            "updatedAt": "2025-01-12T09:30:00Z",
            "meta": {
                "readTime": 9,
                "views": 130,
                "likes": 25,
                "bookmarks": 20
            }
        },
        {
            "id": "11",
            "title": "Introduction to Graph Databases",
            "slug": "introduction-to-graph-databases",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Software Engineering",
            "author": {
                "name": "Laura Kim",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "An introduction to graph databases, their use cases, and how they differ from traditional relational databases.",
            "content": "# Introduction to Graph Databases\n\nGraph databases are designed to handle highly connected data, making them ideal for applications like social networks, recommendation engines, and fraud detection.\n\n## What is a Graph Database?\n\nA graph database uses graph structures with nodes, edges, and properties to represent and store data. Nodes represent entities, and edges represent relationships between them.\n\n## Key Concepts\n\n- **Nodes**: Entities like people, products, or locations\n- **Edges**: Relationships like 'friend_of', 'purchased', or 'located_in'\n- **Properties**: Attributes of nodes or edges (e.g., name, age, timestamp)\n\n## Example: Neo4j Cypher Query\n\n```cypher\n// Create nodes and relationships\nCREATE (alice:Person {name: 'Alice', age: 30})\nCREATE (bob:Person {name: 'Bob', age: 25})\nCREATE (alice)-[:FRIENDS_WITH {since: 2023}]->(bob)\n\n// Query friends of Alice\nMATCH (alice:Person {name: 'Alice'})-[:FRIENDS_WITH]->(friend)\nRETURN friend.name, friend.age\n```\n\n## Use Cases\n\n- **Social Networks**: Finding friends of friends or influence networks\n- **Recommendation Engines**: Suggesting products based on user behavior\n- **Fraud Detection**: Identifying suspicious patterns in transactions\n- **Knowledge Graphs**: Connecting concepts for semantic search\n\n## Advantages\n\n- Intuitive modeling of relationships\n- High performance for complex queries\n- Flexible schema for evolving data\n\n## Challenges\n\n- Learning curve for query languages like Cypher\n- Scaling very large graphs\n- Less mature tooling compared to relational databases\n\n## Popular Graph Databases\n\n- Neo4j\n- Amazon Neptune\n- ArangoDB\n- OrientDB\n\n## Conclusion\n\nGraph databases offer a powerful way to model and query connected data. While they may not replace relational databases, they are an essential tool for applications where relationships are as important as the data itself.",
            "tags": ["Graph Databases", "Software Engineering", "NoSQL", "Data Modeling"],
            "createdAt": "2025-03-20T12:00:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 7,
                "views": 100,
                "likes": 20,
                "bookmarks": 12
            }
        },
        {
            "id": "12",
            "title": "The Rise of Low-Code Platforms",
            "slug": "rise-of-low-code-platforms",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Software Development",
            "author": {
                "name": "Mark Wilson",
                "avatarUrl": None
            },
            "summary": "How low-code platforms are transforming software development by enabling faster delivery and broader participation.",
            "content": "# The Rise of Low-Code Platforms\n\nLow-code platforms are changing the landscape of software development by allowing developers and non-developers alike to create applications with minimal coding.\n\n## What is Low-Code?\n\nLow-code is a development approach that uses visual interfaces, drag-and-drop components, and pre-built templates to simplify application creation.\n\n## Benefits of Low-Code\n\n- **Speed**: Accelerate development with reusable components\n- **Accessibility**: Enable citizen developers (non-technical users) to build apps\n- **Cost Efficiency**: Reduce reliance on specialized developers\n- **Flexibility**: Quickly adapt to changing business needs\n\n## Example: Building a Form with a Low-Code Platform\n\nUsing a platform like OutSystems or Mendix:\n\n```plaintext\n1. Drag a Form widget onto the canvas\n2. Add input fields (e.g., Name, Email) from the component library\n3. Configure validation rules visually\n4. Connect to a database using a pre-built connector\n5. Deploy with one-click publishing\n```\n\n## Popular Low-Code Platforms\n\n- OutSystems\n- Mendix\n- Appian\n- Microsoft Power Apps\n- Bubble\n\n## Challenges\n\n- Limited customization for complex requirements\n- Potential vendor lock-in\n- Scalability concerns for enterprise applications\n- Governance and security considerations\n\n## Use Cases\n\n- Rapid prototyping\n- Internal business applications\n- Workflow automation\n- Customer portals\n\n## The Future of Low-Code\n\n- Integration with AI for automated code suggestions\n- Enhanced support for enterprise-grade applications\n- Growth of citizen developer communities\n- Improved interoperability with traditional code\n\n## Conclusion\n\nLow-code platforms democratize software development, enabling faster innovation and broader participation. While they may not replace traditional development for all use cases, they are a powerful tool for modern organizations.",
            "tags": ["Low-Code", "Software Development", "Rapid Development", "Citizen Developer"],
            "createdAt": "2025-03-15T09:30:00Z",
            "updatedAt": "2025-03-16T10:45:00Z",
            "meta": {
                "readTime": 6,
                "views": 115,
                "likes": 18,
                "bookmarks": 10
            }
        },
        {
            "id": "13",
            "title": "Machine Learning in Healthcare",
            "slug": "machine-learning-in-healthcare",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "AI",
            "author": {
                "name": "Dr. Anita Patel",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "Exploring the applications of machine learning in healthcare, from diagnostics to personalized medicine.",
            "content": "# Machine Learning in Healthcare\n\nMachine learning is revolutionizing healthcare by enabling data-driven decision-making and improving patient outcomes.\n\n## Applications in Healthcare\n\n- **Diagnostics**: Identifying diseases from imaging or lab data\n- **Predictive Analytics**: Forecasting patient risks (e.g., readmissions)\n- **Personalized Medicine**: Tailoring treatments based on patient data\n- **Drug Discovery**: Accelerating identification of new compounds\n\n## Example: Image Classification for Diagnostics\n\n```python\n# Simple CNN for medical image classification\nmodel = tf.keras.Sequential([\n    tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 1)),\n    tf.keras.layers.MaxPooling2D((2, 2)),\n    tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),\n    tf.keras.layers.MaxPooling2D((2, 2)),\n    tf.keras.layers.Flatten(),\n    tf.keras.layers.Dense(128, activation='relu'),\n    tf.keras.layers.Dense(1, activation='sigmoid')\n])\n\nmodel.compile(optimizer='adam',\n              loss='binary_crossentropy',\n              metrics=['accuracy'])\n```\n\n## Challenges\n\n- Data privacy and HIPAA compliance\n- Bias in training data affecting outcomes\n- Regulatory approval for AI systems\n- Integration with existing healthcare IT systems\n\n## Ethical Considerations\n\n- Ensuring fairness across patient demographics\n- Maintaining transparency in decision-making\n- Protecting patient data privacy\n\n## Tools and Frameworks\n\n- TensorFlow and PyTorch for model development\n- Sci-kit Learn for simpler ML tasks\n- Cloud platforms (AWS, Google Cloud) for scalable processing\n\n## Conclusion\n\nMachine learning holds immense potential for healthcare, but its adoption requires careful consideration of ethical, regulatory, and technical challenges. With responsible development, it can significantly improve patient care and operational efficiency.",
            "tags": ["AI", "Healthcare", "Machine Learning", "Medical Technology"],
            "createdAt": "2025-04-10T11:00:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 8,
                "views": 150,
                "likes": 30,
                "bookmarks": 25
            }
        },
        {
            "id": "14",
            "title": "Designing User-Centric Mobile Apps",
            "slug": "designing-user-centric-mobile-apps",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Mobile Development",
            "author": {
                "name": "Claire Nguyen",
                "avatarUrl": "https://placehold.co/64"
            },
            "summary": "Best practices for designing mobile apps that prioritize user experience and engagement.",
            "content": "# Designing User-Centric Mobile Apps\n\nCreating successful mobile apps requires a deep understanding of user needs and behaviors. This article outlines key principles for designing intuitive and engaging mobile experiences.\n\n## User Research\n\nUnderstand your audience through:\n\n- Surveys and interviews\n- User personas\n- Usability testing\n- Analytics and heatmaps\n\n## Design Principles\n\n- **Simplicity**: Minimize cognitive load with clean interfaces\n- **Consistency**: Use familiar patterns across the app\n- **Feedback**: Provide immediate responses to user actions\n- **Accessibility**: Design for all users, including those with disabilities\n\n## Example: Flutter UI Component\n\n```dart\nclass CustomButton extends StatelessWidget {\n  final String text;\n  final VoidCallback onPressed;\n\n  const CustomButton({required this.text, required this.onPressed});\n\n  @override\n  Widget build(BuildContext context) {\n    return ElevatedButton(\n      onPressed: onPressed,\n      style: ElevatedButton.styleFrom(\n        primary: Colors.blue,\n        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 15),\n        textStyle: TextStyle(fontSize: 16),\n      ),\n      child: Text(text),\n    );\n  }\n}\n```\n\n## Prototyping and Testing\n\n- Use tools like Figma or Adobe XD for wireframes\n- Conduct iterative testing with real users\n- A/B test different design variations\n\n## Performance Optimization\n\n- Minimize app size and load times\n- Optimize images and assets\n- Use lazy loading for content\n\n## Platform Considerations\n\n- Follow iOS Human Interface Guidelines\n- Adhere to Material Design for Android\n- Handle different screen sizes and resolutions\n\n## Conclusion\n\nUser-centric mobile app design balances aesthetics, functionality, and performance. By prioritizing user needs and iterating based on feedback, developers can create apps that delight users and drive engagement.",
            "tags": ["Mobile Development", "UX Design", "App Development", "User Experience"],
            "createdAt": "2025-04-05T14:20:00Z",
            "updatedAt": "2025-04-06T09:00:00Z",
            "meta": {
                "readTime": 7,
                "views": 125,
                "likes": 22,
                "bookmarks": 15
            }
        },
        {
            "id": "15",
            "title": "Blockchain Beyond Cryptocurrency",
            "slug": "blockchain-beyond-cryptocurrency",
            "coverImageUrl": "https://placehold.co/600x300",
            "category": "Blockchain",
            "author": {
                "name": "Kevin Brown",
                "avatarUrl": None
            },
            "summary": "Exploring non-financial applications of blockchain technology in supply chain, healthcare, and more.",
            "content": "# Blockchain Beyond Cryptocurrency\n\nWhile blockchain is best known for powering cryptocurrencies, its decentralized and secure nature makes it valuable for a wide range of applications.\n\n## What is Blockchain?\n\nA blockchain is a distributed ledger that records transactions across many computers, ensuring security and immutability.\n\n## Non-Financial Applications\n\n- **Supply Chain**: Tracking goods from origin to consumer\n- **Healthcare**: Securing patient records and ensuring interoperability\n- **Voting**: Creating transparent and tamper-proof election systems\n- **Intellectual Property**: Protecting digital assets and copyrights\n\n## Example: Smart Contract on Ethereum\n\n```solidity\n// Simple supply chain tracking contract\npragma solidity ^0.8.0;\n\ncontract SupplyChain {\n    struct Product {\n        uint id;\n        string name;\n        string origin;\n        address currentOwner;\n    }\n\n    mapping(uint => Product) public products;\n    uint public productCount;\n\n    function addProduct(string memory _name, string memory _origin) public {\n        productCount++;\n        products[productCount] = Product(productCount, _name, _origin, msg.sender);\n    }\n\n    function transferProduct(uint _productId, address _newOwner) public {\n        require(products[_productId].currentOwner == msg.sender, \"Not the owner\");\n        products[_productId].currentOwner = _newOwner;\n    }\n}\n```\n\n## Benefits\n\n- Transparency and traceability\n- Enhanced security through cryptography\n- Elimination of intermediaries\n- Immutable record-keeping\n\n## Challenges\n\n- Scalability limitations\n- High energy consumption (in some blockchains)\n- Regulatory uncertainty\n- Integration with legacy systems\n\n## Popular Platforms\n\n- Ethereum\n- Hyperledger Fabric\n- Corda\n- Solana\n\n## Conclusion\n\nBlockchain’s potential extends far beyond finance. By leveraging its decentralized and secure architecture, industries can solve complex problems related to trust, transparency, and efficiency.",
            "tags": ["Blockchain", "Distributed Ledger", "Smart Contracts", "Technology"],
            "createdAt": "2025-03-25T10:15:00Z",
            "updatedAt": None,
            "meta": {
                "readTime": 8,
                "views": 135,
                "likes": 28,
                "bookmarks": 18
            }
        }
    ]

    # Process article authors (deduplicate)
    article_author_dict = {}
    for article_data in dummy_articles:
        author_name = article_data.get("author", {}).get("name", "Unknown Author")
        if author_name not in article_author_dict:
            article_author_dict[author_name] = ArticleAuthor(
                name=author_name,
                avatar_url=article_data.get("author", {}).get("avatarUrl")
            )

    # Create articles and link authors/meta
    articles = []
    for article_data in dummy_articles:
        article = Article(
            title=article_data.get("title", "Untitled"),
            slug=article_data.get("slug", article_data.get("title", "untitled").lower().replace(" ", "-").replace("'", "").replace(",", "")),
            cover_image_url=article_data.get("coverImageUrl", "https://placehold.co/600x300"),
            category=article_data.get("category", "Uncategorized"),
            summary=article_data.get("summary", "No summary available."),
            content=article_data.get("content", "No content available."),
            tags=article_data.get("tags", []),
            created_at=datetime.fromisoformat(article_data.get("createdAt", datetime.utcnow().isoformat()).replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(article_data["updatedAt"].replace('Z', '+00:00')) if article_data.get("updatedAt") else None
        )

        # Link author
        author_name = article_data.get("author", {}).get("name", "Unknown Author")
        article.author = article_author_dict[author_name]

        # Create meta
        meta = ArticleMeta(
            read_time=article_data.get("meta", {}).get("readTime", 5),
            views=article_data.get("meta", {}).get("views", 0),
            likes_count=article_data.get("meta", {}).get("likes", 0),
            bookmarks_count=article_data.get("meta", {}).get("bookmarks", 0)
        )
        article.meta = meta

        articles.append(article)

    # Add sample likes and bookmarks (e.g., user1 likes/bookmarks first two articles, user2 likes third)
    likes = []
    bookmarks = []
    if articles:
        # User1 likes and bookmarks first article
        likes.append(ArticleLike(user=user1, article=articles[0]))
        bookmarks.append(ArticleBookmark(user=user1, article=articles[0]))
        articles[0].meta.likes_count += 1
        articles[0].meta.bookmarks_count += 1

    if len(articles) > 1:
        # User1 likes second article
        likes.append(ArticleLike(user=user1, article=articles[1]))
        articles[1].meta.likes_count += 1

    if len(articles) > 2:
        # User2 likes third article
        likes.append(ArticleLike(user=user2, article=articles[2]))
        articles[2].meta.likes_count += 1

    # Add all article authors, articles, likes, and bookmarks to the session
    db.session.add_all(list(article_author_dict.values()) + articles + likes + bookmarks)

    # Commit all changes
    try:
        db.session.commit()
        print(f"🌱 Database seeded successfully with {len(books)} books and {len(articles)} articles")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Seeding failed: {str(e)}")