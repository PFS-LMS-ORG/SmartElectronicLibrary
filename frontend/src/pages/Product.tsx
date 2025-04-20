import { useState, useEffect } from 'react';

type ProductType = {
  id: number;
  name: string;
  price: number;
};

const Product = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');

  // Fetch products from the server
  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then((data: ProductType[]) => setProducts(data))
      .catch((error) => console.error('Error fetching products:', error));
  }, []);

  // Handle product submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return alert('Please enter product name and price');

    const newProduct = { name, price: parseFloat(price) };

    fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newProduct),
    })
      .then((response) => response.json())
      .then((product: ProductType) => {
        setProducts([...products, product]);
        setName('');
        setPrice('');
      })
      .catch((error) => console.error('Error uploading product:', error));
  };

  return (
    <div className="App">
      <h1>Product Upload</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Name:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Price:
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Add Product</button>
      </form>

      <h2>Product List</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.name}</td>
              <td>{product.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Product;