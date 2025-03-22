from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory product store
products = [
    {'id': 1, 'name': 'Laptop', 'price': 800},
    {'id': 2, 'name': 'Mouse', 'price': 20},
    {'id': 3, 'name': 'Keyboard', 'price': 40},
    {'id': 4, 'name': 'Monitor', 'price': 200},
    {'id': 5, 'name': 'Headphones', 'price': 50},
    {'id': 6, 'name': 'Camera', 'price': 150},
    {'id': 7, 'name': 'Smartphone', 'price': 500},
    {'id': 8, 'name': 'Tablet', 'price': 300},
    {'id': 9, 'name': 'Smartwatch', 'price': 150},
    {'id': 10, 'name': 'Printer', 'price': 100}
]

@app.route('/products', methods=['GET'])
def get_products():
    """Return the list of products."""
    return jsonify(products), 200

@app.route('/products', methods=['POST'])
def add_product():
    """Add a new product."""
    data = request.json
    if not data.get('name') or not data.get('price'):
        return jsonify({'error': 'Name and Price are required'}), 400
    
    product = {
        'id': len(products) + 1,
        'name': data['name'],
        'price': data['price']
    }
    products.append(product)
    return jsonify(product), 201

if __name__ == '__main__':
    app.run(debug=True)