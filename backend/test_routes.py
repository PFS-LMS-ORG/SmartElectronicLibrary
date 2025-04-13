from app import create_app  # Assuming your Flask app factory is named `create_app`

def test_routes():
    app = create_app()
    client = app.test_client()

    # Test the '/books' route
    print("Testing /books route")
    response = client.get('/books?search=python')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

    # Test the '/books/category' route
    print("Testing /books/category route")
    response = client.get('/books/category?search=fiction')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

    # Test the '/books/categories' route
    print("Testing /books/categories route")
    response = client.get('/books/categories')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

    # Test the '/books/popular' route
    print("Testing /books/popular route")
    response = client.get('/books/popular')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

    # Test the '/books/featured' route
    print("Testing /books/featured route")
    response = client.get('/books/featured')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

    # Test the '/books/<int:book_id>' route
    print("Testing /books/1 route")
    response = client.get('/books/1')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

    # Test the '/books/rentals/requested' route
    print("Testing /books/rentals/requested route")
    response = client.get('/books/rentals/requested')
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data.decode('utf-8')}\n")

if __name__ == '__main__':
    test_routes()
